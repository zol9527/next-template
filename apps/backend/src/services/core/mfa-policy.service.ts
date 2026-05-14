/**
 * MFA Policy Service
 *
 * Description: MFA 策略配置管理服务，实现 MFA 策略的业务逻辑
 *
 * Features:
 * - getSettings(): 获取完整的 MFA 设置（全局、角色、豁免）
 * - updateGlobalSettings(): 更新全局 MFA 策略
 * - updateRolePolicies(): 批量更新角色策略
 * - addExemption(): 添加用户豁免
 * - removeExemption(): 移除用户豁免
 * - getEffectivePolicyForUser(): 获取用户的生效策略
 * - checkMfaRequired(): 检查用户是否需要 MFA
 *
 * Dependencies:
 * - MfaPolicyRepository: 数据持久化
 * - MfaAuditLogService: 审计日志
 * - UserRepository: 用户信息查询
 * - RbacRepository: 角色权限查询
 */

import type { MfaPolicyRepository } from '@/repositories/interfaces/core/mfa-policy.interface'
import type {
  MfaGlobalSettingsDto,
  MfaRolePolicyDto,
  MfaExemptionDto,
  MfaSettingsResponse,
  UpdateMfaGlobalSettingsRequest,
  UpdateMfaRolePoliciesRequest,
  AddMfaExemptionRequest,
} from '@/contracts/dtos/admin/mfa-settings.dto'
import type { ServiceContext } from '@/types/service/service-context'
import { MfaAuditLogService, type MfaAuditAction } from '@/services/core/mfa-audit-log.service'
import { env } from '@/config'

// ==================== 类型定义 ====================

/**
 * Type: EffectiveMfaPolicy
 *
 * Description: 用户的生效 MFA 策略
 */
export type EffectiveMfaPolicy = {
  /** MFA 是否必需 */
  required: boolean
  /** 策略来源 */
  source: 'global' | 'role' | 'exemption' | 'user-configured'
  /** 策略原因说明 */
  reason: string
  /** 是否允许豁免 */
  allowExemptions: boolean
}

/**
 * Type: MfaPolicyService
 *
 * Description: MFA 策略服务类型，由 createMfaPolicyService 函数返回
 */
export type MfaPolicyService = ReturnType<typeof createMfaPolicyService>

// ==================== 辅助函数 ====================

/**
 * Function: createDefaultGlobalSettings
 *
 * Description: 创建默认的全局 MFA 设置
 *
 * Returns:
 *   settings(MfaGlobalSettingsDto): 默认全局设置
 */
function createDefaultGlobalSettings(): MfaGlobalSettingsDto {
  return {
    mode: 'optional',
    allowExemptions: true,
  }
}

/**
 * Function: createDefaultRolePolicy
 *
 * Description: 创建默认的角色策略
 *
 * Parameters:
 *   roleName(string): 角色名称
 *
 * Returns:
 *   policy(MfaRolePolicyDto): 默认角色策略
 */
function createDefaultRolePolicy(roleName: string): MfaRolePolicyDto {
  // admin 角色默认强制 MFA，且不可豁免
  if (roleName === 'admin') {
    return {
      roleName,
      policy: 'force',
      allowExemptions: false,
    }
  }
  return {
    roleName,
    policy: 'inherit',
    allowExemptions: true,
  }
}

/**
 * Function: isExemptionValid
 *
 * Description: 检查豁免是否有效（未过期）
 *
 * Parameters:
 *   exemption(MfaExemptionDto): 豁免记录
 *
 * Returns:
 *   isValid(boolean): 有效返回 true
 */
function isExemptionValid(exemption: MfaExemptionDto): boolean {
  if (!exemption.expiresAt) {
    return true
  }
  return new Date(exemption.expiresAt) > new Date()
}

/**
 * Function: logPolicyChange
 *
 * Description: 记录策略变更审计日志
 *
 * Parameters:
 *   ctx(ServiceContext): 服务上下文
 *   action(MfaAuditAction): 操作类型
 *   adminId(string): 管理员 ID
 *   details(object): 变更详情
 *   mfaRepo(MfaPolicyRepository): MFA Repository
 *
 * Returns:
 *   Promise<void>
 */
async function logPolicyChange(
  ctx: ServiceContext,
  action: MfaAuditAction,
  adminId: string,
  details: Record<string, unknown>,
  _mfaRepo: MfaPolicyRepository,
): Promise<void> {
  const { logger, clientIp, userAgent } = ctx

  logger.info(
    {
      action: `mfa_policy_${action}`,
      adminId,
      ...details,
    },
    `MFA policy ${action} by admin`,
  )

  // 使用 MfaAuditLogService 创建日志条目
  const _logEntry = MfaAuditLogService.logAction({
    userId: adminId,
    action,
    status: 'success',
    ip: clientIp ?? '0.0.0.0',
    userAgent: userAgent ?? undefined,
    details: {
      ...details,
      changedBy: adminId,
    },
  })

  // TODO: 将审计日志保存到数据库
  // await _mfaRepo.createAuditLog?.(ctx, _logEntry)
}

// ==================== Service Factory ====================

/**
 * Function: createMfaPolicyService
 *
 * Description: 创建 MFA 策略服务
 *
 * Parameters:
 *   deps(object): 依赖项
 *   deps.mfaRepo(MfaPolicyRepository): MFA 策略 Repository
 *   deps.userRepo(UserRepository): 用户 Repository（可选，用于查询用户信息）
 *   deps.rbacRepo(RbacRepository): RBAC Repository（可选，用于查询角色信息）
 *   ctx(ServiceContext): 服务上下文
 *
 * Returns:
 *   service(MfaPolicyService): MFA 策略服务
 */
export function createMfaPolicyService(
  deps: {
    mfaRepo: MfaPolicyRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx
  const { mfaRepo } = deps

  return {
    // ==================== 查询方法 ====================

    /**
     * Function: getSettings
     *
     * Description: 获取完整的 MFA 设置（全局、角色、豁免）
     *
     * Parameters:
     *   availableRoles(Array): 可用角色列表，用于填充未配置的角色策略
     *
     * Returns:
     *   Promise<MfaSettingsResponse>: 完整的 MFA 设置响应
     */
    async getSettings(
      availableRoles: Array<{ name: string; description?: string }> = [],
    ): Promise<MfaSettingsResponse> {
      logger.info({ action: 'mfa_get_settings' }, 'Getting MFA settings')

      // 并行获取所有设置
      const [global, rolePolicies, exemptionsData] = await Promise.all([
        mfaRepo.getGlobalSettings(ctx),
        mfaRepo.getRolePolicies(ctx),
        mfaRepo.getExemptions(ctx, {}), // 豁免列表（分页数据）
      ])

      const exemptions = Array.isArray(exemptionsData)
        ? exemptionsData
        : (exemptionsData?.exemptions ?? [])

      // 合并角色策略：已配置的策略 + 默认策略（未配置的角色）
      const configuredRoleNames = new Set(rolePolicies.map((p) => p.roleName))
      const mergedRolePolicies: MfaRolePolicyDto[] = [
        ...rolePolicies,
        ...availableRoles
          .filter((role) => !configuredRoleNames.has(role.name))
          .map((role) => createDefaultRolePolicy(role.name)),
      ]

      return {
        global: global ?? createDefaultGlobalSettings(),
        roles: mergedRolePolicies,
        exemptions: exemptions.filter(isExemptionValid),
        availableRoles,
      }
    },

    /**
     * Function: getEffectivePolicyForUser
     *
     * Description: 获取用户的生效 MFA 策略
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   userRoles(Array<string>): 用户角色列表
     *
     * Returns:
     *   Promise<EffectiveMfaPolicy>: 用户的生效策略
     */
    async getEffectivePolicyForUser(
      userId: string,
      userRoles: string[],
    ): Promise<EffectiveMfaPolicy> {
      logger.debug({ action: 'mfa_get_effective_policy', userId }, 'Getting effective MFA policy')

      // -1. 本地开发跳过开关：MFA_SKIP_ENABLED=true 且非生产环境时跳过所有 MFA 检查
      // 安全约束：生产环境下此开关无效（即使误配也会被忽略）
      if (env.MFA_SKIP_ENABLED && process.env.NODE_ENV !== 'production') {
        logger.warn(
          { action: 'mfa_skip_enabled', userId },
          '⚠️ MFA 已通过 MFA_SKIP_ENABLED 环境变量跳过（仅限非生产环境）',
        )
        return {
          required: false,
          source: 'global',
          reason: 'MFA 已通过 MFA_SKIP_ENABLED 跳过（本地开发模式）',
          allowExemptions: true,
        }
      }

      // 0. admin 角色硬编码强制 MFA（不可豁免），无论数据库配置如何
      if (userRoles.includes('admin')) {
        return {
          required: true,
          source: 'role',
          reason: '管理员角色强制要求 MFA（硬编码策略）',
          allowExemptions: false,
        }
      }

      // 1. 检查用户是否有有效的豁免
      const exemption = await mfaRepo.getExemptionByUserId(ctx, { userId })
      if (exemption && isExemptionValid(exemption)) {
        // 检查豁免策略是否允许豁免
        const globalSettings = await mfaRepo.getGlobalSettings(ctx)
        if (globalSettings?.allowExemptions !== false) {
          return {
            required: false,
            source: 'exemption',
            reason: '用户已被管理员豁免',
            allowExemptions: true,
          }
        }
      }

      // 2. 获取全局设置
      const globalSettings = (await mfaRepo.getGlobalSettings(ctx)) ?? createDefaultGlobalSettings()

      // 3. 根据全局模式判断
      if (globalSettings.mode === 'disabled') {
        return {
          required: false,
          source: 'global',
          reason: 'MFA 已在全局禁用',
          allowExemptions: globalSettings.allowExemptions,
        }
      }

      if (globalSettings.mode === 'required') {
        return {
          required: true,
          source: 'global',
          reason: 'MFA 已在全局强制启用',
          allowExemptions: globalSettings.allowExemptions,
        }
      }

      // 4. optional 模式：检查角色策略
      if (globalSettings.mode === 'optional') {
        // 获取所有角色策略
        const rolePolicies = await mfaRepo.getRolePolicies(ctx)
        const rolePolicyMap = new Map(rolePolicies.map((p) => [p.roleName, p]))

        // 检查用户的角色
        for (const roleName of userRoles) {
          const policy = rolePolicyMap.get(roleName)
          if (policy?.policy === 'force') {
            // 检查角色级别的豁免权限
            if (policy.allowExemptions) {
              // 用户可能被豁免，但上面已经检查过了
            }
            return {
              required: true,
              source: 'role',
              reason: `角色 "${roleName}" 强制要求 MFA`,
              allowExemptions: policy.allowExemptions && globalSettings.allowExemptions,
            }
          }
        }

        // 没有强制要求 MFA 的角色
        return {
          required: false,
          source: 'global',
          reason: '全局策略为可选，且没有强制 MFA 的角色',
          allowExemptions: globalSettings.allowExemptions,
        }
      }

      // 默认情况（不应该到达这里）
      return {
        required: false,
        source: 'global',
        reason: '未知策略状态，默认不强制 MFA',
        allowExemptions: true,
      }
    },

    /**
     * Function: checkMfaRequired
     *
     * Description: 检查用户是否需要 MFA（便捷方法）
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   userRoles(Array<string>): 用户角色列表
     *
     * Returns:
     *   Promise<boolean>: 需要 MFA 返回 true
     */
    async checkMfaRequired(userId: string, userRoles: string[]): Promise<boolean> {
      const policy = await this.getEffectivePolicyForUser(userId, userRoles)
      return policy.required
    },

    // ==================== 管理方法 ====================

    /**
     * Function: updateGlobalSettings
     *
     * Description: 更新全局 MFA 策略
     *
     * Parameters:
     *   data(UpdateMfaGlobalSettingsRequest): 更新数据
     *   adminId(string): 管理员 ID（用于审计）
     *
     * Returns:
     *   Promise<MfaGlobalSettingsDto>: 更新后的全局设置
     */
    async updateGlobalSettings(
      data: UpdateMfaGlobalSettingsRequest,
      adminId: string,
    ): Promise<MfaGlobalSettingsDto> {
      logger.info(
        { action: 'mfa_update_global_settings', mode: data.mode, adminId },
        'Updating MFA global settings',
      )

      // 获取旧设置用于审计
      const oldSettings = await mfaRepo.getGlobalSettings(ctx)

      // 更新设置
      const updatedSettings = await mfaRepo.upsertGlobalSettings(ctx, data)

      // 记录审计日志
      await logPolicyChange(
        ctx,
        'update-policy',
        adminId,
        {
          scope: 'global',
          oldMode: oldSettings?.mode ?? 'default',
          newMode: data.mode,
          oldAllowExemptions: oldSettings?.allowExemptions ?? true,
          newAllowExemptions: data.allowExemptions,
        },
        mfaRepo,
      )

      return updatedSettings
    },

    /**
     * Function: updateRolePolicies
     *
     * Description: 批量更新角色策略
     *
     * Parameters:
     *   policies(Array): 策略列表
     *   adminId(string): 管理员 ID（用于审计）
     *
     * Returns:
     *   Promise<MfaRolePolicyDto[]>: 更新后的策略列表
     */
    async updateRolePolicies(
      policies: UpdateMfaRolePoliciesRequest['policies'],
      adminId: string,
    ): Promise<MfaRolePolicyDto[]> {
      logger.info(
        { action: 'mfa_update_role_policies', count: policies.length, adminId },
        'Updating MFA role policies',
      )

      // 批量更新
      const updatedPolicies = await mfaRepo.batchUpsertRolePolicies(ctx, {
        policies,
      })

      // 记录审计日志
      await logPolicyChange(
        ctx,
        'update-policy',
        adminId,
        {
          scope: 'roles',
          roleCount: policies.length,
          roles: policies.map((p) => p.roleName),
        },
        mfaRepo,
      )

      return updatedPolicies
    },

    /**
     * Function: addExemption
     *
     * Description: 添加用户豁免
     *
     * Parameters:
     *   data(AddMfaExemptionRequest): 豁免数据
     *   adminId(string): 管理员 ID（用于审计）
     *
     * Returns:
     *   Promise<MfaExemptionDto>: 创建的豁免记录
     *
     * Throws:
     *   Error: 当用户已存在有效豁免时
     */
    async addExemption(
      data: AddMfaExemptionRequest,
      adminId: string,
    ): Promise<MfaExemptionDto> {
      logger.info(
        { action: 'mfa_add_exemption', userId: data.userId, adminId },
        'Adding MFA exemption',
      )

      // 幂等：已存在则更新（避免重复添加导致 500 或 unique 冲突）
      const exemption = await mfaRepo.upsertExemption(ctx, {
        userId: data.userId,
        reason: data.reason,
        createdBy: adminId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      })

      // 记录审计日志
      await logPolicyChange(
        ctx,
        'reset-by-admin',
        adminId,
        {
          scope: 'exemption',
          targetUserId: data.userId,
          reason: data.reason,
          expiresAt: data.expiresAt,
        },
        mfaRepo,
      )

      return exemption
    },

    /**
     * Function: removeExemption
     *
     * Description: 移除用户豁免
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   adminId(string): 管理员 ID（用于审计）
     *
     * Returns:
     *   Promise<boolean>: 移除成功返回 true
     */
    async removeExemption(userId: string, adminId: string): Promise<boolean> {
      logger.info(
        { action: 'mfa_remove_exemption', userId, adminId },
        'Removing MFA exemption',
      )

      // 删除豁免
      const success = await mfaRepo.deleteExemption(ctx, { userId })

      if (success) {
        // 记录审计日志
        await logPolicyChange(
          ctx,
          'reset-by-admin',
          adminId,
          {
            scope: 'exemption',
            targetUserId: userId,
            action: 'remove',
          },
          mfaRepo,
        )
      }

      return success
    },
  }
}

/**
 * 默认导出 createMfaPolicyService 函数，支持函数式调用
 */
export default createMfaPolicyService
