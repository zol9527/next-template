/**
 * File: test/api/user/mfa/disable.test.ts
 * Description: MFA 禁用 API 测试
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/user/mfa/disable/route'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/_shared/use-api-auth'
import { MfaService } from '@/services/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { MfaRepository } from '@/repositories/interfaces/mfa.interface'
import type { UserRepository } from '@/repositories/interfaces/user.interface'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { UnauthorizedError } from '@/lib/errors/app-error'

// Mock dependencies
vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
  createUserRepository: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

vi.mock('@/services/mfa.service', () => ({
  MfaService: {
    disableMFA: vi.fn(),
    enableMFA: vi.fn(),
    setupMFA: vi.fn(),
    getMFAStatus: vi.fn(),
  },
}))

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

  const mockAuthContext: ApiAuthContext = {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    roles: ['user'],
    hasRole: vi.fn(),
    assertPermission: vi.fn(),
    assertRole: vi.fn(),
    access: {
      has: vi.fn().mockReturnValue(true),
      assert: vi.fn(),
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canExecute: vi.fn().mockReturnValue(true),
      grants: [],
      scopesFor: vi.fn().mockReturnValue([]),
      hasAny: vi.fn().mockReturnValue(true),
      hasAll: vi.fn().mockReturnValue(true),
    },
    getMe: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()

    // Setup mock repository
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
    vi.mocked(AuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    // Mock MfaService.disableMFA to return success
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
    // Verify MfaService was called with correct arguments
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
    // Mock auth to fail
    vi.mocked(AuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

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
    // Mock MfaService.disableMFA to throw error
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
