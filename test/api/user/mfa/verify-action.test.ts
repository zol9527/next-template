/**
 * File: test/api/user/mfa/verify-action.test.ts
 * Description: MFA 操作验证 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/_shared/use-api-auth'
import type { MfaRepository } from '@/repositories/interfaces/mfa.interface'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { UnauthorizedError } from '@/lib/errors/app-error'

// Mock dependencies
vi.mock('@/repositories/factory', async () => {
  const actual = await vi.importActual<typeof import('@/repositories/factory')>('@/repositories/factory')
  return {
    ...actual,
    createMfaRepository: vi.fn(),
  }
})

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

const { POST } = await import('@/app/api/v1/user/mfa/verify-action/route')

describe('API: POST /api/v1/user/mfa/verify-action', () => {
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

  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
    createActionToken: vi.fn(),
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(AuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
  })

  it('should return 401 for unauthenticated user', async () => {
    // Mock auth to fail
    vi.mocked(AuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

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
