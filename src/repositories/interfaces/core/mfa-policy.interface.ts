/**
 * File: src/repositories/interfaces/mfa-policy.interface.ts
 * Description: MFA 策略仓库接口，定义 MFA 全局设置、角色策略和豁免用户的数据访问操作
 */

import type { RepoContext } from '@/types/repo/repo-context'
import type {
  MfaGlobalSettingsDto,
  MfaRolePolicyDto,
  MfaExemptionDto,
} from '@/contracts/dtos/admin/mfa-settings.dto'

// ==================== 参数类型定义 ====================

/**
 * Type: UpsertMfaGlobalSettingsParams
 *
 * Description: 更新或创建 MFA 全局设置的参数
 */
export type UpsertMfaGlobalSettingsParams = {
  mode: MfaGlobalSettingsDto['mode']
  allowExemptions: boolean
}

/**
 * Type: UpsertMfaRolePolicyParams
 *
 * Description: 更新或创建单个角色 MFA 策略的参数
 */
export type UpsertMfaRolePolicyParams = {
  roleName: string
  policy: MfaRolePolicyDto['policy']
  allowExemptions: boolean
}

/**
 * Type: BatchUpsertMfaRolePolicyItem
 *
 * Description: 批量更新角色 MFA 策略的单个项目
 */
export type BatchUpsertMfaRolePolicyItem = {
  roleName: string
  policy: MfaRolePolicyDto['policy']
  allowExemptions: boolean
}

/**
 * Type: CreateMfaExemptionParams
 *
 * Description: 创建 MFA 豁免用户的参数
 */
export type CreateMfaExemptionParams = {
  userId: string
  reason: string
  createdBy: string
  expiresAt?: Date
}

/**
 * Type: GetExemptionsQuery
 *
 * Description: 查询豁免用户列表的查询参数
 */
export type GetExemptionsQuery = {
  page?: number
  limit?: number
  search?: string
}

/**
 * Type: GetExemptionsResult
 *
 * Description: 查询豁免用户列表的返回结果
 */
export type GetExemptionsResult = {
  exemptions: MfaExemptionDto[]
  total: number
  page: number
  limit: number
}

// ==================== 接口定义 ====================

/**
 * Interface: MfaPolicyRepository
 *
 * Description: MFA 策略仓库接口，提供全局设置、角色策略和豁免用户的 CRUD 操作
 */
export interface MfaPolicyRepository {
  // ==================== 全局设置 ====================

  /**
   * Function: getGlobalSettings
   *
   * Description: 获取 MFA 全局设置
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *
   * Returns:
   *   Promise<MfaGlobalSettingsDto | null>: 全局设置数据，不存在时返回 null
   */
  getGlobalSettings(ctx: RepoContext): Promise<MfaGlobalSettingsDto | null>

  /**
   * Function: upsertGlobalSettings
   *
   * Description: 更新或创建 MFA 全局设置
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(UpsertMfaGlobalSettingsParams): 全局设置参数
   *
   * Returns:
   *   Promise<MfaGlobalSettingsDto>: 更新后的全局设置数据
   */
  upsertGlobalSettings(
    ctx: RepoContext,
    params: UpsertMfaGlobalSettingsParams
  ): Promise<MfaGlobalSettingsDto>

  // ==================== 角色策略 ====================

  /**
   * Function: getRolePolicies
   *
   * Description: 获取所有角色的 MFA 策略列表
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *
   * Returns:
   *   Promise<MfaRolePolicyDto[]>: 角色策略列表
   */
  getRolePolicies(ctx: RepoContext): Promise<MfaRolePolicyDto[]>

  /**
   * Function: getRolePolicyByName
   *
   * Description: 根据角色名称获取 MFA 策略
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(object): 查询参数
   *     roleName(string): 角色名称
   *
   * Returns:
   *   Promise<MfaRolePolicyDto | null>: 角色策略数据，不存在时返回 null
   */
  getRolePolicyByName(
    ctx: RepoContext,
    params: { roleName: string }
  ): Promise<MfaRolePolicyDto | null>

  /**
   * Function: upsertRolePolicy
   *
   * Description: 更新或创建单个角色的 MFA 策略
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(UpsertMfaRolePolicyParams): 角色策略参数
   *
   * Returns:
   *   Promise<MfaRolePolicyDto>: 更新后的角色策略数据
   */
  upsertRolePolicy(
    ctx: RepoContext,
    params: UpsertMfaRolePolicyParams
  ): Promise<MfaRolePolicyDto>

  /**
   * Function: batchUpsertRolePolicies
   *
   * Description: 批量更新或创建角色 MFA 策略
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(object): 批量更新参数
   *     policies(BatchUpsertMfaRolePolicyItem[]): 角色策略列表
   *
   * Returns:
   *   Promise<MfaRolePolicyDto[]>: 更新后的角色策略列表
   */
  batchUpsertRolePolicies(
    ctx: RepoContext,
    params: { policies: BatchUpsertMfaRolePolicyItem[] }
  ): Promise<MfaRolePolicyDto[]>

  // ==================== 豁免用户 ====================

  /**
   * Function: getExemptions
   *
   * Description: 获取 MFA 豁免用户列表
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   query(GetExemptionsQuery): 查询参数（可选分页和搜索）
   *
   * Returns:
   *   Promise<GetExemptionsResult>: 豁免用户列表和总数
   */
  getExemptions(
    ctx: RepoContext,
    query: GetExemptionsQuery
  ): Promise<GetExemptionsResult>

  /**
   * Function: getExemptionByUserId
   *
   * Description: 根据用户 ID 获取 MFA 豁免信息
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(object): 查询参数
   *     userId(string): 用户 ID
   *
   * Returns:
   *   Promise<MfaExemptionDto | null>: 豁免用户信息，不存在时返回 null
   */
  getExemptionByUserId(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<MfaExemptionDto | null>

  /**
   * Function: createExemption
   *
   * Description: 创建 MFA 豁免用户
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(CreateMfaExemptionParams): 创建豁免参数
   *
   * Returns:
   *   Promise<MfaExemptionDto>: 创建的豁免用户信息
   */
  createExemption(
    ctx: RepoContext,
    params: CreateMfaExemptionParams
  ): Promise<MfaExemptionDto>

  /**
   * Function: upsertExemption
   *
   * Description: 创建或更新 MFA 豁免用户（幂等）
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(CreateMfaExemptionParams): 创建/更新豁免参数
   *
   * Returns:
   *   Promise<MfaExemptionDto>: 创建或更新后的豁免用户信息
   */
  upsertExemption(
    ctx: RepoContext,
    params: CreateMfaExemptionParams
  ): Promise<MfaExemptionDto>

  /**
   * Function: deleteExemption
   *
   * Description: 删除 MFA 豁免用户
   *
   * Parameters:
   *   ctx(RepoContext): 仓库执行上下文
   *   params(object): 删除参数
   *     userId(string): 用户 ID
   *
   * Returns:
   *   Promise<boolean>: 是否成功删除（存在且已删除返回 true，不存在返回 false）
   */
  deleteExemption(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<boolean>
}
