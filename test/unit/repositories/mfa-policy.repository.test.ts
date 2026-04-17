/**
 * File: test/unit/repositories/mfa-policy.repository.test.ts
 * Description: MFA 策略 Repository 单元测试
 * (测试 MFA 全局设置、角色策略、豁免管理的数据访问层)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaMfaPolicyRepository } from '@/repositories/prisma/mfa-policy.repository'
import type { MfaPolicyRepository } from '@/repositories/interfaces/mfa-policy.interface'
import type { RepoContext } from '@/types/repo/repo-context'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    mfaGlobalSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    mfaRolePolicy: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    mfaExemption: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const { prisma } = vi.mocked(await import('@/lib/prisma'), { shallow: false })

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
}

// Mock RepoContext
const mockCtx: RepoContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

describe('PrismaMfaPolicyRepository', () => {
  let repository: MfaPolicyRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new PrismaMfaPolicyRepository()
  })

  describe('Global Settings Tests', () => {
    /**
     * Function: getGlobalSettings
     *
     * Description: 测试当没有全局设置时返回 null
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *
     * Returns:
     *   null: 全局设置不存在
     */
    it('should return null when no settings exist', async () => {
      vi.mocked(prisma.mfaGlobalSettings.findFirst).mockResolvedValue(null)

      const result = await repository.getGlobalSettings(mockCtx)

      expect(result).toBeNull()
      expect(prisma.mfaGlobalSettings.findFirst).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { action: 'mfa_get_global_settings' },
        'Getting MFA global settings'
      )
    })

    /**
     * Function: getGlobalSettings
     *
     * Description: 测试当设置存在时返回正确的设置数据
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *
     * Returns:
     *   settings(MfaGlobalSettingsDto): 全局设置
     */
    it('should return settings when they exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        mode: 'required',
        allowExemptions: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaGlobalSettings.findFirst).mockResolvedValue(mockSettings)

      const result = await repository.getGlobalSettings(mockCtx)

      expect(result).toEqual({
        mode: 'required',
        allowExemptions: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(prisma.mfaGlobalSettings.findFirst).toHaveBeenCalled()
    })

    /**
     * Function: upsertGlobalSettings
     *
     * Description: 测试创建新的全局设置
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.mode(string): MFA 模式
     *   params.allowExemptions(boolean): 是否允许豁免
     *
     * Returns:
     *   settings(MfaGlobalSettingsDto): 创建的设置
     */
    it('should create new settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        mode: 'optional',
        allowExemptions: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaGlobalSettings.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.mfaGlobalSettings.create).mockResolvedValue(mockSettings)

      const result = await repository.upsertGlobalSettings(mockCtx, {
        mode: 'optional',
        allowExemptions: false,
      })

      expect(result).toEqual({
        mode: 'optional',
        allowExemptions: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(prisma.mfaGlobalSettings.findFirst).toHaveBeenCalled()
      expect(prisma.mfaGlobalSettings.create).toHaveBeenCalledWith({
        data: {
          mode: 'optional',
          allowExemptions: false,
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_upsert_global_settings', mode: 'optional' },
        'Upserting MFA global settings'
      )
    })

    /**
     * Function: upsertGlobalSettings
     *
     * Description: 测试更新现有的全局设置
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.mode(string): MFA 模式
     *   params.allowExemptions(boolean): 是否允许豁免
     *
     * Returns:
     *   settings(MfaGlobalSettingsDto): 更新后的设置
     */
    it('should update existing settings', async () => {
      const existingSettings = {
        id: 'settings-1',
        mode: 'optional',
        allowExemptions: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      const updatedSettings = {
        id: 'settings-1',
        mode: 'required',
        allowExemptions: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaGlobalSettings.findFirst).mockResolvedValue(existingSettings)
      vi.mocked(prisma.mfaGlobalSettings.update).mockResolvedValue(updatedSettings)

      const result = await repository.upsertGlobalSettings(mockCtx, {
        mode: 'required',
        allowExemptions: true,
      })

      expect(result).toEqual({
        mode: 'required',
        allowExemptions: true,
        updatedAt: '2024-01-02T00:00:00.000Z',
      })
      expect(prisma.mfaGlobalSettings.findFirst).toHaveBeenCalled()
      expect(prisma.mfaGlobalSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: {
          mode: 'required',
          allowExemptions: true,
        },
      })
    })
  })

  describe('Role Policies Tests', () => {
    /**
     * Function: getRolePolicies
     *
     * Description: 测试当没有策略时返回空数组
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *
     * Returns:
     *   policies(MfaRolePolicyDto[]): 空数组
     */
    it('should return empty array when no policies', async () => {
      vi.mocked(prisma.mfaRolePolicy.findMany).mockResolvedValue([])

      const result = await repository.getRolePolicies(mockCtx)

      expect(result).toEqual([])
      expect(prisma.mfaRolePolicy.findMany).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { action: 'mfa_get_role_policies' },
        'Getting MFA role policies'
      )
    })

    /**
     * Function: getRolePolicies
     *
     * Description: 测试返回所有角色策略
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *
     * Returns:
     *   policies(MfaRolePolicyDto[]): 角色策略列表
     */
    it('should return all policies', async () => {
      const mockPolicies = [
        {
          roleName: 'admin',
          policy: 'required',
          allowExemptions: false,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          roleName: 'user',
          policy: 'optional',
          allowExemptions: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]

      vi.mocked(prisma.mfaRolePolicy.findMany).mockResolvedValue(mockPolicies)

      const result = await repository.getRolePolicies(mockCtx)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(result[1]).toEqual({
        roleName: 'user',
        policy: 'optional',
        allowExemptions: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    /**
     * Function: getRolePolicyByName
     *
     * Description: 测试当角色不存在时返回 null
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.roleName(string): 角色名称
     *
     * Returns:
     *   null: 角色策略不存在
     */
    it('should return null for non-existent role', async () => {
      vi.mocked(prisma.mfaRolePolicy.findUnique).mockResolvedValue(null)

      const result = await repository.getRolePolicyByName(mockCtx, {
        roleName: 'non-existent',
      })

      expect(result).toBeNull()
      expect(prisma.mfaRolePolicy.findUnique).toHaveBeenCalledWith({
        where: { roleName: 'non-existent' },
      })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { action: 'mfa_get_role_policy', roleName: 'non-existent' },
        'Getting MFA role policy by name'
      )
    })

    /**
     * Function: getRolePolicyByName
     *
     * Description: 测试返回存在的角色策略
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.roleName(string): 角色名称
     *
     * Returns:
     *   policy(MfaRolePolicyDto): 角色策略
     */
    it('should return policy for existing role', async () => {
      const mockPolicy = {
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaRolePolicy.findUnique).mockResolvedValue(mockPolicy)

      const result = await repository.getRolePolicyByName(mockCtx, {
        roleName: 'admin',
      })

      expect(result).toEqual({
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    /**
     * Function: upsertRolePolicy
     *
     * Description: 测试创建新的角色策略
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.roleName(string): 角色名称
     *   params.policy(string): 策略类型
     *   params.allowExemptions(boolean): 是否允许豁免
     *
     * Returns:
     *   policy(MfaRolePolicyDto): 创建的策略
     */
    it('should create new role policy', async () => {
      const mockPolicy = {
        roleName: 'moderator',
        policy: 'optional',
        allowExemptions: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaRolePolicy.upsert).mockResolvedValue(mockPolicy)

      const result = await repository.upsertRolePolicy(mockCtx, {
        roleName: 'moderator',
        policy: 'optional',
        allowExemptions: true,
      })

      expect(result).toEqual({
        roleName: 'moderator',
        policy: 'optional',
        allowExemptions: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(prisma.mfaRolePolicy.upsert).toHaveBeenCalledWith({
        where: { roleName: 'moderator' },
        update: {
          policy: 'optional',
          allowExemptions: true,
        },
        create: {
          roleName: 'moderator',
          policy: 'optional',
          allowExemptions: true,
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_upsert_role_policy', roleName: 'moderator', policy: 'optional' },
        'Upserting MFA role policy'
      )
    })

    /**
     * Function: upsertRolePolicy
     *
     * Description: 测试更新现有的角色策略
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.roleName(string): 角色名称
     *   params.policy(string): 策略类型
     *   params.allowExemptions(boolean): 是否允许豁免
     *
     * Returns:
     *   policy(MfaRolePolicyDto): 更新后的策略
     */
    it('should update existing role policy', async () => {
      const mockPolicy = {
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      }

      vi.mocked(prisma.mfaRolePolicy.upsert).mockResolvedValue(mockPolicy)

      const result = await repository.upsertRolePolicy(mockCtx, {
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
      })

      expect(result).toEqual({
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        updatedAt: '2024-01-02T00:00:00.000Z',
      })
    })

    /**
     * Function: batchUpsertRolePolicies
     *
     * Description: 测试处理空数组
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.policies(array): 策略列表
     *
     * Returns:
     *   policies(MfaRolePolicyDto[]): 空数组
     */
    it('should handle empty array', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      const result = await repository.batchUpsertRolePolicies(mockCtx, {
        policies: [],
      })

      expect(result).toEqual([])
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_batch_upsert_role_policies', count: 0 },
        'Batch upserting MFA role policies'
      )
    })

    /**
     * Function: batchUpsertRolePolicies
     *
     * Description: 测试批量创建/更新多个策略
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.policies(array): 策略列表
     *
     * Returns:
     *   policies(MfaRolePolicyDto[]): 更新后的策略列表
     */
    it('should batch create/update multiple policies', async () => {
      const mockPolicies = [
        {
          roleName: 'admin',
          policy: 'required' as const,
          allowExemptions: false,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          roleName: 'user',
          policy: 'optional' as const,
          allowExemptions: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        // 模拟事务中的 upsert 调用
        vi.mocked(prisma.mfaRolePolicy.upsert)
          .mockResolvedValueOnce(mockPolicies[0])
          .mockResolvedValueOnce(mockPolicies[1])
        return await callback(prisma)
      })

      const result = await repository.batchUpsertRolePolicies(mockCtx, {
        policies: [
          { roleName: 'admin', policy: 'required', allowExemptions: false },
          { roleName: 'user', policy: 'optional', allowExemptions: true },
        ],
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        roleName: 'admin',
        policy: 'required',
        allowExemptions: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(result[1]).toEqual({
        roleName: 'user',
        policy: 'optional',
        allowExemptions: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
      expect(prisma.mfaRolePolicy.upsert).toHaveBeenCalledTimes(2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_batch_upsert_role_policies', count: 2 },
        'Batch upserting MFA role policies'
      )
    })
  })

  describe('Exemptions Tests', () => {
    /**
     * Function: getExemptions
     *
     * Description: 测试返回分页的豁免列表
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   query.page(number): 页码
     *   query.limit(number): 每页数量
     *
     * Returns:
     *   result(object): 豁免列表和分页信息
     */
    it('should return paginated exemption list', async () => {
      const mockExemptions = [
        {
          userId: 'user-1',
          reason: '测试用户',
          createdBy: 'admin-1',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          expiresAt: null,
        },
        {
          userId: 'user-2',
          reason: '特殊账号',
          createdBy: 'admin-1',
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        },
      ]

      vi.mocked(prisma.mfaExemption.findMany).mockResolvedValue(mockExemptions)
      vi.mocked(prisma.mfaExemption.count).mockResolvedValue(2)

      const result = await repository.getExemptions(mockCtx, {
        page: 1,
        limit: 20,
      })

      expect(result).toEqual({
        exemptions: [
          {
            userId: 'user-1',
            reason: '测试用户',
            createdBy: 'admin-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            expiresAt: undefined,
          },
          {
            userId: 'user-2',
            reason: '特殊账号',
            createdBy: 'admin-1',
            createdAt: '2024-01-02T00:00:00.000Z',
            expiresAt: '2024-12-31T23:59:59.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      })
      expect(prisma.mfaExemption.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
      expect(prisma.mfaExemption.count).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { action: 'mfa_get_exemptions' },
        'Getting MFA exemptions'
      )
    })

    /**
     * Function: getExemptionByUserId
     *
     * Description: 测试当用户不存在时返回 null
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   null: 豁免不存在
     */
    it('should return null for non-existent user', async () => {
      vi.mocked(prisma.mfaExemption.findUnique).mockResolvedValue(null)

      const result = await repository.getExemptionByUserId(mockCtx, {
        userId: 'non-existent-user',
      })

      expect(result).toBeNull()
      expect(prisma.mfaExemption.findUnique).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
      })
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { action: 'mfa_get_exemption', userId: 'non-existent-user' },
        'Getting MFA exemption by user ID'
      )
    })

    /**
     * Function: getExemptionByUserId
     *
     * Description: 测试返回存在的用户豁免信息
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   exemption(MfaExemptionDto): 豁免信息
     */
    it('should return exemption for existing user', async () => {
      const mockExemption = {
        userId: 'user-1',
        reason: '测试用户',
        createdBy: 'admin-1',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
      }

      vi.mocked(prisma.mfaExemption.findUnique).mockResolvedValue(mockExemption)

      const result = await repository.getExemptionByUserId(mockCtx, {
        userId: 'user-1',
      })

      expect(result).toEqual({
        userId: 'user-1',
        reason: '测试用户',
        createdBy: 'admin-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-12-31T23:59:59.000Z',
      })
    })

    /**
     * Function: getExemptionByUserId
     *
     * Description: 测试返回没有过期时间的豁免信息
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   exemption(MfaExemptionDto): 豁免信息 (expiresAt 为 null)
     */
    it('should return exemption with null expiresAt', async () => {
      const mockExemption = {
        userId: 'user-1',
        reason: '永久豁免',
        createdBy: 'admin-1',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: null,
      }

      vi.mocked(prisma.mfaExemption.findUnique).mockResolvedValue(mockExemption)

      const result = await repository.getExemptionByUserId(mockCtx, {
        userId: 'user-1',
      })

      expect(result).toEqual({
        userId: 'user-1',
        reason: '永久豁免',
        createdBy: 'admin-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: undefined,
      })
    })

    /**
     * Function: createExemption
     *
     * Description: 测试创建新的豁免记录
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *   params.reason(string): 豁免原因
     *   params.createdBy(string): 创建者 ID
     *   params.expiresAt(Date): 过期时间
     *
     * Returns:
     *   exemption(MfaExemptionDto): 创建的豁免记录
     */
    it('should create new exemption', async () => {
      const mockExemption = {
        userId: 'user-1',
        reason: '测试用户',
        createdBy: 'admin-1',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
      }

      vi.mocked(prisma.mfaExemption.create).mockResolvedValue(mockExemption)

      const result = await repository.createExemption(mockCtx, {
        userId: 'user-1',
        reason: '测试用户',
        createdBy: 'admin-1',
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
      })

      expect(result).toEqual({
        userId: 'user-1',
        reason: '测试用户',
        createdBy: 'admin-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-12-31T23:59:59.000Z',
      })
      expect(prisma.mfaExemption.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          reason: '测试用户',
          createdBy: 'admin-1',
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_create_exemption', userId: 'user-1' },
        'Creating MFA exemption'
      )
    })

    /**
     * Function: createExemption
     *
     * Description: 测试创建没有过期时间的豁免记录
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *   params.reason(string): 豁免原因
     *   params.createdBy(string): 创建者 ID
     *
     * Returns:
     *   exemption(MfaExemptionDto): 创建的豁免记录
     */
    it('should create exemption without expiresAt', async () => {
      const mockExemption = {
        userId: 'user-1',
        reason: '永久豁免',
        createdBy: 'admin-1',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: null,
      }

      vi.mocked(prisma.mfaExemption.create).mockResolvedValue(mockExemption)

      const result = await repository.createExemption(mockCtx, {
        userId: 'user-1',
        reason: '永久豁免',
        createdBy: 'admin-1',
      })

      expect(result).toEqual({
        userId: 'user-1',
        reason: '永久豁免',
        createdBy: 'admin-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: undefined,
      })
      expect(prisma.mfaExemption.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          reason: '永久豁免',
          createdBy: 'admin-1',
          expiresAt: null,
        },
      })
    })

    /**
     * Function: deleteExemption
     *
     * Description: 测试成功删除豁免记录
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   boolean: 删除成功返回 true
     */
    it('should return true on successful deletion', async () => {
      vi.mocked(prisma.mfaExemption.delete).mockResolvedValue(undefined)

      const result = await repository.deleteExemption(mockCtx, {
        userId: 'user-1',
      })

      expect(result).toBe(true)
      expect(prisma.mfaExemption.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'mfa_delete_exemption', userId: 'user-1' },
        'Deleting MFA exemption'
      )
    })

    /**
     * Function: deleteExemption
     *
     * Description: 测试删除不存在的豁免记录时返回 false
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   boolean: 删除失败返回 false
     */
    it('should return false when exemption does not exist', async () => {
      const error = new Error('Record to delete does not exist')
      vi.mocked(prisma.mfaExemption.delete).mockRejectedValue(error)

      const result = await repository.deleteExemption(mockCtx, {
        userId: 'non-existent-user',
      })

      expect(result).toBe(false)
      expect(prisma.mfaExemption.delete).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
      })
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          action: 'mfa_delete_exemption_failed',
          userId: 'non-existent-user',
          error,
        },
        'Failed to delete MFA exemption'
      )
    })

    /**
     * Function: deleteExemption
     *
     * Description: 测试数据库错误时返回 false
     *
     * Parameters:
     *   ctx(RepoContext): 服务上下文
     *   params.userId(string): 用户 ID
     *
     * Returns:
     *   boolean: 删除失败返回 false
     */
    it('should return false on database error', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(prisma.mfaExemption.delete).mockRejectedValue(error)

      const result = await repository.deleteExemption(mockCtx, {
        userId: 'user-1',
      })

      expect(result).toBe(false)
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })
})
