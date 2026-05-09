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

vi.mock('@/types/service/service-context', () => {
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

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

// Mock 仓储工厂
vi.mock('@/repositories/factory', () => ({
  createUserRepository: vi.fn(),
}))

// Mock 认证模块 - 使用 hoisted 确保在 vi.mock 中可用
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

const { createUserRepository } = await import('@/repositories/factory')

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
    userId: 'admin-123',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: 'admin-123',
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

/**
 * Function: createUserAuth
 *
 * Description: 创建普通用户认证上下文
 *
 * Returns:
 *     auth(object): 普通用户认证上下文
 */
function createUserAuth() {
  return {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'user-session-id',
    roles: ['user'],
    hasRole: vi.fn(() => false),
    assertRole: vi.fn(),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
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

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(createUserRepository).mockResolvedValue(usersRepo as any)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  describe('POST /api/v1/admin/users/:id/upload-permission', () => {
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
      expect(usersRepo.updateUploadPermission).toHaveBeenCalledWith(
        { traceId: expect.any(String), logger: expect.anything() },
        { userId: MOCK_USER_ID, canUpload: true }
      )
    })

    it('应该在权限链路拒绝时返回 403，锁定 requirePermission 走 withV1Route 保护链路', async () => {
      mockUseApiAuth.mockRejectedValueOnce(new ForbiddenError())

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
    it('应该成功返回用户的上传权限状态（有权限）', async () => {
      const userAuth = createUserAuth()
      userAuth.getMe.mockResolvedValue({
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
      mockUseApiAuth.mockResolvedValue(userAuth)

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: true })
      expect(userAuth.getMe).toHaveBeenCalled()
    })

    it('应该成功返回用户的上传权限状态（无权限）', async () => {
      const userAuth = createUserAuth()
      userAuth.getMe.mockResolvedValue({
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
      mockUseApiAuth.mockResolvedValue(userAuth)

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: false })
    })

    it('应该在 canUpload 为 null 时返回 false', async () => {
      const userAuth = createUserAuth()
      userAuth.getMe.mockResolvedValue({
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
      mockUseApiAuth.mockResolvedValue(userAuth)

      const req = new NextRequest('http://localhost/api/v1/user/upload-permission', {
        method: 'GET',
      })

      const response = await GET(req, {} as any)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual({ canUpload: false })
    })

    it('应该在缺少 canUpload 字段时返回 false', async () => {
      const userAuth = createUserAuth()
      userAuth.getMe.mockResolvedValue({
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
      mockUseApiAuth.mockResolvedValue(userAuth)

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
