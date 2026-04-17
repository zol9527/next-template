/**
 * File: src/repositories/prisma/mfa-policy.repository.ts
 * Description: MFA 策略 Repository Prisma 实现
 */

import { prisma } from '@/lib/prisma'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  MfaGlobalSettingsDto,
  MfaRolePolicyDto,
  MfaExemptionDto,
} from '@/contracts/dtos/admin/mfa-settings.dto'
import type { MfaPolicyRepository } from '@/repositories/interfaces/core/mfa-policy.interface'

/**
 * Class: PrismaMfaPolicyRepository
 *
 * Description: MFA 策略数据访问 Prisma 实现
 */
export class PrismaMfaPolicyRepository implements MfaPolicyRepository {
  /**
   * Function: getGlobalSettings
   *
   * Description: 获取 MFA 全局设置
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *
   * Returns:
   *   Promise<MfaGlobalSettingsDto | null>: 全局设置，不存在返回 null
   */
  async getGlobalSettings(ctx: RepoContext): Promise<MfaGlobalSettingsDto | null> {
    ctx.logger.debug({ action: 'mfa_get_global_settings' }, 'Getting MFA global settings')

    const settings = await prisma.mfaGlobalSettings.findFirst()

    if (!settings) {
      return null
    }

    return {
      mode: settings.mode as MfaGlobalSettingsDto['mode'],
      allowExemptions: settings.allowExemptions,
      updatedAt: settings.updatedAt.toISOString(),
    }
  }

  /**
   * Function: upsertGlobalSettings
   *
   * Description: 创建或更新全局设置
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 全局设置数据
   *     mode(string): MFA 模式
   *     allowExemptions(boolean): 是否允许豁免
   *
   * Returns:
   *   Promise<MfaGlobalSettingsDto>: 更新后的设置
   */
  async upsertGlobalSettings(
    ctx: RepoContext,
    params: { mode: MfaGlobalSettingsDto['mode']; allowExemptions: boolean }
  ): Promise<MfaGlobalSettingsDto> {
    ctx.logger.info({ action: 'mfa_upsert_global_settings', mode: params.mode }, 'Upserting MFA global settings')

    const existing = await prisma.mfaGlobalSettings.findFirst()

    let settings
    if (existing) {
      settings = await prisma.mfaGlobalSettings.update({
        where: { id: existing.id },
        data: {
          mode: params.mode,
          allowExemptions: params.allowExemptions,
        },
      })
    } else {
      settings = await prisma.mfaGlobalSettings.create({
        data: {
          mode: params.mode,
          allowExemptions: params.allowExemptions,
        },
      })
    }

    return {
      mode: settings.mode as MfaGlobalSettingsDto['mode'],
      allowExemptions: settings.allowExemptions,
      updatedAt: settings.updatedAt.toISOString(),
    }
  }

  /**
   * Function: getRolePolicies
   *
   * Description: 获取所有角色策略
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *
   * Returns:
   *   Promise<MfaRolePolicyDto[]>: 角色策略列表
   */
  async getRolePolicies(ctx: RepoContext): Promise<MfaRolePolicyDto[]> {
    ctx.logger.debug({ action: 'mfa_get_role_policies' }, 'Getting MFA role policies')

    const policies = await prisma.mfaRolePolicy.findMany()

    return policies.map((policy) => ({
      roleName: policy.roleName,
      policy: policy.policy as MfaRolePolicyDto['policy'],
      allowExemptions: policy.allowExemptions,
      updatedAt: policy.updatedAt.toISOString(),
    }))
  }

  /**
   * Function: getRolePolicyByName
   *
   * Description: 根据角色名获取策略
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 查询参数
   *     roleName(string): 角色名称
   *
   * Returns:
   *   Promise<MfaRolePolicyDto | null>: 角色策略，不存在返回 null
   */
  async getRolePolicyByName(
    ctx: RepoContext,
    params: { roleName: string }
  ): Promise<MfaRolePolicyDto | null> {
    ctx.logger.debug({ action: 'mfa_get_role_policy', roleName: params.roleName }, 'Getting MFA role policy by name')

    const policy = await prisma.mfaRolePolicy.findUnique({
      where: { roleName: params.roleName },
    })

    if (!policy) {
      return null
    }

    return {
      roleName: policy.roleName,
      policy: policy.policy as MfaRolePolicyDto['policy'],
      allowExemptions: policy.allowExemptions,
      updatedAt: policy.updatedAt.toISOString(),
    }
  }

  /**
   * Function: upsertRolePolicy
   *
   * Description: 创建或更新角色策略
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 角色策略数据
   *     roleName(string): 角色名称
   *     policy(string): 策略类型
   *     allowExemptions(boolean): 是否允许豁免
   *
   * Returns:
   *   Promise<MfaRolePolicyDto>: 更新后的策略
   */
  async upsertRolePolicy(
    ctx: RepoContext,
    params: { roleName: string; policy: MfaRolePolicyDto['policy']; allowExemptions: boolean }
  ): Promise<MfaRolePolicyDto> {
    ctx.logger.info(
      { action: 'mfa_upsert_role_policy', roleName: params.roleName, policy: params.policy },
      'Upserting MFA role policy'
    )

    const policy = await prisma.mfaRolePolicy.upsert({
      where: { roleName: params.roleName },
      update: {
        policy: params.policy,
        allowExemptions: params.allowExemptions,
      },
      create: {
        roleName: params.roleName,
        policy: params.policy,
        allowExemptions: params.allowExemptions,
      },
    })

    return {
      roleName: policy.roleName,
      policy: policy.policy as MfaRolePolicyDto['policy'],
      allowExemptions: policy.allowExemptions,
      updatedAt: policy.updatedAt.toISOString(),
    }
  }

  /**
   * Function: batchUpsertRolePolicies
   *
   * Description: 批量更新角色策略
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 批量更新参数
   *     policies(array): 策略列表
   *
   * Returns:
   *   Promise<MfaRolePolicyDto[]>: 更新后的策略列表
   */
  async batchUpsertRolePolicies(
    ctx: RepoContext,
    params: { policies: Array<{ roleName: string; policy: MfaRolePolicyDto['policy']; allowExemptions: boolean }> }
  ): Promise<MfaRolePolicyDto[]> {
    ctx.logger.info(
      { action: 'mfa_batch_upsert_role_policies', count: params.policies.length },
      'Batch upserting MFA role policies'
    )

    const results: MfaRolePolicyDto[] = []

    // 使用事务批量更新
    await prisma.$transaction(async (tx) => {
      for (const data of params.policies) {
        const policy = await tx.mfaRolePolicy.upsert({
          where: { roleName: data.roleName },
          update: {
            policy: data.policy,
            allowExemptions: data.allowExemptions,
          },
          create: {
            roleName: data.roleName,
            policy: data.policy,
            allowExemptions: data.allowExemptions,
          },
        })

        results.push({
          roleName: policy.roleName,
          policy: policy.policy as MfaRolePolicyDto['policy'],
          allowExemptions: policy.allowExemptions,
          updatedAt: policy.updatedAt.toISOString(),
        })
      }
    })

    return results
  }

  /**
   * Function: getExemptions
   *
   * Description: 获取豁免用户列表
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   query(object): 查询参数
   *     page(number?): 页码
   *     limit(number?): 每页数量
   *     search(string?): 搜索关键词
   *
   * Returns:
   *   Promise<object>: 豁免用户列表和分页信息
   */
  async getExemptions(
    ctx: RepoContext,
    query: { page?: number; limit?: number; search?: string }
  ): Promise<{ exemptions: MfaExemptionDto[]; total: number; page: number; limit: number }> {
    ctx.logger.debug({ action: 'mfa_get_exemptions' }, 'Getting MFA exemptions')

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [exemptions, total] = await Promise.all([
      prisma.mfaExemption.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.mfaExemption.count(),
    ])

    return {
      exemptions: exemptions.map((exemption) => ({
        userId: exemption.userId,
        reason: exemption.reason,
        createdBy: exemption.createdBy,
        createdAt: exemption.createdAt.toISOString(),
        expiresAt: exemption.expiresAt?.toISOString(),
      })),
      total,
      page,
      limit,
    }
  }

  /**
   * Function: getExemptionByUserId
   *
   * Description: 根据用户 ID 获取豁免信息
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 查询参数
   *     userId(string): 用户 ID
   *
   * Returns:
   *   Promise<MfaExemptionDto | null>: 豁免信息，不存在返回 null
   */
  async getExemptionByUserId(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<MfaExemptionDto | null> {
    ctx.logger.debug({ action: 'mfa_get_exemption', userId: params.userId }, 'Getting MFA exemption by user ID')

    const exemption = await prisma.mfaExemption.findUnique({
      where: { userId: params.userId },
    })

    if (!exemption) {
      return null
    }

    return {
      userId: exemption.userId,
      reason: exemption.reason,
      createdBy: exemption.createdBy,
      createdAt: exemption.createdAt.toISOString(),
      expiresAt: exemption.expiresAt?.toISOString(),
    }
  }

  /**
   * Function: createExemption
   *
   * Description: 创建豁免记录
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 创建参数
   *     userId(string): 用户 ID
   *     reason(string): 豁免原因
   *     createdBy(string): 创建者 ID
   *     expiresAt(Date?): 过期时间（可选）
   *
   * Returns:
   *   Promise<MfaExemptionDto>: 创建的豁免记录
   */
  async createExemption(
    ctx: RepoContext,
    params: { userId: string; reason: string; createdBy: string; expiresAt?: Date }
  ): Promise<MfaExemptionDto> {
    ctx.logger.info(
      { action: 'mfa_create_exemption', userId: params.userId },
      'Creating MFA exemption'
    )

    const exemption = await prisma.mfaExemption.create({
      data: {
        userId: params.userId,
        reason: params.reason,
        createdBy: params.createdBy,
        expiresAt: params.expiresAt ?? null,
      },
    })

    return {
      userId: exemption.userId,
      reason: exemption.reason,
      createdBy: exemption.createdBy,
      createdAt: exemption.createdAt.toISOString(),
      expiresAt: exemption.expiresAt?.toISOString(),
    }
  }

  /**
   * Function: upsertExemption
   *
   * Description: 创建或更新豁免记录（幂等）
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 创建/更新参数
   *     userId(string): 用户 ID
   *     reason(string): 豁免原因
   *     createdBy(string): 创建者 ID（仅在首次创建时写入）
   *     expiresAt(Date?): 过期时间（可选）
   *
   * Returns:
   *   Promise<MfaExemptionDto>: 创建或更新后的豁免记录
   */
  async upsertExemption(
    ctx: RepoContext,
    params: { userId: string; reason: string; createdBy: string; expiresAt?: Date }
  ): Promise<MfaExemptionDto> {
    ctx.logger.info(
      { action: 'mfa_upsert_exemption', userId: params.userId },
      'Upserting MFA exemption'
    )

    const exemption = await prisma.mfaExemption.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        reason: params.reason,
        createdBy: params.createdBy,
        expiresAt: params.expiresAt ?? null,
      },
      update: {
        reason: params.reason,
        expiresAt: params.expiresAt ?? null,
      },
    })

    return {
      userId: exemption.userId,
      reason: exemption.reason,
      createdBy: exemption.createdBy,
      createdAt: exemption.createdAt.toISOString(),
      expiresAt: exemption.expiresAt?.toISOString(),
    }
  }

  /**
   * Function: deleteExemption
   *
   * Description: 删除豁免记录
   *
   * Parameters:
   *   ctx(RepoContext): 服务上下文
   *   params(object): 删除参数
   *     userId(string): 用户 ID
   *
   * Returns:
   *   Promise<boolean>: 是否删除成功
   */
  async deleteExemption(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<boolean> {
    ctx.logger.info({ action: 'mfa_delete_exemption', userId: params.userId }, 'Deleting MFA exemption')

    try {
      await prisma.mfaExemption.delete({
        where: { userId: params.userId },
      })
      return true
    } catch (error) {
      ctx.logger.warn(
        { action: 'mfa_delete_exemption_failed', userId: params.userId, error },
        'Failed to delete MFA exemption'
      )
      return false
    }
  }
}

/**
 * Function: createPrismaMfaPolicyRepository
 *
 * Description: 创建 Prisma MFA Policy Repository 实例
 *
 * Returns:
 *   MfaPolicyRepository: MFA 策略 Repository 实例
 */
export function createPrismaMfaPolicyRepository(): MfaPolicyRepository {
  return new PrismaMfaPolicyRepository()
}
