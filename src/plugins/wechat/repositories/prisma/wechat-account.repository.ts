import { prisma } from '@/lib/prisma'
import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import type { WechatAccountRecord } from '@/plugins/wechat/repositories/interfaces/wechat-account.types'
import type { RepoContext } from '@/types/repo/repo-context'

function mapAccount(a: {
  id: string
  userId: string
  openid: string
  unionid: string | null
  sessionKey: string | null
  createdAt?: Date
  updatedAt?: Date
}): WechatAccountRecord {
  return {
    id: a.id,
    userId: a.userId,
    openid: a.openid,
    unionid: a.unionid,
    sessionKey: a.sessionKey,
  }
}

export function createPrismaWechatAccountRepository(): WechatAccountRepository {
  return {
    async findByUserId(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_user_id', userId: params.userId })

      const account = await prisma.wechatAccount.findUnique({ where: { userId: params.userId } })
      return account ? mapAccount(account) : null
    },

    async findByOpenid(ctx: RepoContext, params: { openid: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_openid' })

      const account = await prisma.wechatAccount.findUnique({ where: { openid: params.openid } })
      return account ? mapAccount(account) : null
    },

    async createAccount(ctx: RepoContext, params: {
      userId: string
      openid: string
      unionid?: string | null
      sessionKey?: string | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'create_account', userId: params.userId, openid: params.openid })

      const account = await prisma.wechatAccount.create({
        data: {
          userId: params.userId,
          openid: params.openid,
          unionid: params.unionid ?? null,
          sessionKey: params.sessionKey ?? null,
          sessionKeyUpdatedAt: params.sessionKey ? new Date() : null,
        },
      })
      return mapAccount(account)
    },

    /**
     * Function: updateSessionKey
     *
     * Description: 更新微信账号的 session_key
     *
     * Parameters:
     *     ctx(object): Repository 上下文
     *     params(object): 更新参数
     *     params.userId(string): 用户 ID
     *     params.sessionKey(string): 加密后的 session_key
     *
     * Returns:
     *     void(void): 无返回值
     */
    async updateSessionKey(ctx: RepoContext, params: {
      userId: string
      sessionKey: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_session_key', userId: params.userId })

      await prisma.wechatAccount.update({
        where: { userId: params.userId },
        data: {
          sessionKey: params.sessionKey,
          sessionKeyUpdatedAt: new Date(),
        },
      })
    },
  }
}
