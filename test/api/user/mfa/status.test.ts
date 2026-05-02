/**
 * File: test/api/user/mfa/status.test.ts
 * Description: MFA 状态 API 测试
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

vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

// Mock MfaService 静态方法
vi.mock('@/services/core/mfa.service', () => ({
  MfaService: {
    getMFAStatus: vi.fn(),
  },
}))

// 动态导入路由
const { GET } = await import('@/app/api/v1/user/mfa/status/route')

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

describe('API: GET /api/v1/user/mfa/status', () => {
  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
    updateUserMfa: vi.fn(),
    disableUserMfa: vi.fn(),
    setPendingMfaSecret: vi.fn(),
    getPendingMfaSecret: vi.fn(),
    clearPendingMfaSecret: vi.fn(),
    createActionToken: vi.fn(),
    getActionToken: vi.fn(),
    consumeActionToken: vi.fn(),
    cleanupExpiredActionTokens: vi.fn(),
    createAuditLog: vi.fn(),
    getUserAuditLogs: vi.fn(),
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    mockUseApiAuth.mockResolvedValue(createMockAuth())
  })

  it('should return MFA status for authenticated user with MFA disabled', async () => {
    // 直接 mock MfaService.getMFAStatus
    const { MfaService } = await import('@/services/core/mfa.service')
    vi.mocked(MfaService.getMFAStatus).mockResolvedValue({
      enabled: false,
      setupAt: null,
    })

    const req = new NextRequest('http://localhost/api/v1/user/mfa/status', {
      method: 'GET',
      headers: {
        'Cookie': 'access_token=valid_token',
      },
    })

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        enabled: false,
        setupAt: null,
      },
    })
  })

  it('should return MFA status for authenticated user with MFA enabled', async () => {
    const { MfaService } = await import('@/services/core/mfa.service')
    vi.mocked(MfaService.getMFAStatus).mockResolvedValue({
      enabled: true,
      setupAt: new Date('2026-02-01T00:00:00Z'),
    })

    const req = new NextRequest('http://localhost/api/v1/user/mfa/status', {
      method: 'GET',
      headers: {
        'Cookie': 'access_token=valid_token',
      },
    })

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        enabled: true,
        setupAt: '2026-02-01T00:00:00.000Z',
      },
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/mfa/status', {
      method: 'GET',
    })

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should handle database errors gracefully', async () => {
    const { MfaService } = await import('@/services/core/mfa.service')
    vi.mocked(MfaService.getMFAStatus).mockRejectedValue(new Error('Database error'))

    const req = new NextRequest('http://localhost/api/v1/user/mfa/status', {
      method: 'GET',
      headers: {
        'Cookie': 'access_token=valid_token',
      },
    })

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('INTERNAL_ERROR')
  })
})
