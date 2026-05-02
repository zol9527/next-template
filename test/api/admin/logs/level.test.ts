/**
 * File: test/api/admin/logs/level.test.ts
 * Description: 日志级别设置 API 路由测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/app-error'

const createLogViewerServiceMock = vi.hoisted(() => vi.fn())
const mockSetLogLevel = vi.hoisted(() => vi.fn())
const mockUseApiAuth = vi.hoisted(() => vi.fn())

// ==================== Mocks ====================

// Mock logger to avoid file system issues
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext to provide a valid context
vi.mock('@/types/service/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createServiceContext: vi.fn(() => ({
      traceId: 'test-trace-id',
      logger: mockLogger,
      userAgent: null,
      clientIp: null,
    })),
  }
})

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

// Mock 环境变量 - 启用 trustProxy 以支持 x-forwarded-for 头
vi.mock('@/config', () => ({
  env: {
    RATE_LIMIT_TRUST_PROXY: true,
    RATE_LIMIT_ALLOW_PRIVATE_IP: true,
    RATE_LIMIT_REQUIRE_IP: true,
  },
}))

// Mock 限流器 - 避免测试中触发速率限制
vi.mock('@/lib/utils/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
  resolveRouteRateLimitWhitelist: vi.fn(() => false),
  resolveRouteRateLimitRule: vi.fn(() => 'test-rule'),
  normalizeRateLimitPolicy: vi.fn(),
}))

// Mock 服务
vi.mock('@/services/core/log-viewer.service', () => ({
  createLogViewerService: createLogViewerServiceMock,
}))

// Mock 认证
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// 动态导入路由
const { PATCH } = await import('@/app/api/v1/admin/logs/level/route')

// ==================== Test Data ====================

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth() {
  return {
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      check: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
  }
}

const mockService = {
  getRecentLogs: vi.fn(),
  getConfig: vi.fn(),
  setLogLevel: mockSetLogLevel,
  getCurrentLogFile: vi.fn(),
  readLastNLogs: vi.fn(),
  parseLogLine: vi.fn(),
  levelNumToString: vi.fn(),
}

// ==================== Test Suite ====================

describe('API: /api/v1/admin/logs/level', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createLogViewerServiceMock.mockReturnValue(mockService as unknown)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  describe('PATCH', () => {
    it('LVL-001: 未认证用户应该返回 401', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = { level: 'debug' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'content-length': JSON.stringify(body).length.toString() },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(401)
    })

    it('LVL-002: 非 admin 角色应该返回 403', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

      const body = { level: 'debug' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'content-length': JSON.stringify(body).length.toString() },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(403)
    })

    it('LVL-003: 应该成功设置日志级别为 debug', async () => {
      mockSetLogLevel.mockReturnValue({
        previousLevel: 'info',
        currentLevel: 'debug',
        effectiveAt: '2026-03-01T10:00:00.000Z',
      })

      const body = { level: 'debug' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'content-length': JSON.stringify(body).length.toString(),
          'x-forwarded-for': '127.0.0.1',
        },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.previousLevel).toBe('info')
      expect(json.data.currentLevel).toBe('debug')
      expect(json.data.effectiveAt).toBeDefined()
    })

    it('LVL-004: 应该成功设置日志级别为 error', async () => {
      mockSetLogLevel.mockReturnValue({
        previousLevel: 'info',
        currentLevel: 'error',
        effectiveAt: '2026-03-01T10:00:00.000Z',
      })

      const body = { level: 'error' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'content-length': JSON.stringify(body).length.toString(),
          'x-forwarded-for': '127.0.0.1',
        },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.currentLevel).toBe('error')
    })

    it('LVL-005: 空请求体应该返回 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: '',
        headers: { 'content-length': '0' },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })

    it('LVL-006: 无效级别值应该返回 400', async () => {
      const body = { level: 'invalid' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'content-length': JSON.stringify(body).length.toString() },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })

    it('LVL-007: 缺少 level 字段应该返回 400', async () => {
      const body = { other: 'value' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'content-length': JSON.stringify(body).length.toString() },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })

    it('LVL-008: 验证级别应该立即生效', async () => {
      mockSetLogLevel.mockReturnValue({
        previousLevel: 'error',
        currentLevel: 'debug',
        effectiveAt: new Date().toISOString(),
      })

      const body = { level: 'debug' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'content-length': JSON.stringify(body).length.toString(),
          'x-forwarded-for': '127.0.0.1',
        },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(mockSetLogLevel).toHaveBeenCalledWith('debug', expect.objectContaining({ actorId: 'admin-id' }))
    })

    it('应该支持设置所有有效级别', async () => {
      const levels = ['debug', 'info', 'warn', 'error']

      for (const level of levels) {
        vi.clearAllMocks()
        createLogViewerServiceMock.mockReturnValue(mockService as unknown)
        mockUseApiAuth.mockResolvedValue(createAdminAuth())
        // 重新设置限流器 mock（clearAllMocks 会清除 mockResolvedValue）
        const { enforceRateLimit } = await import('@/lib/utils/rate-limit')
        vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
        mockSetLogLevel.mockReturnValue({
          previousLevel: 'info',
          currentLevel: level,
          effectiveAt: new Date().toISOString(),
        })

        const body = { level }
        const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
          method: 'PATCH',
          body: JSON.stringify(body),
          headers: {
            'content-length': JSON.stringify(body).length.toString(),
            'x-forwarded-for': '127.0.0.1',
          },
        })
        const res = await PATCH(req, { params: Promise.resolve({}) })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.data.currentLevel).toBe(level)
      }
    })

    it('响应应该包含 X-Trace-Id 头', async () => {
      mockSetLogLevel.mockReturnValue({
        previousLevel: 'info',
        currentLevel: 'debug',
        effectiveAt: new Date().toISOString(),
      })

      const body = { level: 'debug' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'content-length': JSON.stringify(body).length.toString(),
          'x-forwarded-for': '127.0.0.1',
        },
      })
      const res = await PATCH(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(res.headers.has('x-trace-id') || res.headers.has('X-Trace-Id')).toBe(true)
    })

    it('应该正确创建服务实例并调用 setLogLevel', async () => {
      mockSetLogLevel.mockReturnValue({
        previousLevel: 'info',
        currentLevel: 'warn',
        effectiveAt: new Date().toISOString(),
      })

      const body = { level: 'warn' }
      const req = new NextRequest('http://localhost/api/v1/admin/logs/level', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'content-length': JSON.stringify(body).length.toString(),
          'x-forwarded-for': '127.0.0.1',
        },
      })
      await PATCH(req, { params: Promise.resolve({}) })

      expect(createLogViewerServiceMock).toHaveBeenCalled()
      expect(mockSetLogLevel).toHaveBeenCalledWith('warn', expect.objectContaining({ actorId: 'admin-id' }))
    })
  })
})
