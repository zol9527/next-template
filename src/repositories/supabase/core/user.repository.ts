import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { AdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { AdminUserListItem, AdminUserListQuery } from '@/contracts/dtos/admin/users.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const USER_SELECT =
  'id,username,nickname,email,phone,avatar_url,user_type,password_hash,password_updated_at,status,can_upload,failed_login_count,locked_until'

const USER_LIST_SELECT = 'id,username,nickname,email,phone,avatar_url,user_type,status,can_upload,locked_until,created_at'

const USER_ADMIN_DETAIL_SELECT =
  'id,username,nickname,email,phone,avatar_url,user_type,status,can_upload,failed_login_count,locked_until,password_updated_at,mfa_enabled,mfa_secret,mfa_backup_codes,mfa_setup_at,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getBooleanOrDefault(row: Record<string, unknown>, key: string, defaultValue = false): boolean {
  const value = row[key]
  return typeof value === 'boolean' ? value : defaultValue
}

function getNumberOrZero(row: Record<string, unknown>, key: string): number {
  const value = row[key]
  return typeof value === 'number' && !isNaN(value) ? value : 0
}

function mapUser(row: Record<string, unknown>): AdminUserDetail {
  const id = getString(row, 'id')
  if (!id) {
    throw new Error('Invalid user row: missing id')
  }

  return {
    id,
    username: getString(row, 'username'),
    nickname: getString(row, 'nickname'),
    email: getString(row, 'email'),
    phone: getString(row, 'phone'),
    avatarUrl: getString(row, 'avatar_url'),
    userType: getString(row, 'user_type'),
    status: getString(row, 'status'),
    canUpload: getBooleanOrDefault(row, 'can_upload'),
    passwordHash: getString(row, 'password_hash'),
    failedLoginCount: getNumberOrZero(row, 'failed_login_count'),
    lockedUntil: getString(row, 'locked_until'),
    passwordUpdatedAt: getString(row, 'password_updated_at'),
    // MFA 相关字段
    mfaEnabled: getBooleanOrDefault(row, 'mfa_enabled'),
    mfaSecret: getString(row, 'mfa_secret'),
    mfaBackupCodes: getString(row, 'mfa_backup_codes'),
    mfaSetupAt: getString(row, 'mfa_setup_at'),
    createdAt: getString(row, 'created_at') ?? new Date().toISOString(),
    updatedAt: getString(row, 'updated_at') ?? new Date().toISOString(),
  }
}

function mapUserListItem(row: Record<string, unknown>): AdminUserListItem {
  const id = getString(row, 'id')
  const createdAt = getString(row, 'created_at')
  if (!id || !createdAt) {
    throw new Error('Invalid user row: missing id/created_at')
  }

  return {
    id,
    username: getString(row, 'username'),
    nickname: getString(row, 'nickname'),
    email: getString(row, 'email'),
    phone: getString(row, 'phone'),
    avatarUrl: getString(row, 'avatar_url'),
    userType: getString(row, 'user_type'),
    status: getString(row, 'status'),
    canUpload: getBooleanOrDefault(row, 'can_upload'),
    lockedUntil: getString(row, 'locked_until'),
    createdAt,
  }
}

function normalizeSearchKeyword(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().slice(0, 100)
  if (!trimmed) return undefined
  const cleaned = trimmed
    .replace(/[^\p{L}\p{N}@.+\- _]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length ? cleaned : undefined
}

function normalizeStatus(raw?: string): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().slice(0, 32)
  if (!trimmed) return undefined
  const cleaned = trimmed.replace(/[^a-zA-Z0-9_\-]/g, '')
  return cleaned.length ? cleaned : undefined
}

export function createSupabaseUserRepository(): UserRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getUserById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_id', userId: params.userId })

      const { data, error } = await supabase
        .from('users')
        .select(USER_SELECT)
        .eq('id', params.userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapUser(data)
    },

    async getUserByIdentifier(ctx: RepoContext, params: { identifier: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_identifier', identifier: params.identifier })

      const { data, error } = await supabase
        .from('users')
        .select(USER_SELECT)
        .or(`username.eq.${params.identifier},email.eq.${params.identifier},phone.eq.${params.identifier}`)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapUser(data)
    },

    async getUserAdminById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_admin_by_id', userId: params.userId })

      const { data, error } = await supabase
        .from('users')
        .select(USER_ADMIN_DETAIL_SELECT)
        .eq('id', params.userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapUser(data as unknown as Record<string, unknown>)
    },

    async updateUserStatus(ctx: RepoContext, params: { userId: string; status: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_user_status', userId: params.userId, status: params.status })

      const { error } = await supabase
        .from('users')
        .update({ status: params.status })
        .eq('id', params.userId)

      if (error) throw error
    },

    async updateUploadPermission(ctx: RepoContext, params: { userId: string; canUpload: boolean }) {
      const { logger } = ctx
      logger.info({ action: 'update_upload_permission', userId: params.userId, canUpload: params.canUpload })

      const { error } = await supabase
        .from('users')
        .update({ can_upload: params.canUpload })
        .eq('id', params.userId)

      if (error) throw error
    },

    async listUsers(ctx: RepoContext, params: AdminUserListQuery): Promise<{ items: AdminUserListItem[]; total: number; offset: number; limit: number; nextCursor: string | null }> {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 50))
      const safeOffset = params.offset ?? 0

      logger.info({ action: 'list_users', limit: safeLimit, offset: safeOffset })

      const keyword = normalizeSearchKeyword(params.keyword)
      const status = normalizeStatus(params.status)

      let query = supabase
        .from('users')
        .select(USER_LIST_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (keyword) {
        const pattern = `%${keyword}%`
        query = query.or(
          `username.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
        )
      }

      const from = safeOffset
      const to = safeOffset + safeLimit - 1
      const { data, error, count } = await query.range(from, to)

      if (error) throw error

      return {
        items: (data ?? []).map((r) => mapUserListItem(r as unknown as Record<string, unknown>)),
        total: count ?? 0,
        offset: safeOffset,
        limit: safeLimit,
        nextCursor: (data?.length ?? 0) === safeLimit ? (data?.[data.length - 1]?.created_at as string) ?? null : null,
      }
    },

    async listUsersWithCursor(ctx: RepoContext, params: { limit: number; cursor: string; keyword: string | undefined; status: string | undefined }): Promise<{ items: AdminUserListItem[]; nextCursor: string | null; totalCount: number }> {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 50))

      logger.info({ action: 'list_users_cursor', limit: safeLimit, cursor: params.cursor })

      const keyword = normalizeSearchKeyword(params.keyword)
      const status = normalizeStatus(params.status)

      let query = supabase
        .from('users')
        .select(USER_LIST_SELECT)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (keyword) {
        const pattern = `%${keyword}%`
        query = query.or(
          `username.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
        )
      }

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error, count } = await query.limit(safeLimit)

      if (error) throw error

      return {
        items: (data ?? []).map((r) => mapUserListItem(r as unknown as Record<string, unknown>)),
        nextCursor: (data?.length ?? 0) === safeLimit ? (data?.[data.length - 1]?.created_at as string) ?? null : null,
        totalCount: count ?? 0,
      }
    },

    async resetLoginFailures(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'reset_login_failures', userId: params.userId })

      const { error } = await supabase
        .from('users')
        .update({ failed_login_count: 0, locked_until: null })
        .eq('id', params.userId)

      if (error) throw error
    },

    async recordLoginFailure(ctx: RepoContext, params: { userId: string; failedLoginCount: number; lockedUntil: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'record_login_failure', userId: params.userId, failedCount: params.failedLoginCount })

      const { error } = await supabase
        .from('users')
        .update({
          failed_login_count: params.failedLoginCount,
          locked_until: params.lockedUntil,
        })
        .eq('id', params.userId)

      if (error) throw error
    },

    async createUserForWechat(ctx: RepoContext, params: { input?: { username?: string | null; avatarUrl?: string | null; userType?: string | null } }) {
      const { logger } = ctx
      logger.info({ action: 'create_user_for_wechat' })

      const { data, error } = await supabase
        .from('users')
        .insert({
          status: 'active',
          username: params.input?.username ?? null,
          avatar_url: params.input?.avatarUrl ?? null,
          user_type: params.input?.userType ?? null,
        })
        .select(USER_SELECT)
        .single()

      if (error) throw error
      return mapUser(data)
    },

    async updateWechatProfile(ctx: RepoContext, params: { userId: string; username?: string; avatarUrl?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_wechat_profile', userId: params.userId })

      const data: Record<string, string> = {}
      if (params.username) data.username = params.username
      if (params.avatarUrl) data.avatar_url = params.avatarUrl

      if (Object.keys(data).length === 0) return

      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', params.userId)

      if (error) throw error
    },

    async getGlobalStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_global_stats' })

      const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true })
      if (error) throw error
      return { totalUsers: count ?? 0 }
    },

    async findByEmail(ctx: RepoContext, params: { email: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_email', email: params.email })

      const { data, error } = await supabase
        .from('users')
        .select(USER_SELECT)
        .eq('email', params.email)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapUser(data)
    },

    async updateUserProfile(
      ctx: RepoContext,
      params: {
        userId: string
        username: string
        email: string
        phone?: string | null
        avatarUrl?: string | null
      }
    ) {
      const { logger } = ctx
      logger.info({ action: 'update_user_profile', userId: params.userId })

      const { data, error } = await supabase
        .from('users')
        .update({
          username: params.username,
          email: params.email,
          phone: params.phone ?? null,
          avatar_url: params.avatarUrl ?? null,
        })
        .eq('id', params.userId)
        .select(USER_SELECT)
        .single()

      if (error) throw error
      return mapUser(data)
    },

    async updatePassword(ctx: RepoContext, params: { userId: string; passwordHash: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_password', userId: params.userId })

      const { error } = await supabase
        .from('users')
        .update({
          password_hash: params.passwordHash,
          password_updated_at: new Date().toISOString(),
        })
        .eq('id', params.userId)

      if (error) throw error
    },

    /**
     * Function: updateWechatDisplayProfile
     *
     * Description: 更新微信用户展示资料（昵称和头像）
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.nickname(string): 用户昵称（展示名称，不唯一）
     *   params.avatarUrl(string): 头像 URL
     *
     * Returns:
     *   void: 无返回值
     */
    async updateWechatDisplayProfile(
      ctx: RepoContext,
      params: { userId: string; nickname: string; avatarUrl: string }
    ) {
      const { logger } = ctx
      logger.info({ action: 'update_wechat_display_profile', userId: params.userId })

      const { error } = await supabase
        .from('users')
        .update({
          nickname: params.nickname,
          avatar_url: params.avatarUrl,
        })
        .eq('id', params.userId)

      if (error) throw error
    },

    /**
     * Function: updateUserPhone
     *
     * Description: 更新用户手机号
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.phone(string): 手机号
     *
     * Returns:
     *   void: 无返回值
     */
    async updateUserPhone(ctx: RepoContext, params: { userId: string; phone: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_user_phone', userId: params.userId })

      const { error } = await supabase
        .from('users')
        .update({
          phone: params.phone,
        })
        .eq('id', params.userId)

      if (error) throw error
    },
  }
}
