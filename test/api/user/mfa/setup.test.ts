/**
 * File: test/api/user/mfa/setup.test.ts
 * Description: MFA 设置 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/user/mfa/setup/route'
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

// Mock MfaService static methods
vi.mock('@/services/mfa.service', () => ({
  MfaService: {
    disableMFA: vi.fn(),
    enableMFA: vi.fn(),
    setupMFA: vi.fn(),
    getMFAStatus: vi.fn(),
  },
}))

describe('API: POST /api/v1/user/mfa/setup', () => {
  let mockGetUserMfaData: any
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

    // resetAllMocks 会重置 mock 的实现，需要在这里重新设置 getMe 的返回值
    mockAuthContext.getMe = vi.fn().mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        canUpload: true,
      },
      roles: [],
      permissions: [],
    })

    // Setup mock repository
    mockGetUserMfaData = vi.fn()
    mockUpdateUserMfa = vi.fn()
    mockCreateAuditLog = vi.fn()

    mockMfaRepository.getUserMfaData = mockGetUserMfaData
    mockMfaRepository.updateUserMfa = mockUpdateUserMfa
    mockMfaRepository.createAuditLog = mockCreateAuditLog

    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(AuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    // Mock MfaService.setupMFA
    vi.mocked(MfaService.setupMFA).mockResolvedValue({
      secret: 'test-secret',
      qrCode: 'data:image/png;base64,...',
      backupCodes: ['code1', 'code2', 'code3'],
    })
  })

  it('should return MFA setup data for authenticated user', async () => {
    const req = new NextRequest('http://localhost/api/v1/user/mfa/setup', {
      method: 'POST',
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('secret')
    expect(json.data).toHaveProperty('qrCode')
    expect(json.data).toHaveProperty('backupCodes')
    expect(json.data.backupCodes).toHaveLength(3)
  })

  it('should return 401 for unauthenticated user', async () => {
    // Mock auth to fail
    vi.mocked(AuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/mfa/setup', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })
})
