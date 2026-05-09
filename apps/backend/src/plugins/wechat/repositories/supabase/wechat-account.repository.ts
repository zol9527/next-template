import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'
import type { WechatAccountRecord } from '@/plugins/wechat/repositories/interfaces/wechat-account.types'

const ACCOUNT_SELECT = 'id,user_id,openid,unionid,session_key,session_key_updated_at,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function mapAccount(row: Record<string, unknown>): WechatAccountRecord {
  return {
    id: getString(row, 'id')!,
    userId: getString(row, 'user_id')!,
    openid: getString(row, 'openid')!,
    unionid: getString(row, 'unionid'),
    sessionKey: getString(row, 'session_key'),
  }
}

/**
Function: createSupabaseWechatAccountRepository

Description: 创建基于 Supabase（Service Role）的微信账户仓储实现

Parameters:

Returns:
    repository(WechatAccountRepository): WechatAccountRepository 的 Supabase 实现
*/
export function createSupabaseWechatAccountRepository(): WechatAccountRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async findByUserId(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_user_id', userId: params.userId })

      const { data, error } = await supabase.from('wechat_accounts').select(ACCOUNT_SELECT).eq('user_id', params.userId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapAccount(data as unknown as Record<string, unknown>)
    },

    async findByOpenid(ctx: RepoContext, params: { openid: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_openid' })

      const { data, error } = await supabase.from('wechat_accounts').select(ACCOUNT_SELECT).eq('openid', params.openid).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapAccount(data as unknown as Record<string, unknown>)
    },

    async createAccount(ctx: RepoContext, params: {
      userId: string
      openid: string
      unionid: string | null
      sessionKey?: string | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'create_account', userId: params.userId, openid: params.openid })

      const insertData: Record<string, unknown> = {
        user_id: params.userId,
        openid: params.openid,
        unionid: params.unionid,
      }

      if (params.sessionKey) {
        insertData.session_key = params.sessionKey
        insertData.session_key_updated_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('wechat_accounts')
        .insert(insertData)
        .select(ACCOUNT_SELECT)
        .single()

      if (error) throw error
      return mapAccount(data as unknown as Record<string, unknown>)
    },

    async updateSessionKey(ctx: RepoContext, params: {
      userId: string
      sessionKey: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_session_key', userId: params.userId })

      const { error } = await supabase
        .from('wechat_accounts')
        .update({
          session_key: params.sessionKey,
          session_key_updated_at: new Date().toISOString(),
        })
        .eq('user_id', params.userId)

      if (error) throw error
    },
  }
}
