/**
 * File: test/api/user/mfa/enable.test.ts
 * Description: MFA 启用 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/user/mfa/enable/route'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/_shared/use-api-auth'
import { MfaService } from '@/services/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
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

describe('API: POST /api/v1/user/mfa/enable', () => {
  function createValidBackupCodes(): string[] {
    return Array.from({ length: 10 }, (_, i) => `ABCD-EFGH-${String(i).padStart(2, '0')}`)
  }
  let mockUpdateUserMfa: any
  let mockCreateAuditLog: any

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
    mockUpdateUserMfa = vi.fn()
    mockCreateAuditLog = vi.fn()

    mockMfaRepository.updateUserMfa = mockUpdateUserMfa
    mockMfaRepository.createAuditLog = mockCreateAuditLog

    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(AuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    // Mock MfaService.enableMFA to return success
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
    // Mock auth to fail
    vi.mocked(AuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

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
    // Mock MfaService.enableMFA to throw error
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
