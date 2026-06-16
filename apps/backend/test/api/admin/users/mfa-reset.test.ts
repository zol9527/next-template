/**
 * File: test/api/admin/users/mfa-reset.test.ts
 * Description: 管理员 MFA 重置 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/admin/users/[id]/mfa/reset/route'
import * as MfaFactory from '@/repositories/factory'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors/app-error'

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

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

// Mock dependencies
vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

// Mock 认证模块 - 使用 hoisted 确保在 vi.mock 中可用
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth() {
  return {
    userId: 'admin-user-id',
    sessionId: 'admin-session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      check: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
  }
}

describe('API: POST /api/v1/admin/users/{userId}/mfa/reset', () => {
  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
    disableUserMfa: vi.fn(),
    createAuditLog: vi.fn(),
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    ;(MfaFactory.createMfaRepository as any).mockResolvedValue(mockMfaRepository)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  it('should return 401 for unauthenticated user', async () => {
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const body = { reason: 'User request' }
    const req = new NextRequest('http://localhost/api/v1/admin/users/user-123/mfa/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(response.status).toBe(401)
  })

  it('should return 403 for non-admin user', async () => {
    mockUseApiAuth.mockRejectedValue(new ForbiddenError())

    const body = { reason: 'User request' }
    const req = new NextRequest('http://localhost/api/v1/admin/users/user-123/mfa/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(response.status).toBe(403)
  })
})
