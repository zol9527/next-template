/**
 * File: test/api/admin/users/mfa-reset.test.ts
 * Description: 管理员 MFA 重置 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/admin/users/[id]/mfa/reset/route'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/_shared/use-api-auth'
import type { MfaRepository } from '@/repositories/interfaces/mfa.interface'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors/app-error'

// Mock dependencies
vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

describe('API: POST /api/v1/admin/users/{userId}/mfa/reset', () => {
  const mockAuthContext: ApiAuthContext = {
    userId: 'admin-user-id',
    sessionId: 'admin-session-id',
    roles: ['admin'],
    hasRole: vi.fn().mockReturnValue(true),
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
    disableUserMfa: vi.fn(),
    createAuditLog: vi.fn(),
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    ;(MfaFactory.createMfaRepository as any).mockResolvedValue(mockMfaRepository)
// TODO: 适配 grant-based 权限系统     ;(AuthDeps.useApiAdminAuth as any).mockResolvedValue(mockAuthContext)
  })

  it('should return 401 for unauthenticated user', async () => {
    // Mock auth to fail
// TODO: 适配 grant-based 权限系统     ;(AuthDeps.useApiAdminAuth as any).mockRejectedValue(new UnauthorizedError())

    const body = { reason: 'User request' }
    const req = new NextRequest('http://localhost/api/v1/admin/users/user-123/mfa/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin user', async () => {
// TODO: 适配 grant-based 权限系统     // requirePermission 路由会走 useApiAdminAuth，直接模拟权限失败
// TODO: 适配 grant-based 权限系统     ;(AuthDeps.useApiAdminAuth as any).mockRejectedValue(new ForbiddenError())

    const body = { reason: 'User request' }
    const req = new NextRequest('http://localhost/api/v1/admin/users/user-123/mfa/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(response.status).toBe(403)
  })
})
