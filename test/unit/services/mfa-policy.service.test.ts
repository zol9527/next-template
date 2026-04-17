/**
 * File: test/unit/services/mfa-policy.service.test.ts
 * Description: MFA 策略服务单元测试
 *（测试全局设置、角色策略、豁免用户、生效策略计算、MFA 要求检查等）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMfaPolicyService } from '@/services/mfa-policy.service'
import type { MfaPolicyRepository } from '@/repositories/interfaces/mfa-policy.interface'
import type { MfaAuditAction } from '@/services/mfa-audit-log.service'
import type {
  MfaGlobalSettingsDto,
  MfaRolePolicyDto,
  MfaExemptionDto,
} from '@/contracts/dtos/admin/mfa-settings.dto'

// ==================== Mocks ====================

// Mock MfaAuditLogService
vi.mock('@/services/mfa-audit-log.service', () => ({
  MfaAuditLogService: {
    logAction: vi.fn(() => ({
      id: 'log-123',
      userId: 'admin-123',
      action: 'update-policy' as MfaAuditAction,
      status: 'success',
      ip: '192.168.1.1',
      userAgent: 'Test Agent',
      details: {},
      createdAt: new Date(),
    })),
  },
  get MfaAuditAction() {
    return {
      SETUP: 'setup',
      ENABLE: 'enable',
      DISABLE: 'disable',
      VERIFY: 'verify',
      RESET_BY_ADMIN: 'reset-by-admin',
    } as const
  },
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger),
}

// Mock service context
const mockContext = {
  traceId: 'trace-123',
  logger: mockLogger,
  clientIp: '192.168.1.1',
  userAgent: 'Test Agent',
}

// ==================== Helper Functions ====================

/**
 * Function: createMockMfaPolicyRepository
 *
 * Description: 创建模拟的 MFA Policy Repository
 *
 * Parameters:
 *   overrides(object): 覆盖默认的 Repository 方法
 *
 * Returns:
 *   repo(MfaPolicyRepository): 模拟的 Repository
 */
function createMockMfaPolicyRepository(overrides: Partial<MfaPolicyRepository> = {}): MfaPolicyRepository {
  return {
    // 全局设置
    getGlobalSettings: vi.fn(() => Promise.resolve(null)),
    upsertGlobalSettings: vi.fn((_, params) =>
      Promise.resolve({
        mode: params.mode,
        allowExemptions: params.allowExemptions,
        updatedAt: new Date().toISOString(),
      })
    ),

    // 角色策略
    getRolePolicies: vi.fn(() => Promise.resolve([])),
    getRolePolicyByName: vi.fn((_, params) => Promise.resolve(null)),
    upsertRolePolicy: vi.fn((_, params) =>
      Promise.resolve({
        roleName: params.roleName,
        policy: params.policy,
        allowExemptions: params.allowExemptions,
        updatedAt: new Date().toISOString(),
      })
    ),
    batchUpsertRolePolicies: vi.fn((_, paramsOrArray) => {
      // Handle both array format (service bug) and { policies: array } format (interface)
      const policies = Array.isArray(paramsOrArray) ? paramsOrArray : paramsOrArray.policies
      return Promise.resolve(
        policies.map((p) => ({
          ...p,
          updatedAt: new Date().toISOString(),
        }))
      )
    }),

    // 豁免用户
    getExemptions: vi.fn((_, query) => {
      return Promise.resolve({
        exemptions: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      })
    }),
    getExemptionByUserId: vi.fn((_, userIdOrParams) => {
      // Handle both string (userId directly) and object ({ userId }) format
      const userId = typeof userIdOrParams === 'string' ? userIdOrParams : userIdOrParams.userId
      return Promise.resolve(null)
    }),
    createExemption: vi.fn((_, params) =>
      Promise.resolve({
        userId: params.userId,
        reason: params.reason,
        createdBy: params.createdBy,
        createdAt: new Date().toISOString(),
        expiresAt: params.expiresAt ? new Date(params.expiresAt).toISOString() : undefined,
      })
    ),
    upsertExemption: vi.fn((_, params) =>
      Promise.resolve({
        userId: params.userId,
        reason: params.reason,
        createdBy: params.createdBy,
        createdAt: new Date().toISOString(),
        expiresAt: params.expiresAt ? new Date(params.expiresAt).toISOString() : undefined,
      })
    ),
    deleteExemption: vi.fn((_, params) => {
      // Handle both string (userId directly) and object ({ userId }) format
      const userId = typeof params === 'string' ? params : params.userId
      return Promise.resolve(true)
    }),

    ...overrides,
  }
}

// ==================== Test Suite ====================

describe('Unit: MfaPolicyService', () => {
  let mfaRepo: MfaPolicyRepository
  let service: ReturnType<typeof createMfaPolicyService>

  beforeEach(() => {
    vi.clearAllMocks()
    mfaRepo = createMockMfaPolicyRepository()
    service = createMfaPolicyService({ mfaRepo }, mockContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== getSettings Tests ====================

  describe('getSettings', () => {
    it('should return complete MFA settings with default global settings', async () => {
      const availableRoles = [
        { name: 'admin', description: '管理员' },
        { name: 'user', description: '普通用户' },
      ]

      const result = await service.getSettings(availableRoles)

      expect(result).toHaveProperty('global')
      expect(result).toHaveProperty('roles')
      expect(result).toHaveProperty('exemptions')
      expect(result).toHaveProperty('availableRoles')

      // 默认全局设置
      expect(result.global.mode).toBe('optional')
      expect(result.global.allowExemptions).toBe(true)

      // 所有角色都应该有策略（使用默认值）
      expect(result.roles).toHaveLength(2)
      expect(result.roles[0]).toEqual({
        roleName: 'admin',
        policy: 'inherit',
        allowExemptions: true,
      })
      expect(result.roles[1]).toEqual({
        roleName: 'user',
        policy: 'inherit',
        allowExemptions: true,
      })

      expect(result.availableRoles).toEqual(availableRoles)
    })

    it('should return settings with existing global settings', async () => {
      const mockGlobalSettings: MfaGlobalSettingsDto = {
        mode: 'required',
        allowExemptions: false,
        updatedAt: new Date().toISOString(),
      }

      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() => Promise.resolve(mockGlobalSettings)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getSettings([])

      expect(result.global).toEqual(mockGlobalSettings)
      expect(mfaRepo.getGlobalSettings).toHaveBeenCalledWith(mockContext)
    })

    it('should map roles to available roles format', async () => {
      const availableRoles = [
        { name: 'admin', description: '管理员' },
        { name: 'moderator', description: '版主' },
      ]

      const existingRolePolicies: MfaRolePolicyDto[] = [
        {
          roleName: 'admin',
          policy: 'force',
          allowExemptions: false,
          updatedAt: new Date().toISOString(),
        },
      ]

      mfaRepo = createMockMfaPolicyRepository({
        getRolePolicies: vi.fn(() => Promise.resolve(existingRolePolicies)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getSettings(availableRoles)

      // 应该包含已配置的策略
      expect(result.roles).toHaveLength(2)
      expect(result.roles[0]).toEqual(existingRolePolicies[0])

      // 未配置的角色应该使用默认值
      expect(result.roles[1]).toEqual({
        roleName: 'moderator',
        policy: 'inherit',
        allowExemptions: true,
      })
    })

    it('should filter valid exemptions only', async () => {
      const now = new Date()
      const validExemption: MfaExemptionDto = {
        userId: 'user-1',
        reason: '测试豁免',
        createdBy: 'admin-1',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 3600000).toISOString(), // 1小时后过期
      }

      const expiredExemption: MfaExemptionDto = {
        userId: 'user-2',
        reason: '已过期豁免',
        createdBy: 'admin-1',
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        expiresAt: new Date(now.getTime() - 3600000).toISOString(), // 1小时前过期
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptions: vi.fn((_, query) =>
          Promise.resolve([validExemption, expiredExemption])
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getSettings([])

      // 只应该返回有效的豁免
      expect(result.exemptions).toHaveLength(1)
      expect(result.exemptions[0].userId).toBe('user-1')
    })
  })

  // ==================== updateGlobalSettings Tests ====================

  describe('updateGlobalSettings', () => {
    it('should update global mode to required', async () => {
      const data = {
        mode: 'required' as const,
        allowExemptions: true,
      }
      const adminId = 'admin-123'

      const result = await service.updateGlobalSettings(data, adminId)

      expect(result.mode).toBe('required')
      expect(result.allowExemptions).toBe(true)
      expect(mfaRepo.upsertGlobalSettings).toHaveBeenCalledWith(mockContext, data)
    })

    it('should update allowExemptions flag', async () => {
      const data = {
        mode: 'optional' as const,
        allowExemptions: false,
      }
      const adminId = 'admin-123'

      const result = await service.updateGlobalSettings(data, adminId)

      expect(result.allowExemptions).toBe(false)
      expect(mfaRepo.upsertGlobalSettings).toHaveBeenCalledWith(mockContext, data)
    })

    it('should log audit action', async () => {
      const data = {
        mode: 'required' as const,
        allowExemptions: true,
      }
      const adminId = 'admin-123'

      await service.updateGlobalSettings(data, adminId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mfa_policy_update-policy',
          adminId,
        }),
        expect.stringContaining('MFA policy')
      )
    })
  })

  // ==================== updateRolePolicies Tests ====================

  describe('updateRolePolicies', () => {
    it('should update multiple role policies', async () => {
      const policies = [
        { roleName: 'admin', policy: 'force' as const, allowExemptions: false },
        { roleName: 'moderator', policy: 'inherit' as const, allowExemptions: true },
      ]
      const adminId = 'admin-123'

      const result = await service.updateRolePolicies(policies, adminId)

      expect(result).toHaveLength(2)
      expect(result[0].roleName).toBe('admin')
      expect(result[0].policy).toBe('force')
      expect(result[1].roleName).toBe('moderator')
      expect(result[1].policy).toBe('inherit')

      expect(mfaRepo.batchUpsertRolePolicies).toHaveBeenCalledWith(
        mockContext,
        {
          policies: expect.arrayContaining([
            expect.objectContaining({ roleName: 'admin' }),
            expect.objectContaining({ roleName: 'moderator' }),
          ]),
        }
      )
    })

    it('should create new role policies', async () => {
      const policies = [
        { roleName: 'editor', policy: 'force' as const, allowExemptions: true },
      ]
      const adminId = 'admin-123'

      const result = await service.updateRolePolicies(policies, adminId)

      expect(result).toHaveLength(1)
      expect(result[0].roleName).toBe('editor')
    })

    it('should log audit for each role', async () => {
      const policies = [
        { roleName: 'admin', policy: 'force' as const, allowExemptions: false },
        { roleName: 'user', policy: 'inherit' as const, allowExemptions: true },
      ]
      const adminId = 'admin-123'

      await service.updateRolePolicies(policies, adminId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mfa_policy_update-policy',
          roleCount: 2,
          roles: ['admin', 'user'],
        }),
        expect.stringContaining('MFA policy')
      )
    })
  })

  // ==================== addExemption Tests ====================

  describe('addExemption', () => {
    it('should add new exemption', async () => {
      const data = {
        userId: 'user-123',
        reason: '特殊业务需求豁免',
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1天后
      }
      const adminId = 'admin-123'

      const result = await service.addExemption(data, adminId)

      expect(result.userId).toBe(data.userId)
      expect(result.reason).toBe(data.reason)
      expect(result.createdBy).toBe(adminId)
      expect(result.expiresAt).toBe(data.expiresAt)

      expect(mfaRepo.upsertExemption).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          userId: data.userId,
          reason: data.reason,
          createdBy: adminId,
          expiresAt: expect.any(Date),
        })
      )
    })

    it('should be idempotent when exemption already exists', async () => {
      const existingExemption: MfaExemptionDto = {
        userId: 'user-123',
        reason: '已有豁免',
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn((_, userId) => Promise.resolve(existingExemption)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const data = {
        userId: 'user-123',
        reason: '新豁免',
      }

      await expect(service.addExemption(data, 'admin-123')).resolves.toBeDefined()
      expect(mfaRepo.upsertExemption).toHaveBeenCalledTimes(1)
    })

    it('should allow exemption if existing one is expired', async () => {
      const expiredExemption: MfaExemptionDto = {
        userId: 'user-123',
        reason: '已过期豁免',
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1小时前过期
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn((_, userId) => Promise.resolve(expiredExemption)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const data = {
        userId: 'user-123',
        reason: '新豁免',
      }

      const result = await service.addExemption(data, 'admin-123')

      expect(result.userId).toBe('user-123')
    })

    it('should log audit action', async () => {
      const data = {
        userId: 'user-123',
        reason: '测试豁免',
      }
      const adminId = 'admin-123'

      await service.addExemption(data, adminId)

      // 验证日志被调用了两次（第一次是添加豁免，第二次是审计日志）
      expect(mockLogger.info).toHaveBeenCalledTimes(2)

      // 第二次调用应该是审计日志
      expect(mockLogger.info).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: 'mfa_policy_reset-by-admin',
        }),
        expect.stringContaining('MFA policy')
      )
    })
  })

  // ==================== removeExemption Tests ====================

  describe('removeExemption', () => {
    it('should remove existing exemption', async () => {
      const userId = 'user-123'
      const adminId = 'admin-123'

      const result = await service.removeExemption(userId, adminId)

      expect(result).toBe(true)
      expect(mfaRepo.deleteExemption).toHaveBeenCalledWith(mockContext, { userId: 'user-123' })
    })

    it('should handle non-existent exemption gracefully', async () => {
      mfaRepo = createMockMfaPolicyRepository({
        deleteExemption: vi.fn(() => Promise.resolve(false)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.removeExemption('user-123', 'admin-123')

      expect(result).toBe(false)
    })

    it('should log audit action', async () => {
      const userId = 'user-123'
      const adminId = 'admin-123'

      await service.removeExemption(userId, adminId)

      // 验证日志被调用了两次（第一次是移除豁免，第二次是审计日志）
      expect(mockLogger.info).toHaveBeenCalledTimes(2)
      // 验证至少有一次调用包含 "MFA policy"
      const hasPolicyLog = mockLogger.info.mock.calls.some(call =>
        call.length >= 2 && typeof call[1] === 'string' && call[1].includes('MFA policy')
      )
      expect(hasPolicyLog).toBe(true)
    })
  })

  // ==================== getEffectivePolicyForUser Tests ====================

  describe('getEffectivePolicyForUser', () => {
    it('should return exemption policy when user is exempted', async () => {
      const exemption: MfaExemptionDto = {
        userId: 'user-123',
        reason: '管理员豁免',
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn(() => Promise.resolve(exemption)),
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'required',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['user'])

      expect(result.required).toBe(false)
      expect(result.source).toBe('exemption')
      expect(result.reason).toBe('用户已被管理员豁免')
    })

    it('should return role force policy when role has force policy', async () => {
      const rolePolicies: MfaRolePolicyDto[] = [
        {
          roleName: 'admin',
          policy: 'force',
          allowExemptions: true,
          updatedAt: new Date().toISOString(),
        },
      ]

      const globalSettings: MfaGlobalSettingsDto = {
        mode: 'optional',
        allowExemptions: true,
      }

      mfaRepo = createMockMfaPolicyRepository({
        getRolePolicies: vi.fn(() => Promise.resolve(rolePolicies)),
        getGlobalSettings: vi.fn(() => Promise.resolve(globalSettings)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['admin'])

      expect(result.required).toBe(true)
      expect(result.source).toBe('role')
      expect(result.reason).toContain('admin')
      expect(result.reason).toContain('强制要求 MFA')
    })

    it('should return global required policy when mode is required', async () => {
      const globalSettings: MfaGlobalSettingsDto = {
        mode: 'required',
        allowExemptions: true,
      }

      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() => Promise.resolve(globalSettings)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['user'])

      expect(result.required).toBe(true)
      expect(result.source).toBe('global')
      expect(result.reason).toBe('MFA 已在全局强制启用')
    })

    it('should return global optional policy when mode is optional', async () => {
      const globalSettings: MfaGlobalSettingsDto = {
        mode: 'optional',
        allowExemptions: true,
      }

      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() => Promise.resolve(globalSettings)),
        getRolePolicies: vi.fn(() => Promise.resolve([])),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['user'])

      expect(result.required).toBe(false)
      expect(result.source).toBe('global')
      expect(result.reason).toBe('全局策略为可选，且没有强制 MFA 的角色')
    })

    it('should return disabled policy when mode is disabled', async () => {
      const globalSettings: MfaGlobalSettingsDto = {
        mode: 'disabled',
        allowExemptions: false,
      }

      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() => Promise.resolve(globalSettings)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['user'])

      expect(result.required).toBe(false)
      expect(result.source).toBe('global')
      expect(result.reason).toBe('MFA 已在全局禁用')
    })

    it('should ignore exemption when global allowExemptions is false', async () => {
      const exemption: MfaExemptionDto = {
        userId: 'user-123',
        reason: '豁免',
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
      }

      const globalSettings: MfaGlobalSettingsDto = {
        mode: 'required',
        allowExemptions: false, // 不允许豁免
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn(() => Promise.resolve(exemption)),
        getGlobalSettings: vi.fn(() => Promise.resolve(globalSettings)),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.getEffectivePolicyForUser('user-123', ['user'])

      // 即使有豁免，也不应该生效
      expect(result.required).toBe(true)
      expect(result.source).toBe('global')
      expect(result.reason).toBe('MFA 已在全局强制启用')
    })
  })

  // ==================== checkMfaRequired Tests ====================

  describe('checkMfaRequired', () => {
    it('should return false when user has exemption', async () => {
      const exemption: MfaExemptionDto = {
        userId: 'user-123',
        reason: '豁免',
        createdBy: 'admin-1',
        createdAt: new Date().toISOString(),
      }

      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn(() => Promise.resolve(exemption)),
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'required',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.checkMfaRequired('user-123', ['user'])

      expect(result).toBe(false)
    })

    it('should return true when user has force policy', async () => {
      const rolePolicies: MfaRolePolicyDto[] = [
        {
          roleName: 'admin',
          policy: 'force',
          allowExemptions: true,
          updatedAt: new Date().toISOString(),
        },
      ]

      mfaRepo = createMockMfaPolicyRepository({
        getRolePolicies: vi.fn(() => Promise.resolve(rolePolicies)),
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'optional',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.checkMfaRequired('user-123', ['admin'])

      expect(result).toBe(true)
    })

    it('should return true when global mode is required', async () => {
      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'required',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.checkMfaRequired('user-123', ['user'])

      expect(result).toBe(true)
    })

    it('should return false when global mode is disabled', async () => {
      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'disabled',
            allowExemptions: false,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.checkMfaRequired('user-123', ['user'])

      expect(result).toBe(false)
    })

    it('should return false when global mode is optional with no force roles', async () => {
      mfaRepo = createMockMfaPolicyRepository({
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'optional',
            allowExemptions: true,
          })
        ),
        getRolePolicies: vi.fn(() => Promise.resolve([])),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const result = await service.checkMfaRequired('user-123', ['user'])

      expect(result).toBe(false)
    })
  })

  // ==================== Integration Tests ====================

  describe('integration: complete policy workflow', () => {
    it('should handle full policy lifecycle', async () => {
      const adminId = 'admin-123'

      // 1. 获取初始设置
      const initialSettings = await service.getSettings([])
      expect(initialSettings.global.mode).toBe('optional')

      // 2. 更新全局设置
      const updatedGlobal = await service.updateGlobalSettings(
        { mode: 'required', allowExemptions: true },
        adminId
      )
      expect(updatedGlobal.mode).toBe('required')

      // 3. 更新角色策略
      const updatedRoles = await service.updateRolePolicies(
        [
          { roleName: 'admin', policy: 'force', allowExemptions: false },
          { roleName: 'user', policy: 'inherit', allowExemptions: true },
        ],
        adminId
      )
      expect(updatedRoles).toHaveLength(2)

      // 4. 添加豁免
      const exemption = await service.addExemption(
        { userId: 'user-123', reason: '特殊业务需求' },
        adminId
      )
      expect(exemption.userId).toBe('user-123')

    // 5. 检查策略生效
      // 需要更新 mock 以返回刚创建的豁免
      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn((_, userIdOrParams) => {
          const userId = typeof userIdOrParams === 'string' ? userIdOrParams : userIdOrParams.userId
          if (userId === 'user-123') {
            return Promise.resolve(exemption)
          }
          return Promise.resolve(null)
        }),
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'required',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const policy = await service.getEffectivePolicyForUser('user-123', ['user'])
      expect(policy.required).toBe(false) // 因为有豁免
      expect(policy.source).toBe('exemption')

      // 6. 移除豁免
      const removed = await service.removeExemption('user-123', adminId)
      expect(removed).toBe(true)

      // 7. 再次检查策略（现在应该需要 MFA）
      // 更新 mock 以反映豁免已被删除
      mfaRepo = createMockMfaPolicyRepository({
        getExemptionByUserId: vi.fn(() => Promise.resolve(null)),
        getGlobalSettings: vi.fn(() =>
          Promise.resolve({
            mode: 'required',
            allowExemptions: true,
          })
        ),
      })
      service = createMfaPolicyService({ mfaRepo }, mockContext)

      const policyAfterRemoval = await service.getEffectivePolicyForUser('user-123', ['user'])
      expect(policyAfterRemoval.required).toBe(true) // 全局 required
    })
  })
})
