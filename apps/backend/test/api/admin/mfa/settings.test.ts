/**
 * File: test/api/admin/mfa/settings.test.ts
 * Description: MFA 管理员 API 路由集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { MfaPolicyRepository } from '@/repositories/interfaces/core/mfa-policy.interface'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/app-error'

const createMfaPolicyRepositoryMock = vi.hoisted(() => vi.fn())
const createRbacRepositoryMock = vi.hoisted(() => vi.fn())
const createMfaPolicyServiceMock = vi.hoisted(() => vi.fn())
const mockUseApiAuth = vi.hoisted(() => vi.fn())

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
vi.mock('@/types/service/service-context', () => {
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

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

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

// Mock MFA 策略服务
vi.mock('@/services/core/mfa-policy.service', () => ({
  createMfaPolicyService: createMfaPolicyServiceMock,
}))

// Mock 认证
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

const { GET: GET_SETTINGS } = await import('@/app/api/v1/admin/mfa/settings/route')
const { PUT: PUT_GLOBAL } = await import('@/app/api/v1/admin/mfa/global/route')
const { PUT: PUT_ROLES } = await import('@/app/api/v1/admin/mfa/roles/route')
const { POST: POST_EXEMPTIONS } = await import('@/app/api/v1/admin/mfa/exemptions/route')
const { DELETE: DELETE_EXEMPTION } = await import('@/app/api/v1/admin/mfa/exemptions/[userId]/route')

// ==================== Test Data ====================

const MOCK_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'
const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000'

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文
 *
 * Parameters:
 *     overrides(object): 可选的覆盖属性
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_ADMIN_ID,
    sessionId: 'test-session-id',
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
    ...overrides,
  }
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
  let mfaService: Record<string, ReturnType<typeof vi.fn>>

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

    // 创建 MFA Policy Service Mock
    mfaService = {
      getSettings: vi.fn(),
      updateGlobalSettings: vi.fn(),
      updateRolePolicies: vi.fn(),
      addExemption: vi.fn(),
      removeExemption: vi.fn(),
    }

    // 设置默认返回值
    createMfaPolicyRepositoryMock.mockReturnValue(mfaRepo as MfaPolicyRepository)
    createRbacRepositoryMock.mockResolvedValue(rbacRepo as RbacRepository)
    createMfaPolicyServiceMock.mockReturnValue(mfaService)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  // ==================== GET /api/v1/admin/mfa/settings ====================

  describe('GET /api/v1/admin/mfa/settings', () => {
    it('应该返回 401 当用户未认证', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    it('应该返回 403 当用户没有 mfa.read 权限', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

      const req = new NextRequest('http://localhost/api/v1/admin/mfa/settings', {
        method: 'GET',
        headers: {
          'Cookie': 'access_token=valid_token',
        },
      })

      const response = await GET_SETTINGS(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(403)
    })

    it('应该返回 MFA 设置 当用户有 mfa.read 权限', async () => {
      mfaService.getSettings.mockResolvedValue({
        global: {
          mode: 'optional',
          allowExemptions: true,
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
        roles: [
          { roleName: 'admin', policy: 'force', allowExemptions: false, updatedAt: '2026-02-01T00:00:00.000Z' },
          { roleName: 'user', policy: 'inherit', allowExemptions: true, updatedAt: null },
          { roleName: 'promoter', policy: 'inherit', allowExemptions: true, updatedAt: null },
        ],
        exemptions: { exemptions: [], total: 0, page: 1, limit: 10 },
        availableRoles: mockRoles.map((r) => ({ name: r.name, description: r.description })),
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
      expect(json.data.roles).toHaveLength(3)
      expect(json.data.availableRoles).toHaveLength(3)
    })

    it('应该返回默认设置 当数据库中没有配置', async () => {
      mfaService.getSettings.mockResolvedValue({
        global: {
          mode: 'optional',
          allowExemptions: true,
          updatedAt: null,
        },
        roles: mockRoles.map((r) => ({ roleName: r.name, policy: 'inherit', allowExemptions: true, updatedAt: null })),
        exemptions: { exemptions: [], total: 0, page: 1, limit: 10 },
        availableRoles: mockRoles.map((r) => ({ name: r.name, description: r.description })),
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
    it('应该返回 401 当用户未认证', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = { mode: 'required', allowExemptions: true }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/global', {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      const response = await PUT_GLOBAL(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

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

    it('应该更新全局模式为 required', async () => {
      const updatedSettings = {
        mode: 'required' as const,
        allowExemptions: true,
        updatedAt: '2026-02-03T00:00:00.000Z',
      }

      mfaService.updateGlobalSettings.mockResolvedValue(updatedSettings)

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
      expect(mfaService.updateGlobalSettings).toHaveBeenCalled()
    })

    it('应该更新 allowExemptions 标志', async () => {
      const updatedSettings = {
        mode: 'optional' as const,
        allowExemptions: false,
        updatedAt: '2026-02-03T00:00:00.000Z',
      }

      mfaService.updateGlobalSettings.mockResolvedValue(updatedSettings)

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
    it('应该返回 401 当用户未认证', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const body = { policies: [] }
      const req = new NextRequest('http://localhost/api/v1/admin/mfa/roles', {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      const response = await PUT_ROLES(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(401)
    })

    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

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

      mfaService.updateRolePolicies.mockResolvedValue(updatedPolicies)

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
      expect(mfaService.updateRolePolicies).toHaveBeenCalled()
    })

    it('应该处理空的策略数组', async () => {
      mfaService.updateRolePolicies.mockResolvedValue([])

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
    it('应该返回 401 当用户未认证', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

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

    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

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

    it('应该添加新的豁免', async () => {
      const newExemption = {
        userId: MOCK_USER_ID,
        reason: '测试豁免',
        createdBy: MOCK_ADMIN_ID,
        createdAt: '2026-02-03T00:00:00.000Z',
      }

      mfaService.addExemption.mockResolvedValue(newExemption as any)

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
      expect(mfaService.addExemption).toHaveBeenCalled()
    })

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

    it('应该添加带有过期时间的豁免', async () => {
      const newExemption = {
        userId: MOCK_USER_ID,
        reason: '临时豁免',
        createdBy: MOCK_ADMIN_ID,
        createdAt: '2026-02-03T00:00:00.000Z',
        expiresAt: '2026-12-31T23:59:59.000Z',
      }

      mfaService.addExemption.mockResolvedValue(newExemption as any)

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
    it('应该返回 401 当用户未认证', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest(`http://localhost/api/v1/admin/mfa/exemptions/${MOCK_USER_ID}`, {
        method: 'DELETE',
      })

      const response = await DELETE_EXEMPTION(req, {
        params: Promise.resolve({ userId: MOCK_USER_ID }),
      })

      expect(response.status).toBe(401)
    })

    it('应该返回 403 当用户没有 admin:mfa:manage 权限', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

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

    it('应该移除豁免', async () => {
      mfaService.removeExemption.mockResolvedValue(true)

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
      expect(mfaService.removeExemption).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_ADMIN_ID,
      )
    })

    it('应该返回 false 当删除不存在的豁免', async () => {
      mfaService.removeExemption.mockResolvedValue(false)

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
