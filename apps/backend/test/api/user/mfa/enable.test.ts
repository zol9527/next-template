/**
 * File: test/api/user/mfa/enable.test.ts
 * Description: MFA 启用 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
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
const { POST } = await import('@/app/api/v1/user/mfa/enable/route')

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

function createValidBackupCodes(): string[] {
  return Array.from({ length: 10 }, (_, i) => `ABCD-EFGH-${String(i).padStart(2, '0')}`)
}

// ==================== 测试套件 ====================

describe('API: POST /api/v1/user/mfa/enable', () => {
  let mockUpdateUserMfa: ReturnType<typeof vi.fn>
  let mockCreateAuditLog: ReturnType<typeof vi.fn>

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

    mockUpdateUserMfa = vi.fn()
    mockCreateAuditLog = vi.fn()

    mockMfaRepository.updateUserMfa = mockUpdateUserMfa
    mockMfaRepository.createAuditLog = mockCreateAuditLog

    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    mockUseApiAuth.mockResolvedValue(createMockAuth())

    vi.mocked(MfaService.enableMFA).mockResolvedValue(true)
  })

  it('should enable MFA successfully with valid token', async () => {
    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456', backupCodes: createValidBackupCodes() }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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
      data: { enabled: true },
    })
  })

  it('should return 401 for unauthenticated user', async () => {
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456', backupCodes: createValidBackupCodes() }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid body (missing token)', async () => {
    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', backupCodes: ['code1', 'code2'] } // missing token
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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

  it('should return 400 for invalid body (missing backupCodes)', async () => {
    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456' } // missing backupCodes
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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

  it('should return 400 for invalid backupCodes format (not array)', async () => {
    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456', backupCodes: 'not-an-array' }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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

  it('should return 400 for empty backupCodes array', async () => {
    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456', backupCodes: [] }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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
    vi.mocked(MfaService.enableMFA).mockRejectedValue(new Error('Invalid TOTP token'))

    const body = { secret: 'test-secret-must-be-at-least-32-chars-long', token: '123456', backupCodes: createValidBackupCodes() }
    const req = new NextRequest('http://localhost/api/v1/user/mfa/enable', {
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
