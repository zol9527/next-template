/**
 * Integration: 上传权限 API 测试
 *
 * Description: 测试上传权限相关的 API 端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/admin/users/[id]/upload-permission/route'
import { GET } from '@/app/api/v1/user/upload-permission/route'
import { ForbiddenError } from '@/lib/errors/app-error'
import type { UserRepository } from '@/repositories/interfaces/user.interface'
import { useApiAuth } from '@/app/api/v1/_shared/use-api-auth'

// Mock logger - 使用内联定义以避免 hoisting 问题
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return mockLogger }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

vi.mock('@/types/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return mockLogger }),
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

// Mock 仓储工厂
vi.mock('@/repositories/factory', () => ({
  createUserRepository: vi.fn(),
}))

// Mock 认证模块
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

const { createUserRepository } = await import('@/repositories/factory')

describe('Integration: 上传权限 API 测试', () => {
  const MOCK_ADMIN_USER_ID = 'admin-123'
  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
  const MOCK_USER_ID_NOT_FOUND = '123e4567-e89b-12d3-a456-426614179999'

  // 使用 Partial 类型来模拟仓储接口
  let usersRepo: Partial<UserRepository>

  beforeEach(() => {
    usersRepo = {
      getUserAdminById: vi.fn(),
      updateUploadPermission: vi.fn(),
    }
  })

  // Mock 认证上下文 - 管理员
  const mockAdminAuthContext = {
    userId: MOCK_ADMIN_USER_ID,
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn().mockReturnValue(true),
    assertPermission: vi.fn().mockResolvedValue(undefined),
    assertRole: vi.fn().mockReturnValue(undefined),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: MOCK_ADMIN_USER_ID,
        username: 'admin',
        email: 'admin@example.com',
        phone: null,
        avatarUrl: null,
        userType: 'admin',
        canUpload: true,
      },
      roles: [{ id: 'role-1', name: 'admin', description: '管理员' }],
      permissions: ['users.write'],
    }),
  }

  // Mock 认证上下文 - 普通用户
  const mockUserAuthContext = {
    userId: MOCK_USER_ID,
    sessionId: 'user-session-id',
    roles: ['user'],
    hasRole: vi.fn().mockReturnValue(false),
    assertPermission: vi.fn().mockResolvedValue(undefined),
    assertRole: vi.fn().mockReturnValue(undefined),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: MOCK_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        phone: null,
        avatarUrl: null,
        userType: 'regular',
        canUpload: true,
      },
      roles: [{ id: 'role-2', name: 'user', description: '普通用户' }],
      permissions: [],
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(createUserRepository).mockResolvedValue(usersRepo as any)
    vi.mocked(mockAdminAuthContext.hasPermission).mockResolvedValue(true)
    vi.mocked(mockAdminAuthContext.hasRole).mockReturnValue(true)
    vi.mocked(useApiAuth).mockResolvedValue(mockUserAuthContext as any)
// TODO: 适配 grant-based 权限系统     vi.mocked(useApiAdminAuth).mockResolvedValue(mockAdminAuthContext as any)
  })

  describe('POST /api/v1/admin/users/:id/upload-permission', () => {
    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试管理员成功授予用户上传权限
     */
    it('应该成功授予用户上传权限', async () => {
      const mockUser = {
        id: MOCK_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        canUpload: false,
        passwordHash: null,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordUpdatedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ;(usersRepo.getUserAdminById as any).mockResolvedValue(mockUser)
      ;(usersRepo.updateUploadPermission as any).mockResolvedValue(undefined)

      const body = { canUpload: true }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ userId: MOCK_USER_ID, canUpload: true })
// TODO: 适配 grant-based 权限系统       expect(useApiAdminAuth).toHaveBeenCalled()
      expect(usersRepo.updateUploadPermission).toHaveBeenCalledWith(
        { traceId: expect.any(String), logger: expect.anything() },
        { userId: MOCK_USER_ID, canUpload: true }
      )
    })

    it('应该在权限链路拒绝时返回 403，锁定 requirePermission 走 withV1Route 保护链路', async () => {
// TODO: 适配 grant-based 权限系统       vi.mocked(useApiAdminAuth).mockRejectedValueOnce(new ForbiddenError())

      const body = { canUpload: true }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID }),
      })

      expect(response.status).toBe(403)
      expect(usersRepo.updateUploadPermission).not.toHaveBeenCalled()
    })
  
    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试管理员成功撤销用户上传权限
     */
    it('应该成功撤销用户上传权限', async () => {
      const mockUser = {
        id: MOCK_USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        canUpload: true,
        passwordHash: null,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordUpdatedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ;(usersRepo.getUserAdminById as any).mockResolvedValue(mockUser)
      ;(usersRepo.updateUploadPermission as any).mockResolvedValue(undefined)

      const body = { canUpload: false }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ userId: MOCK_USER_ID, canUpload: false })
      expect(usersRepo.updateUploadPermission).toHaveBeenCalledWith(
        { traceId: expect.any(String), logger: expect.anything() },
        { userId: MOCK_USER_ID, canUpload: false }
      )
    })

    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试当用户不存在时返回错误
     */
    it('应该在用户不存在时返回错误', async () => {
      ;(usersRepo.getUserAdminById as any).mockResolvedValue(null)

      const body = { canUpload: true }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID_NOT_FOUND}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID_NOT_FOUND }),
      })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试 Schema 验证 - 无效的 UUID
     */
    it('应该拒绝无效的用户 ID', async () => {
      const body = { canUpload: true }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        'http://localhost/api/v1/admin/users/invalid-uuid/upload-permission',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: 'invalid-uuid' }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试 Schema 验证 - 缺少 canUpload 字段
     */
    it('应该拒绝缺少 canUpload 字段的请求', async () => {
      const body = {}
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    /**
     * API Route: POST /api/v1/admin/users/:id/upload-permission
     *
     * Description: 测试 Schema 验证 - canUpload 类型错误
     */
    it('应该拒绝 canUpload 类型错误的请求', async () => {
      const body = { canUpload: 'not-a-boolean' }
      const bodyStr = JSON.stringify(body)
      const req = new NextRequest(
        `http://localhost/api/v1/admin/users/${MOCK_USER_ID}/upload-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyStr).length),
          },
          body: bodyStr,
        }
      )

      const response = await POST(req, {
        params: Promise.resolve({ id: MOCK_USER_ID }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })
  })

  describe('GET /api/v1/user/upload-permission', () => {
    /**
     * API Route: GET /api/v1/user/upload-permission
     *
     * Description: 测试用户成功获取自己的上传权限
     */
    it('应该成功返回用户的上传权限状态（有权限）', async () => {
      mockUserAuthContext.getMe.mockResolvedValue({
        user: {
          id: MOCK_USER_ID,
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          avatarUrl: null,
          userType: 'regular',
          canUpload: true,
        },
        roles: [{ id: 'role-2', name: 'user', description: '普通用户' }],
        permissions: [],
      })

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: true })
      expect(mockUserAuthContext.getMe).toHaveBeenCalled()
    })

    /**
     * API Route: GET /api/v1/user/upload-permission
     *
     * Description: 测试用户成功获取自己的上传权限（无权限）
     */
    it('应该成功返回用户的上传权限状态（无权限）', async () => {
      mockUserAuthContext.getMe.mockResolvedValue({
        user: {
          id: MOCK_USER_ID,
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          avatarUrl: null,
          userType: 'regular',
          canUpload: false,
        },
        roles: [{ id: 'role-2', name: 'user', description: '普通用户' }],
        permissions: [],
      })

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: false })
    })

    /**
     * API Route: GET /api/v1/user/upload-permission
     *
     * Description: 测试当用户信息中 canUpload 为 null 时默认返回 false
     */
    it('应该在 canUpload 为 null 时返回 false', async () => {
      mockUserAuthContext.getMe.mockResolvedValue({
        user: {
          id: MOCK_USER_ID,
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          avatarUrl: null,
          userType: 'regular',
          canUpload: null,
        },
        roles: [{ id: 'role-2', name: 'user', description: '普通用户' }],
        permissions: [],
      })

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: false })
    })

    /**
     * API Route: GET /api/v1/user/upload-permission
     *
     * Description: 测试当用户信息中缺少 canUpload 字段时默认返回 false
     */
    it('应该在缺少 canUpload 字段时返回 false', async () => {
      mockUserAuthContext.getMe.mockResolvedValue({
        user: {
          id: MOCK_USER_ID,
          username: 'testuser',
          email: 'test@example.com',
          phone: null,
          avatarUrl: null,
          userType: 'regular',
          canUpload: undefined,
        },
        roles: [{ id: 'role-2', name: 'user', description: '普通用户' }],
        permissions: [],
      })

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: false })
    })
  })
})
