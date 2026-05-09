/**
 * Admin Repository (Prisma)
 *
 * Description: 管理员仓储的 Prisma 实现
 */

import { prisma } from '@/lib/prisma'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import * as bcrypt from 'bcryptjs'
import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminRepository, PendingMfaSecret } from '@/repositories/interfaces/core/admin-repository.interface'

// ==================== 常量定义 ====================

/** bcrypt 成本因子 */
const BCRYPT_COST_FACTOR = 12

/** 待验证 MFA 密钥过期时间（秒） */
const PENDING_SECRET_TTL = 600 // 10 分钟

/**
 * 说明：
 * - 之前使用进程内 Map 缓存 pending secret，在 next dev 热重载/模块重建时会丢失，导致 E2E flaky。
 * - 这里改为持久化到 users 表的 pending 字段中，并带过期时间。
 */

/**
 * Function: hashBackupCodes
 *
 * Description: 对备份码进行 bcrypt 哈希
 *
 * Parameters:
 *   codes(string[]): 明文备份码数组
 *
 * Returns:
 *   hashed(string): JSON 字符串，包含哈希后的备份码
 */
async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, BCRYPT_COST_FACTOR)),
  )
  return JSON.stringify(hashedCodes)
}

/**
 * Function: createPrismaAdminRepository
 *
 * Description: 创建 Prisma 管理员仓储
 *
 * Returns:
 *   repository(AdminRepository): AdminRepository 的 Prisma 实现
 */
export function createPrismaAdminRepository(): AdminRepository {
  return {
    /**
     * Function: setPendingMfaSecret
     *
     * Description: 临时存储待验证的 MFA 密钥
     */
    async setPendingMfaSecret(
      ctx: RepoContext,
      params: { adminId: string; secret: string; backupCodes: string[] },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'set_pending_mfa_secret', adminId: params.adminId })

      const encryptedPendingSecret = MfaEncryption.encryptSecret(params.secret)
      const expiresAt = new Date(Date.now() + PENDING_SECRET_TTL * 1000)

      await prisma.user.update({
        where: { id: params.adminId },
        data: {
          mfaPendingSecret: encryptedPendingSecret,
          mfaPendingBackupCodes: JSON.stringify(params.backupCodes),
          mfaPendingExpiresAt: expiresAt,
        },
      })
    },

    /**
     * Function: getPendingMfaSecret
     *
     * Description: 获取待验证的 MFA 密钥
     */
    async getPendingMfaSecret(
      ctx: RepoContext,
      params: { adminId: string },
    ): Promise<PendingMfaSecret | null> {
      const { logger } = ctx
      logger.debug({ action: 'get_pending_mfa_secret', adminId: params.adminId })

      const user = await prisma.user.findUnique({
        where: { id: params.adminId },
        select: {
          mfaPendingSecret: true,
          mfaPendingBackupCodes: true,
          mfaPendingExpiresAt: true,
        },
      })

      if (!user?.mfaPendingSecret || !user.mfaPendingExpiresAt) {
        return null
      }

      // 过期则清理
      if (user.mfaPendingExpiresAt.getTime() < Date.now()) {
        await prisma.user.update({
          where: { id: params.adminId },
          data: {
            mfaPendingSecret: null,
            mfaPendingBackupCodes: null,
            mfaPendingExpiresAt: null,
          },
        })
        return null
      }

      let secret: string
      try {
        secret = MfaEncryption.decryptSecret(user.mfaPendingSecret)
      } catch {
        // 无法解密则清理，要求重新生成
        await prisma.user.update({
          where: { id: params.adminId },
          data: {
            mfaPendingSecret: null,
            mfaPendingBackupCodes: null,
            mfaPendingExpiresAt: null,
          },
        })
        return null
      }

      let backupCodes: unknown = null
      try {
        backupCodes = user.mfaPendingBackupCodes ? JSON.parse(user.mfaPendingBackupCodes) : null
      } catch {
        backupCodes = null
      }

      if (!Array.isArray(backupCodes) || !backupCodes.every(c => typeof c === 'string')) {
        await prisma.user.update({
          where: { id: params.adminId },
          data: {
            mfaPendingSecret: null,
            mfaPendingBackupCodes: null,
            mfaPendingExpiresAt: null,
          },
        })
        return null
      }

      return { secret, backupCodes }
    },

    /**
     * Function: clearPendingMfaSecret
     *
     * Description: 清除临时 MFA 密钥
     */
    async clearPendingMfaSecret(
      ctx: RepoContext,
      params: { adminId: string },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'clear_pending_mfa_secret', adminId: params.adminId })

      await prisma.user.update({
        where: { id: params.adminId },
        data: {
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    },

    /**
     * Function: enableMfa
     *
     * Description: 启用 MFA
     */
    async enableMfa(
      ctx: RepoContext,
      params: { adminId: string; type: 'totp'; secret: string; backupCodes: string[] },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'enable_admin_mfa', adminId: params.adminId, type: params.type })

      // 加密 TOTP 密钥
      const encryptedSecret = MfaEncryption.encryptSecret(params.secret)

      // 哈希备份码
      const hashedBackupCodes = await hashBackupCodes(params.backupCodes)

      await prisma.user.update({
        where: { id: params.adminId },
        data: {
          mfaEnabled: true,
          mfaSecret: encryptedSecret,
          mfaBackupCodes: hashedBackupCodes,
          mfaSetupAt: new Date(),
          mfaLastVerifiedAt: new Date(),
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    },

    /**
     * Function: disableMfa
     *
     * Description: 禁用 MFA
     */
    async disableMfa(
      ctx: RepoContext,
      params: { adminId: string },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'disable_admin_mfa', adminId: params.adminId })

      await prisma.user.update({
        where: { id: params.adminId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          mfaSetupAt: null,
          mfaLastVerifiedAt: null,
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    },

    /**
     * Function: updateBackupCodes
     *
     * Description: 更新备份码
     */
    async updateBackupCodes(
      ctx: RepoContext,
      params: { adminId: string; backupCodes: string[] },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'update_admin_backup_codes', adminId: params.adminId })

      // 哈希新备份码
      const hashedBackupCodes = await hashBackupCodes(params.backupCodes)

      await prisma.user.update({
        where: { id: params.adminId },
        data: {
          mfaBackupCodes: hashedBackupCodes,
        },
      })
    },
  }
}

/**
 * 默认导出工厂函数
 */
export default createPrismaAdminRepository
