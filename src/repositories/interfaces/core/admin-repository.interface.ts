/**
 * Admin Repository Interface
 *
 * Description: 管理员仓储接口，定义管理员数据访问操作
 */

import type { RepoContext } from '@/types/repo/repo-context'

/**
 * Type: PendingMfaSecret
 *
 * Description: 待验证的 MFA 密钥数据
 */
export interface PendingMfaSecret {
  secret: string
  backupCodes: string[]
}

/**
 * Interface: AdminRepository
 *
 * Description: 管理员仓储接口
 */
export interface AdminRepository {
  /**
   * Function: setPendingMfaSecret
   *
   * Description: 临时存储待验证的 MFA 密钥
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *   params.secret(string): TOTP 密钥
   *   params.backupCodes(string[]): 备份码列表
   *
   * Returns:
   *   void: 无返回值
   */
  setPendingMfaSecret(
    ctx: RepoContext,
    params: {
      adminId: string
      secret: string
      backupCodes: string[]
    }
  ): Promise<void>

  /**
   * Function: getPendingMfaSecret
   *
   * Description: 获取待验证的 MFA 密钥
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *
   * Returns:
   *   secret(PendingMfaSecret | null): 包含 secret 和 backupCodes 的对象，不存在则返回 null
   */
  getPendingMfaSecret(
    ctx: RepoContext,
    params: { adminId: string }
  ): Promise<PendingMfaSecret | null>

  /**
   * Function: clearPendingMfaSecret
   *
   * Description: 清除临时 MFA 密钥
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *
   * Returns:
   *   void: 无返回值
   */
  clearPendingMfaSecret(
    ctx: RepoContext,
    params: { adminId: string }
  ): Promise<void>

  /**
   * Function: enableMfa
   *
   * Description: 启用 MFA
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *   params.type('totp'): MFA 类型
   *   params.secret(string): 加密后的 TOTP 密钥
   *   params.backupCodes(string[]): 备份码列表
   *
   * Returns:
   *   void: 无返回值
   */
  enableMfa(
    ctx: RepoContext,
    params: {
      adminId: string
      type: 'totp'
      secret: string
      backupCodes: string[]
    }
  ): Promise<void>

  /**
   * Function: disableMfa
   *
   * Description: 禁用 MFA
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *
   * Returns:
   *   void: 无返回值
   */
  disableMfa(
    ctx: RepoContext,
    params: { adminId: string }
  ): Promise<void>

  /**
   * Function: updateBackupCodes
   *
   * Description: 更新备份码
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.adminId(string): 管理员 ID
   *   params.backupCodes(string[]): 新的备份码列表
   *
   * Returns:
   *   void: 无返回值
   */
  updateBackupCodes(
    ctx: RepoContext,
    params: { adminId: string; backupCodes: string[] }
  ): Promise<void>
}
