/**
 * File: test/api/user/mfa/verify-action.test.ts
 * Description: MFA 操作验证 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
import { UnauthorizedError } from '@/lib/errors/app-error'

// ==================== Mocks ====================

// Mock logger 避免文件系统写入
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

// Mock createServiceContext 提供有效的上下文
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

// Mock 认证模块（使用 vi.hoisted 配合 withV1Route 的动态 import）
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// Mock 插件注册表
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

vi.mock('@/repositories/factory', async () => {
  const actual = await vi.importActual<typeof import('@/repositories/factory')>('@/repositories/factory')
  return {
    ...actual,
    createMfaRepository: vi.fn(),
  }
})

vi.mock('@/services/core/mfa.service', () => ({
  MfaService: {
    verifyMFA: vi.fn(),
  },
}))

vi.mock('@/services/core/mfa-action-token.service', () => ({
  MfaActionTokenService: {
    generateToken: vi.fn(),
  },
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(() => ({ ip: '127.0.0.1' })),
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/user/mfa/verify-action/route')

// ==================== 测试辅助 ====================

function createMockAuth(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    roles: ['user'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
    ...overrides,
  }
}

// ==================== 测试套件 ====================

describe('API: POST /api/v1/user/mfa/verify-action', () => {
  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
    createActionToken: vi.fn(),
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    mockUseApiAuth.mockResolvedValue(createMockAuth())
  })

  it('should return 401 for unauthenticated user', async () => {
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const body = { token: '123456', action: 'refund' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/verify-action', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid body', async () => {
    const body = { action: 'refund' } // missing token
    const req = new NextRequest('http://localhost/api/v1/user/mfa/verify-action', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid action type', async () => {
    const body = { token: '123456', action: 'invalid-action' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/verify-action', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })
})
