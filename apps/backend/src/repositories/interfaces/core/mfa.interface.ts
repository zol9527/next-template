/**
 * MFA Repository Interface
 *
 * Description: MFA 数据访问接口，定义 MFA 相关的数据操作
 */

import type { RepoContext } from '@/types/repo/repo-context'

// ==================== 类型定义 ====================

/**
 * Type: MfaUserData
 *
 * Description: 用户的 MFA 数据
 */
export type MfaUserData = {
  userId: string
  mfaEnabled: boolean
  mfaSecret: string | null // 加密后的 TOTP 密钥
  mfaBackupCodes: string | null // bcrypt 哈希的备份码 JSON 数组
  mfaSetupAt: Date | null
  mfaLastVerifiedAt: Date | null
}

/**
 * Type: CreateMfaActionTokenParams
 *
 * Description: 创建 MFA 操作令牌的参数
 */
export type CreateMfaActionTokenParams = {
  tokenHash: string
  userId: string
  action: string
  resourceId: string | null
  expiresAt: Date
}

/**
 * Type: MfaActionTokenData
 *
 * Description: MFA 操作令牌数据
 */
export type MfaActionTokenData = {
  id: string
  tokenHash: string
  userId: string
  action: string
  resourceId: string | null
  usedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

/**
 * Type: CreateMfaAuditLogParams
 *
 * Description: 创建 MFA 审计日志的参数
 */
export type CreateMfaAuditLogParams = {
  userId: string
  action: string
  ip: string
  userAgent: string | null
  status: string
  details: unknown
}

/**
 * Type: MfaAuditLogData
 *
 * Description: MFA 审计日志数据
 */
export type MfaAuditLogData = {
  id: string
  userId: string
  action: string
  ip: string
  userAgent: string | null
  status: string
  details: unknown
  createdAt: Date
}

/**
 * Type: UpdateUserMfaParams
 *
 * Description: 更新用户 MFA 设置的参数
 */
export type UpdateUserMfaParams = {
  userId: string
  mfaEnabled: boolean
  mfaSecret?: string | null
  mfaBackupCodes?: string | null
  mfaSetupAt?: Date | null
  mfaLastVerifiedAt?: Date | null
}

/**
 * Type: PendingMfaSecret
 *
 * Description: 待验证的 MFA 密钥数据
 */
export type PendingMfaSecret = {
  secret: string
  backupCodes: string[]
}

// ==================== 接口定义 ====================

/**
 * Interface: MfaRepository
 *
 * Description: MFA 数据访问接口
 */
export interface MfaRepository {
  // ==================== 用户 MFA 数据 ====================

  /**
   * Function: getUserMfaData
   *
   * Description: 获取用户的 MFA 数据
   */
  getUserMfaData(ctx: RepoContext, params: { userId: string }): Promise<MfaUserData | null>

  /**
   * Function: updateUserMfa
   *
   * Description: 更新用户的 MFA 设置
   */
  updateUserMfa(ctx: RepoContext, params: UpdateUserMfaParams): Promise<void>

  /**
   * Function: disableUserMfa
   *
   * Description: 禁用用户的 MFA
   */
  disableUserMfa(ctx: RepoContext, params: { userId: string }): Promise<void>

  /**
   * Function: setPendingMfaSecret
   *
   * Description: 临时存储待验证的 MFA 密钥
   */
  setPendingMfaSecret(
    ctx: RepoContext,
    params: {
      userId: string
      secret: string
      backupCodes: string[]
    }
  ): Promise<void>

  /**
   * Function: getPendingMfaSecret
   *
   * Description: 获取待验证的 MFA 密钥
   */
  getPendingMfaSecret(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<PendingMfaSecret | null>

  /**
   * Function: clearPendingMfaSecret
   *
   * Description: 清除临时 MFA 密钥
   */
  clearPendingMfaSecret(
    ctx: RepoContext,
    params: { userId: string }
  ): Promise<void>

  // ==================== MFA 操作令牌 ====================

  /**
   * Function: createActionToken
   *
   * Description: 创建 MFA 操作令牌
   */
  createActionToken(ctx: RepoContext, params: CreateMfaActionTokenParams): Promise<void>

  /**
   * Function: getActionToken
   *
   * Description: 获取 MFA 操作令牌
   */
  getActionToken(ctx: RepoContext, params: { tokenHash: string }): Promise<MfaActionTokenData | null>

  /**
   * Function: consumeActionToken
   *
   * Description: 消耗 MFA 操作令牌（标记为已使用）
   */
  consumeActionToken(ctx: RepoContext, params: { tokenHash: string }): Promise<void>

  /**
   * Function: cleanupExpiredActionTokens
   *
   * Description: 清理过期的 MFA 操作令牌
   */
  cleanupExpiredActionTokens(ctx: RepoContext): Promise<number>

  // ==================== MFA 审计日志 ====================

  /**
   * Function: createAuditLog
   *
   * Description: 创建 MFA 审计日志
   */
  createAuditLog(ctx: RepoContext, params: CreateMfaAuditLogParams): Promise<void>

  /**
   * Function: getUserAuditLogs
   *
   * Description: 获取用户的 MFA 审计日志
   */
  getUserAuditLogs(ctx: RepoContext, params: {
    userId: string
    limit?: number
    offset?: number
    action?: string
  }): Promise<{ logs: MfaAuditLogData[]; total: number }>
}
