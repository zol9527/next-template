/**
 * File: test/api/admin/mfa/settings.test.ts
 * Description: MFA 管理员 API 路由集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { MfaPolicyRepository } from '@/repositories/interfaces/mfa-policy.interface'
import type { RbacRepository } from '@/repositories/interfaces/rbac.interface'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/app-error'

// TODO: 适配 grant-based 权限系统 const useApiAdminAuthMock = vi.hoisted(() => vi.fn())
const createMfaPolicyRepositoryMock = vi.hoisted(() => vi.fn())
const createRbacRepositoryMock = vi.hoisted(() => vi.fn())

// ==================== Mocks ====================

// Mock logger to avoid file system issues
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return this }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext to provide a valid context
vi.mock('@/types/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function(this: any) { return this }),
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
vi.mock('@/repositories/factory/mfa-policy.factory', () => ({
  createMfaPolicyRepository: createMfaPolicyRepositoryMock,
}))
vi.mock('@/repositories/factory', async () => {
  const actual = await vi.importActual<typeof import('@/repositories/factory')>('@/repositories/factory')
  return {
    ...actual,
    createRbacRepository: createRbacRepositoryMock,
  }
})

// Mock 认证
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

const { GET: GET_SETTINGS } = await import('@/app/api/v1/admin/mfa/settings/route')
const { PUT: PUT_GLOBAL } = await import('@/app/api/v1/admin/mfa/global/route')
const { PUT: PUT_ROLES } = await import('@/app/api/v1/admin/mfa/roles/route')
const { POST: POST_EXEMPTIONS } = await import('@/app/api/v1/admin/mfa/exemptions/route')
const { DELETE: DELETE_EXEMPTION } = await import('@/app/api/v1/admin/mfa/exemptions/[userId]/route')

// ==================== Test Data ====================

const MOCK_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

const mockAuthContext = {
  userId: MOCK_ADMIN_ID,
  sessionId: 'test-session-id',
  roles: ['admin'],
  hasRole: vi.fn().mockReturnValue(true),
  assertPermission: vi.fn().mockResolvedValue(undefined),
  assertRole: vi.fn().mockReturnValue(undefined),
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
  getMe: vi.fn().mockResolvedValue({
    id: MOCK_ADMIN_ID,
    nickname: 'Admin',
    roles: ['admin'],
    permissions: ['mfa.read', 'mfa.write'],
  }),
}

const mockRoles: RoleDto[] = [
  { id: 'role-1', name: 'admin', description: '管理员' },
  { id: 'role-2', name: 'user', description: '普通用户' },
  { id: 'role-3', name: 'promoter', description: '推广员' },
]

// ==================== Test Suite ====================

describe('API: MFA Admin Settings', () => {
  let mfaRepo: Partial<MfaPolicyRepository>
  let rbacRepo: Partial<RbacRepository>

  beforeEach(() => {
    vi.clearAllMocks()

    // 创建 MFA Repository Mock
    mfaRepo = {
      getGlobalSettings: vi.fn(),
      upsertGlobalSettings: vi.fn(),
      getRolePolicies: vi.fn(),
      getRolePolicyByName: vi.fn(),
      upsertRolePolicy: vi.fn(),
      batchUpsertRolePolicies: vi.fn(),
      getExemptions: vi.fn(),
      getExemptionByUserId: vi.fn(),
      createExemption: vi.fn(),
      upsertExemption: vi.fn(),
      deleteExemption: vi.fn(),
    }

    // 创建 RBAC Repository Mock
    rbacRepo = {
      getRolesForUser: vi.fn(),
      getGrantsForUser: vi.fn().mockResolvedValue([]),
      getGrantsForRole: vi.fn().mockResolvedValue([]),
      setRoleGrants: vi.fn().mockResolvedValue(undefined),
      listRoles: vi.fn(),
    }

    // 设置默认返回值
    createMfaPolicyRepositoryMock.mockReturnValue(mfaRepo as MfaPolicyRepository)
    createRbacRepositoryMock.mockResolvedValue(rbacRepo as RbacRepository)
// TODO: 适配 grant-based 权限系统     useApiAdminAuthMock.mockResolvedValue(mockAuthContext as any)
    vi.mocked(mockAuthContext.hasPermission).mockResolvedValue(true)
  })

  // ==================== GET /api/v1/admin/mfa/settings ====================

  describe('GET /api/v1/admin/mfa/settings', () => {
    /**
     * API Route: GET
     *
     * Description: 测试未认证用户访问 MFA 设置
     *
     * Returns:
     *   response(object): 401 Unauthorized
     */
    it('应该返回 401 当用户未认证', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    /**
     * API Route: GET
     *
     * Description: 测试没有 mfa.read 权限的用户访问
     *
     * Returns:
     *   response(object): 403 Forbidden
     */
    it('应该返回 403 当用户没有 mfa.read 权限', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new ForbiddenError('Forbidden'))

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(403)
    })

    /**
     * API Route: GET
     *
     * Description: 测试有权限的用户获取 MFA 设置
     *
     * Returns:
     *   response(object): 200 OK 和完整的 MFA 设置
     */
    it('应该返回 MFA 设置 当用户有 mfa.read 权限', async () => {
      // Mock 数据
      mfaRepo.getGlobalSettings = vi.fn().mockResolvedValue({
        mode: 'optional',
        allowExemptions: true,
        updatedAt: '2026-02-01T00:00:00.000Z',
      })

      mfaRepo.getRolePolicies = vi.fn().mockResolvedValue([
        {
          roleName: 'admin',
          policy: 'force',
          allowExemptions: false,
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
      ])

      mfaRepo.getExemptions = vi.fn().mockResolvedValue({
        exemptions: [],
        total: 0,
        page: 1,
        limit: 10,
      })

      rbacRepo.listRoles = vi.fn().mockResolvedValue(mockRoles)

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('global')
      expect(json.data).toHaveProperty('roles')
      expect(json.data).toHaveProperty('exemptions')
      expect(json.data).toHaveProperty('availableRoles')
      expect(json.data.global.mode).toBe('optional')
      // getSettings 会把未配置的角色策略用默认值补齐
      expect(json.data.roles).toHaveLength(3)
      expect(json.data.availableRoles).toHaveLength(3)
    })

    /**
     * API Route: GET
     *
     * Description: 测试返回默认设置当数据库中没有配置
     *
     * Returns:
     *   response(object): 200 OK 和默认的 MFA 设置
     */
    it('应该返回默认设置 当数据库中没有配置', async () => {
      mfaRepo.getGlobalSettings = vi.fn().mockResolvedValue(null)
      mfaRepo.getRolePolicies = vi.fn().mockResolvedValue([])
      mfaRepo.getExemptions = vi.fn().mockResolvedValue({
        exemptions: [],
        total: 0,
        page: 1,
        limit: 10,
      })
      rbacRepo.listRoles = vi.fn().mockResolvedValue(mockRoles)

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.global.mode).toBe('optional') // 默认值
      expect(json.data.global.allowExemptions).toBe(true) // 默认值
      expect(json.data.roles).toHaveLength(3) // 应该包含所有角色的默认策略
    })
  })

  // ==================== PUT /api/v1/admin/mfa/global ====================

  describe('PUT /api/v1/admin/mfa/global', () => {
    /**
     * API Route: PUT
     *
     * Description: 测试未认证用户更新全局设置
     *
     * Returns:
     *   response(object): 401 Unauthorized
     */
    it('应该返回 401 当用户未认证', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = { mode: 'required', allowExemptions: true }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    /**
     * API Route: PUT
     *
     * Description: 测试没有 admin:mfa:manage 权限的用户更新
     *
     * Returns:
     *   response(object): 403 Forbidden
     */
    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new ForbiddenError('Forbidden'))

      const body = { mode: 'required', allowExemptions: true }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(403)
    })

    /**
     * API Route: PUT
     *
     * Description: 测试有权限的用户更新全局模式为 required
     *
     * Returns:
     *   response(object): 200 OK 和更新后的全局设置
     */
    it('应该更新全局模式为 required', async () => {
      const updatedSettings = {
        mode: 'required' as const,
        allowExemptions: true,
        updatedAt: '2026-02-03T00:00:00.000Z',
      }

      mfaRepo.upsertGlobalSettings = vi.fn().mockResolvedValue(updatedSettings)

      const body = { mode: 'required', allowExemptions: true }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.mode).toBe('required')
      expect(json.data.allowExemptions).toBe(true)
      expect(mfaRepo.upsertGlobalSettings).toHaveBeenCalled()
    })

    /**
     * API Route: PUT
     *
     * Description: 测试更新 allowExemptions 标志
     *
     * Returns:
     *   response(object): 200 OK 和更新后的设置
     */
    it('应该更新 allowExemptions 标志', async () => {
      const updatedSettings = {
        mode: 'optional' as const,
        allowExemptions: false,
        updatedAt: '2026-02-03T00:00:00.000Z',
      }

      mfaRepo.upsertGlobalSettings = vi.fn().mockResolvedValue(updatedSettings)

      const body = { mode: 'optional', allowExemptions: false }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.allowExemptions).toBe(false)
    })

    /**
     * API Route: PUT
     *
     * Description: 测试无效的 mode 值
     *
     * Returns:
     *   response(object): 400 Bad Request
     */
    it('应该返回 400 对于无效的 mode 值', async () => {
      const body = { mode: 'invalid_mode', allowExemptions: true }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })
  })

  // ==================== PUT /api/v1/admin/mfa/roles ====================

  describe('PUT /api/v1/admin/mfa/roles', () => {
    /**
     * API Route: PUT
     *
     * Description: 测试未认证用户更新角色策略
     *
     * Returns:
     *   response(object): 401 Unauthorized
     */
    it('应该返回 401 当用户未认证', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = { policies: [] }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    /**
     * API Route: PUT
     *
     * Description: 测试没有 admin:mfa:manage 权限的用户更新
     *
     * Returns:
     *   response(object): 403 Forbidden
     */
    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new ForbiddenError('Forbidden'))

      const body = { policies: [] }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(403)
    })

    /**
     * API Route: PUT
     *
     * Description: 测试更新多个角色策略
     *
     * Returns:
     *   response(object): 200 OK 和更新后的策略列表
     */
    it('应该更新多个角色策略', async () => {
      const updatedPolicies = [
        {
          roleName: 'admin',
          policy: 'force' as const,
          allowExemptions: false,
          updatedAt: '2026-02-03T00:00:00.000Z',
        },
        {
          roleName: 'user',
          policy: 'inherit' as const,
          allowExemptions: true,
          updatedAt: '2026-02-03T00:00:00.000Z',
        },
      ]

      mfaRepo.batchUpsertRolePolicies = vi.fn().mockResolvedValue(updatedPolicies)

      const body = {
        policies: [
          { roleName: 'admin', policy: 'force', allowExemptions: false },
          { roleName: 'user', policy: 'inherit', allowExemptions: true },
        ],
      }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
      expect(json.data[0].roleName).toBe('admin')
      expect(json.data[0].policy).toBe('force')
      expect(mfaRepo.batchUpsertRolePolicies).toHaveBeenCalled()
    })

    /**
     * API Route: PUT
     *
     * Description: 测试处理空的策略数组
     *
     * Returns:
     *   response(object): 200 OK 和空数组
     */
    it('应该处理空的策略数组', async () => {
      mfaRepo.batchUpsertRolePolicies = vi.fn().mockResolvedValue([])

      const body = { policies: [] }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    /**
     * API Route: PUT
     *
     * Description: 测试无效的策略值
     *
     * Returns:
     *   response(object): 400 Bad Request
     */
    it('应该返回 400 对于无效的策略值', async () => {
      const body = {
        policies: [
          { roleName: 'admin', policy: 'invalid_policy', allowExemptions: false },
        ],
      }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })
  })

  // ==================== POST /api/v1/admin/mfa/exemptions ====================

  describe('POST /api/v1/admin/mfa/exemptions', () => {
    /**
     * API Route: POST
     *
     * Description: 测试未认证用户添加豁免
     *
     * Returns:
     *   response(object): 401 Unauthorized
     */
    it('应该返回 401 当用户未认证', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = {
        userId: MOCK_USER_ID,
        reason: '测试豁免',
      }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    /**
     * API Route: POST
     *
     * Description: 测试没有 admin:mfa:manage 权限的用户添加
     *
     * Returns:
     *   response(object): 403 Forbidden
     */
    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new ForbiddenError('Forbidden'))

      const body = {
        userId: MOCK_USER_ID,
        reason: '测试豁免',
      }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(403)
    })

    /**
     * API Route: POST
     *
     * Description: 测试添加新的豁免
     *
     * Returns:
     *   response(object): 200 OK 和创建的豁免记录
     */
    it('应该添加新的豁免', async () => {
      const newExemption = {
        userId: MOCK_USER_ID,
        reason: '测试豁免',
        createdBy: MOCK_ADMIN_ID,
        createdAt: '2026-02-03T00:00:00.000Z',
      }

      mfaRepo.upsertExemption = vi.fn().mockResolvedValue(newExemption as any)

      const body = {
        userId: MOCK_USER_ID,
        reason: '测试豁免',
      }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.userId).toBe(MOCK_USER_ID)
      expect(json.data.reason).toBe('测试豁免')
      expect(mfaRepo.upsertExemption).toHaveBeenCalled()
    })

    /**
     * API Route: POST
     *
     * Description: 测试验证必填字段
     *
     * Returns:
     *   response(object): 400 Bad Request
     */
    it('应该验证必填字段', async () => {
      const body = {
        userId: MOCK_USER_ID,
        // 缺少 reason 字段
      }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    /**
     * API Route: POST
     *
     * Description: 测试无效的 UUID 格式
     *
     * Returns:
     *   response(object): 400 Bad Request
     */
    it('应该返回 400 对于无效的 UUID 格式', async () => {
      const body = {
        userId: 'invalid-uuid',
        reason: '测试豁免',
      }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
        body: JSON.stringify(body),
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    /**
     * API Route: POST
     *
     * Description: 测试添加带有过期时间的豁免
     *
     * Returns:
     *   response(object): 200 OK 和创建的豁免记录
     */
    it('应该添加带有过期时间的豁免', async () => {
      const newExemption = {
        userId: MOCK_USER_ID,
        reason: '临时豁免',
        createdBy: MOCK_ADMIN_ID,
        createdAt: '2026-02-03T00:00:00.000Z',
        expiresAt: '2026-12-31T23:59:59.000Z',
      }

      mfaRepo.upsertExemption = vi.fn().mockResolvedValue(newExemption as any)

      const body = {
        userId: MOCK_USER_ID,
        reason: '临时豁免',
        expiresAt: '2026-12-31T23:59:59.000Z',
      }
      const bodyText = JSON.stringify(body)
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: {
          'Cookie': 'access_token=valid_token',
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(bodyText)),
        },
        body: bodyText,
      })

      const response = await POST_EXEMPTIONS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.expiresAt).toBe('2026-12-31T23:59:59.000Z')
    })
  })

  // ==================== DELETE /api/v1/admin/mfa/exemptions/:userId ====================

  describe('DELETE /api/v1/admin/mfa/exemptions/:userId', () => {
    /**
     * API Route: DELETE
     *
     * Description: 测试未认证用户删除豁免
     *
     * Returns:
     *   response(object): 401 Unauthorized
     */
    it('应该返回 401 当用户未认证', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest(`http://localhost/api/v1/admin/mfa/exemptions/${MOCK_USER_ID}`, {
        method: 'DELETE',
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: MOCK_USER_ID }),
      })

      expect(response.status).toBe(401)
    })

    /**
     * API Route: DELETE
     *
     * Description: 测试没有 admin:mfa:manage 权限的用户删除
     *
     * Returns:
     *   response(object): 403 Forbidden
     */
    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new ForbiddenError('Forbidden'))

      const req = new NextRequest(`http://localhost/api/v1/admin/mfa/exemptions/${MOCK_USER_ID}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: MOCK_USER_ID }),
      })

      expect(response.status).toBe(403)
    })

    /**
     * API Route: DELETE
     *
     * Description: 测试移除豁免
     *
     * Returns:
     *   response(object): 200 OK 和删除成功标志
     */
    it('应该移除豁免', async () => {
      mfaRepo.deleteExemption = vi.fn().mockResolvedValue(true)

      const req = new NextRequest(`http://localhost/api/v1/admin/mfa/exemptions/${MOCK_USER_ID}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: MOCK_USER_ID }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)
      expect(mfaRepo.deleteExemption).toHaveBeenCalledWith(
        expect.anything(),
        { userId: MOCK_USER_ID },
      )
    })

    /**
     * API Route: DELETE
     *
     * Description: 测试删除不存在的豁免
     *
     * Returns:
     *   response(object): 200 OK 和 false 标志
     */
    it('应该返回 false 当删除不存在的豁免', async () => {
      mfaRepo.deleteExemption = vi.fn().mockResolvedValue(false)

      const req = new NextRequest(`http://localhost/api/v1/admin/mfa/exemptions/${MOCK_USER_ID}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: MOCK_USER_ID }),
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(false)
    })

    /**
     * API Route: DELETE
     *
     * Description: 测试无效的 UUID 格式
     *
     * Returns:
     *   response(object): 400 Bad Request
     */
    it('应该验证 UUID 格式', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/exemptions/invalid-uuid', {
        method: 'DELETE',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: 'invalid-uuid' }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })
  })
})
