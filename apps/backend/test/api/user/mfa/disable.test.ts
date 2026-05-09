/**
 * File: test/api/user/mfa/disable.test.ts
 * Description: MFA 禁用 API 测试
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
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
  createUserRepository: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

vi.mock('@/services/core/mfa.service', () => ({
  MfaService: {
    disableMFA: vi.fn(),
    enableMFA: vi.fn(),
    setupMFA: vi.fn(),
    getMFAStatus: vi.fn(),
  },
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/user/mfa/disable/route')

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

describe('API: POST /api/v1/user/mfa/disable', () => {
  let mockGetUserMfaData: Mock
  let mockDisableUserMfa: Mock
  let mockCreateAuditLog: Mock
  let mockUserRepository: UserRepository

  const mockMfaRepository: MfaRepository = {
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
  }

  beforeEach(() => {
    vi.resetAllMocks()

    mockGetUserMfaData = vi.fn()
    mockDisableUserMfa = vi.fn()
    mockCreateAuditLog = vi.fn()
    mockUserRepository = {
      getUserById: vi.fn(),
      getUserByIdentifier: vi.fn(),
      getUserAdminById: vi.fn(),
      updateUserStatus: vi.fn(),
      updateUploadPermission: vi.fn(),
      listUsers: vi.fn(),
      listUsersWithCursor: vi.fn(),
      resetLoginFailures: vi.fn(),
      recordLoginFailure: vi.fn(),
      createUserForWechat: vi.fn(),
      updateWechatProfile: vi.fn(),
      getGlobalStats: vi.fn(),
      findByEmail: vi.fn(),
      updateUserProfile: vi.fn(),
      updatePassword: vi.fn(),
      updateWechatDisplayProfile: vi.fn(),
      updateUserPhone: vi.fn(),
    }

    mockMfaRepository.getUserMfaData = mockGetUserMfaData
    mockMfaRepository.disableUserMfa = mockDisableUserMfa
    mockMfaRepository.createAuditLog = mockCreateAuditLog

    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(MfaFactory.createUserRepository).mockResolvedValue(mockUserRepository)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    mockUseApiAuth.mockResolvedValue(createMockAuth())

    vi.mocked(MfaService.disableMFA).mockResolvedValue(true)
  })

  it('should disable MFA successfully with valid token and password', async () => {
    const body = { token: '123456', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: { disabled: true },
    })
    expect(MfaService.disableMFA).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ token: '123456', password: 'password123' }),
        expect.objectContaining({ mfa: mockMfaRepository, user: mockUserRepository }),
        expect.anything(),
        expect.any(String),
        undefined
    )
  })

  it('should return 401 for unauthenticated user', async () => {
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const body = { token: '123456', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid body (missing token)', async () => {
    const body = { password: 'password123' } // missing token
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid body (missing password)', async () => {
    const body = { token: '123456' } // missing password
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid token format (not 6 digits)', async () => {
    const body = { token: '12345', password: 'password123' } // 5 digits
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid token format (contains letters)', async () => {
    const body = { token: 'abcdef', password: 'password123' } // letters
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 500 when MfaService throws error', async () => {
    vi.mocked(MfaService.disableMFA).mockRejectedValue(new Error('Invalid TOTP token'))

    const body = { token: '123456', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/disable', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.success).toBe(false)
  })
})
