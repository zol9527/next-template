import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logger } from 'pino'

const { mockRepo, mockLogger } = vi.hoisted(() => {
  const mockRepo = {
    incrementCounter: vi.fn(),
    getCounter: vi.fn(),
    resetCounter: vi.fn(),
    cleanupExpiredCounters: vi.fn(),
  }

  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  }

  return { mockRepo, mockLogger }
})

vi.mock('@/repositories/factory', () => ({
  createRateLimitRepository: () => mockRepo,
}))

import { enforceRateLimit } from '@/lib/utils/rate-limit'

describe('enforceRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该优先命中 IP+identity 主桶', async () => {
    const nowMs = Date.now()
    mockRepo.incrementCounter.mockResolvedValue({
      count: 2,
      resetAt: new Date(nowMs + 60_000),
      allowed: false,
    })

    const result = await enforceRateLimit(
      {
        rule: 'auth:login',
        ip: '1.2.3.4',
        now: nowMs,
        max: 1,
        windowMs: 60_000,
        identity: 'admin@example.com',
      },
      mockLogger as unknown as Logger
    )

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 })
    expect(mockRepo.incrementCounter).toHaveBeenCalledWith(
      'rate_limit:auth:login:identity:1.2.3.4:admin@example.com',
      60_000,
      1
    )
  })

  it('应该在没有 identity 时按 IP 主桶限流', async () => {
    const nowMs = Date.now()
    mockRepo.incrementCounter.mockResolvedValue({
      count: 1,
      resetAt: new Date(nowMs + 30_000),
      allowed: true,
    })

    await enforceRateLimit(
      {
        rule: 'auth:inline-ip-default',
        ip: '9.9.9.9',
        now: nowMs,
        max: 2,
        windowMs: 30_000,
      },
      mockLogger as unknown as Logger
    )

    expect(mockRepo.incrementCounter).toHaveBeenCalledWith(
      'rate_limit:auth:inline-ip-default:ip:9.9.9.9',
      30_000,
      2
    )
  })

  it('应该在命中白名单时直接放行', async () => {
    const nowMs = Date.now()

    const result = await enforceRateLimit(
      {
        rule: 'auth:login',
        ip: '1.2.3.4',
        now: nowMs,
        max: 5,
        windowMs: 60_000,
        whitelist: {
          users: ['user-123'],
          roles: ['admin'],
        },
        userId: 'user-123',
        userRoles: ['member', 'admin'],
      },
      mockLogger as unknown as Logger
    )

    expect(result).toEqual({ allowed: true })
    expect(mockRepo.incrementCounter).not.toHaveBeenCalled()
  })

  it('应该同时执行主桶和 IP 桶检查', async () => {
    const nowMs = Date.now()
    mockRepo.incrementCounter
      .mockResolvedValueOnce({
        count: 1,
        resetAt: new Date(nowMs + 60_000),
        allowed: true,
      })
      .mockResolvedValueOnce({
        count: 21,
        resetAt: new Date(nowMs + 60_000),
        allowed: false,
      })

    const result = await enforceRateLimit(
      {
        rule: 'auth:login',
        ip: '5.6.7.8',
        now: nowMs,
        max: 5,
        windowMs: 60_000,
        identity: 'user@example.com',
        network: {
          max: 20,
          windowMs: 60_000,
        },
      },
      mockLogger as unknown as Logger
    )

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 })
    expect(mockRepo.incrementCounter).toHaveBeenNthCalledWith(
      1,
      'rate_limit:auth:login:identity:5.6.7.8:user@example.com',
      60_000,
      5
    )
    expect(mockRepo.incrementCounter).toHaveBeenNthCalledWith(
      2,
      'rate_limit:auth:login:network:5.6.7.8',
      60_000,
      20
    )
  })

  it('应该在数据库异常时使用内存降级并继续执行双桶判断', async () => {
    const baseParams = {
      rule: 'auth:inline-memory-fallback',
      ip: '5.6.7.8',
      max: 1,
      windowMs: 60_000,
      identity: 'fallback-user',
      network: {
        max: 3,
        windowMs: 60_000,
      },
    }

    mockRepo.incrementCounter.mockRejectedValue(new Error('db unavailable'))

    const first = await enforceRateLimit(
      { ...baseParams, now: 1_000 },
      mockLogger as unknown as Logger
    )
    const second = await enforceRateLimit(
      { ...baseParams, now: 1_001 },
      mockLogger as unknown as Logger
    )

    expect(first).toEqual({ allowed: true })
    expect(second.allowed).toBe(false)
    if (!second.allowed) {
      expect(second.retryAfterSeconds).toBeGreaterThan(0)
    }
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
