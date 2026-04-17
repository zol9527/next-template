/**
 * File: test/api/user/mfa/status.test.ts
 * Description: MFA 状态 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/user/mfa/status/route'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/_shared/use-api-auth'
import type { MfaRepository } from '@/repositories/interfaces/mfa.interface'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { UnauthorizedError } from '@/lib/errors/app-error'

// Mock dependencies
vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

describe('API: GET /api/v1/user/mfa/status', () => {
  const mockGetUserMfaData = vi.fn()

  const mockMfaRepository: MfaRepository = {
    getUserMfaData: mockGetUserMfaData,
    updateUserMfa: vi.fn(),
    disableUserMfa: vi.fn(),
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
    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(AuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
  })

  it('should return MFA status for authenticated user with MFA disabled', async () => {
    // Mock MFA data showing MFA is disabled
    mockGetUserMfaData.mockResolvedValue({
      userId: 'test-user-id',
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaSetupAt: null,
      mfaLastVerifiedAt: null,
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
    // Mock MFA data showing MFA is enabled
    mockGetUserMfaData.mockResolvedValue({
      userId: 'test-user-id',
      mfaEnabled: true,
      mfaSecret: 'encrypted-secret',
      mfaBackupCodes: 'hashed-backup-codes',
      mfaSetupAt: new Date('2026-02-01T00:00:00Z'),
      mfaLastVerifiedAt: new Date('2026-02-02T00:00:00Z'),
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
    // Mock auth to fail
    vi.mocked(AuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/mfa/status', {
      method: 'GET',
    })

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    mockGetUserMfaData.mockRejectedValue(new Error('Database error'))

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
