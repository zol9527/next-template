/**
 * MFA Repository (Prisma)
 *
 * Description: MFA 数据访问的 Prisma 实现
 */

import { prisma } from '@/lib/prisma'
import * as Prisma from '@/lib/prisma/generated/prisma'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  CreateMfaActionTokenParams,
  CreateMfaAuditLogParams,
  MfaActionTokenData,
  MfaAuditLogData,
  MfaRepository,
  MfaUserData,
  PendingMfaSecret,
  UpdateUserMfaParams,
} from '@/repositories/interfaces/core/mfa.interface'

/** 待验证 MFA 密钥过期时间（秒） */
const PENDING_SECRET_TTL = 600 // 10 分钟

/**
 * Function: createPrismaMfaRepository
 *
 * Description: 创建 Prisma MFA Repository
 */
export function createPrismaMfaRepository(): MfaRepository {
  return {
    // ==================== 用户 MFA 数据 ====================

    /**
     * Function: getUserMfaData
     *
     * Description: 获取用户的 MFA 数据
     */
    async getUserMfaData(ctx: RepoContext, params: { userId: string }): Promise<MfaUserData | null> {
      const { logger } = ctx
      logger.info({ action: 'get_user_mfa_data', userId: params.userId })

      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          mfaEnabled: true,
          mfaSecret: true,
          mfaBackupCodes: true,
          mfaSetupAt: true,
          mfaLastVerifiedAt: true,
        },
      })

      if (!user) {
        return null
      }

      return {
        userId: user.id,
        mfaEnabled: user.mfaEnabled,
        mfaSecret: user.mfaSecret,
        mfaBackupCodes: user.mfaBackupCodes,
        mfaSetupAt: user.mfaSetupAt,
        mfaLastVerifiedAt: user.mfaLastVerifiedAt,
      }
    },

    /**
     * Function: updateUserMfa
     *
     * Description: 更新用户的 MFA 设置
     */
    async updateUserMfa(ctx: RepoContext, params: UpdateUserMfaParams): Promise<void> {
      const { logger } = ctx
      const { userId, mfaEnabled, mfaSecret, mfaBackupCodes, mfaSetupAt, mfaLastVerifiedAt } = params

      logger.info({ action: 'update_user_mfa', userId, mfaEnabled })

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled,
          ...(mfaSecret !== undefined && { mfaSecret }),
          ...(mfaBackupCodes !== undefined && { mfaBackupCodes }),
          ...(mfaSetupAt !== undefined && { mfaSetupAt }),
          ...(mfaLastVerifiedAt !== undefined && { mfaLastVerifiedAt }),
        },
      })
    },

    /**
     * Function: disableUserMfa
     *
     * Description: 禁用用户的 MFA
     */
    async disableUserMfa(ctx: RepoContext, params: { userId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'disable_user_mfa', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
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
     * Function: setPendingMfaSecret
     *
     * Description: 临时存储待验证的 MFA 密钥
     */
    async setPendingMfaSecret(
      ctx: RepoContext,
      params: { userId: string; secret: string; backupCodes: string[] },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'set_pending_mfa_secret', userId: params.userId })

      const encryptedPendingSecret = MfaEncryption.encryptSecret(params.secret)
      const expiresAt = new Date(Date.now() + PENDING_SECRET_TTL * 1000)

      await prisma.user.update({
        where: { id: params.userId },
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
      params: { userId: string },
    ): Promise<PendingMfaSecret | null> {
      const { logger } = ctx
      logger.debug({ action: 'get_pending_mfa_secret', userId: params.userId })

      const user = await prisma.user.findUnique({
        where: { id: params.userId },
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
          where: { id: params.userId },
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
          where: { id: params.userId },
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
          where: { id: params.userId },
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
      params: { userId: string },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'clear_pending_mfa_secret', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
        data: {
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    },

    // ==================== MFA 操作令牌 ====================

    /**
     * Function: createActionToken
     *
     * Description: 创建 MFA 操作令牌
     */
    async createActionToken(ctx: RepoContext, params: CreateMfaActionTokenParams): Promise<void> {
      const { logger } = ctx
      logger.info({ actionType: 'create_mfa_action_token', userId: params.userId, action: params.action })

      await prisma.mfaActionToken.create({
        data: {
          tokenHash: params.tokenHash,
          userId: params.userId,
          action: params.action,
          resourceId: params.resourceId,
          expiresAt: params.expiresAt,
        },
      })
    },

    /**
     * Function: getActionToken
     *
     * Description: 获取 MFA 操作令牌
     */
    async getActionToken(ctx: RepoContext, params: { tokenHash: string }): Promise<MfaActionTokenData | null> {
      const { logger } = ctx
      logger.debug({ action: 'get_mfa_action_token', tokenHash: params.tokenHash.slice(0, 8) + '...' })

      const token = await prisma.mfaActionToken.findUnique({
        where: { tokenHash: params.tokenHash },
      })

      if (!token) {
        return null
      }

      return {
        id: token.id,
        tokenHash: token.tokenHash,
        userId: token.userId,
        action: token.action,
        resourceId: token.resourceId,
        usedAt: token.usedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      }
    },

    /**
     * Function: consumeActionToken
     *
     * Description: 消耗 MFA 操作令牌（标记为已使用）
     */
    async consumeActionToken(ctx: RepoContext, params: { tokenHash: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'consume_mfa_action_token', tokenHash: params.tokenHash.slice(0, 8) + '...' })

      await prisma.mfaActionToken.update({
        where: { tokenHash: params.tokenHash },
        data: { usedAt: new Date() },
      })
    },

    /**
     * Function: cleanupExpiredActionTokens
     *
     * Description: 清理过期的 MFA 操作令牌
     */
    async cleanupExpiredActionTokens(ctx: RepoContext): Promise<number> {
      const { logger } = ctx
      logger.info({ action: 'cleanup_expired_mfa_action_tokens' })

      const now = new Date()

      // 删除已使用且过期的令牌，或未使用但过期超过 10 分钟的令牌
      const result = await prisma.mfaActionToken.deleteMany({
        where: {
          OR: [
            {
              usedAt: { not: null },
              expiresAt: { lt: now },
            },
            {
              usedAt: null,
              expiresAt: { lt: new Date(now.getTime() - 10 * 60 * 1000) },
            },
          ],
        },
      })

      logger.info({ action: 'cleanup_expired_mfa_action_tokens_result', count: result.count })
      return result.count
    },

    // ==================== MFA 审计日志 ====================

    /**
     * Function: createAuditLog
     *
     * Description: 创建 MFA 审计日志
     */
    async createAuditLog(ctx: RepoContext, params: CreateMfaAuditLogParams): Promise<void> {
      const { logger } = ctx
      logger.debug({ actionType: 'create_mfa_audit_log', userId: params.userId, mfaAction: params.action })

      await prisma.mfaAuditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          ip: params.ip,
          userAgent: params.userAgent,
          status: params.status,
          details: params.details as Prisma.Prisma.InputJsonValue,
        },
      })
    },

    /**
     * Function: getUserAuditLogs
     *
     * Description: 获取用户的 MFA 审计日志
     */
    async getUserAuditLogs(ctx: RepoContext, params: {
      userId: string
      limit?: number
      offset?: number
      action?: string
    }): Promise<{ logs: MfaAuditLogData[]; total: number }> {
      const { logger } = ctx
      const { userId, limit = 50, offset = 0, action } = params

      logger.debug({ action: 'get_user_audit_logs', userId, limit, offset })

      const where = {
        userId,
        ...(action && { action }),
      }

      const [logs, total] = await Promise.all([
        prisma.mfaAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.mfaAuditLog.count({ where }),
      ])

      return {
        logs: logs.map(log => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          ip: log.ip,
          userAgent: log.userAgent,
          status: log.status,
          details: log.details,
          createdAt: log.createdAt,
        })),
        total,
      }
    },
  }
}

/**
 * 默认导出工厂函数
 */
export default createPrismaMfaRepository
