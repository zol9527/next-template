import type { RepoContext } from '@/types/repo/repo-context'
import type { WechatAccountRecord } from '@/plugins/wechat/repositories/interfaces/wechat-account.types'

export interface WechatAccountRepository {
  findByOpenid(ctx: RepoContext, params: { openid: string }): Promise<WechatAccountRecord | null>
  findByUserId(ctx: RepoContext, params: { userId: string }): Promise<WechatAccountRecord | null>
  createAccount(ctx: RepoContext, params: {
    userId: string
    openid: string
    unionid: string | null
    sessionKey?: string | null
  }): Promise<WechatAccountRecord>
  updateSessionKey(ctx: RepoContext, params: {
    userId: string
    sessionKey: string
  }): Promise<void>
}
