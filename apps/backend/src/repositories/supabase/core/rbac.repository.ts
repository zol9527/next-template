import type { Grant } from '@/config/access'
import { isValidScope } from '@/lib/auth/access-utils'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { RoleDto } from '@/contracts/dtos/rbac'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const ROLE_SELECT = 'id,name,description,created_at'

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const record = getRecord(item)
    return record ? [record] : []
  }) : []
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isGrantAction(value: string): value is Grant['action'] {
  return value === 'read' || value === 'write' || value === 'execute'
}

function mapGrantRow(logger: RepoContext['logger'], row: Record<string, unknown>): Grant | null {
  const action = getString(row.action)
  const scope = getString(row.scope)

  if (!action || !isGrantAction(action)) {
    logger.warn({ action: 'rbac.invalid_grant_action', grantAction: action, scope }, '检测到无效的 RBAC action，已跳过')
    return null
  }

  if (!scope || !isValidScope(scope)) {
    logger.warn({ action: 'rbac.invalid_grant_scope', grantAction: action, scope }, '检测到无效的 RBAC scope，已跳过')
    return null
  }

  return { action, scope }
}

function normalizeGrants(grants: Grant[]): Grant[] {
  const grantMap = new Map<string, Grant>()

  for (const grant of grants) {
    grantMap.set(`${grant.action}:${grant.scope}`, grant)
  }

  return Array.from(grantMap.values())
}

function mapRole(row: Record<string, unknown>): RoleDto {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
  }
}

/**
Function: createSupabaseRbacRepository

Description: 创建基于 Supabase（Service Role）的 RBAC 仓储实现

Parameters:

Returns:
    repository(RbacRepository): RbacRepository 的 Supabase 实现
*/
export function createSupabaseRbacRepository(): RbacRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getRolesForUser(ctx: RepoContext, params: { userId: string }): Promise<RoleDto[]> {
      const { logger } = ctx
      logger.info({ action: 'get_roles_for_user', userId: params.userId })

      const { data, error } = await supabase
        .from('user_roles')
        .select(`roles:roles!inner(${ROLE_SELECT})`)
        .eq('user_id', params.userId)

      if (error) throw error

      return (
        (data ?? []).map((row: Record<string, unknown>) => {
          const roleData = row.roles as Record<string, unknown>
          return mapRole(roleData)
        })
      )
    },

    async getGrantsForUser(ctx: RepoContext, params: { userId: string }): Promise<Grant[]> {
      const { logger } = ctx
      logger.info({ action: 'get_grants_for_user', userId: params.userId })

      const { data, error } = await supabase
        .from('user_roles')
        .select('roles!inner(role_access!inner(action,scope))')
        .eq('user_id', params.userId)

      if (error) throw error

      const grantMap = new Map<string, Grant>()

      for (const row of getRecordArray(data)) {
        const role = getRecord(row.roles)
        if (!role) continue

        for (const roleAccessRow of getRecordArray(role.role_access)) {
          const grant = mapGrantRow(logger, roleAccessRow)
          if (!grant) continue
          grantMap.set(`${grant.action}:${grant.scope}`, grant)
        }
      }

      return Array.from(grantMap.values())
    },

    async listRoles(ctx: RepoContext): Promise<RoleDto[]> {
      const { logger } = ctx
      logger.info({ action: 'list_roles' })

      const { data, error } = await supabase.from('roles').select(ROLE_SELECT).order('name', { ascending: true })
      if (error) throw error
      return (data ?? []).map((r) => mapRole(r as unknown as Record<string, unknown>))
    },

    async getGrantsForRole(ctx: RepoContext, params: { roleId: string }): Promise<Grant[]> {
      const { logger } = ctx
      logger.info({ action: 'get_grants_for_role', roleId: params.roleId })

      const { data, error } = await supabase
        .from('role_access')
        .select('action,scope')
        .eq('role_id', params.roleId)

      if (error) throw error

      return getRecordArray(data).flatMap((row) => {
        const grant = mapGrantRow(logger, row)
        return grant ? [grant] : []
      })
    },

    async setRoleGrants(ctx: RepoContext, params: { roleId: string; grants: Grant[] }): Promise<void> {
      const { logger } = ctx
      const normalizedGrants = normalizeGrants(params.grants)

      logger.info({ action: 'set_role_grants', roleId: params.roleId, count: normalizedGrants.length })

      const { error: deleteError } = await supabase.from('role_access').delete().eq('role_id', params.roleId)
      if (deleteError) throw deleteError

      if (normalizedGrants.length === 0) {
        return
      }

      const { error: insertError } = await supabase.from('role_access').insert(
        normalizedGrants.map((grant) => ({
          role_id: params.roleId,
          action: grant.action,
          scope: grant.scope,
        }))
      )

      if (insertError) throw insertError
    },

    async getRoleIdByName(ctx: RepoContext, params: { roleName: string }): Promise<string | null> {
      const { logger } = ctx
      logger.info({ action: 'get_role_id_by_name', roleName: params.roleName })

      const { data, error } = await supabase.from('roles').select('id').eq('name', params.roleName).maybeSingle()
      if (error) throw error
      return data?.id ?? null
    },

    async assignRoleToUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'assign_role_to_user', userId: params.userId, roleId: params.roleId })

      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: params.userId, role_id: params.roleId }, { onConflict: 'user_id,role_id' })
      if (error) throw error
    },

    async removeRoleFromUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'remove_role_from_user', userId: params.userId, roleId: params.roleId })

      const { error } = await supabase.from('user_roles').delete().eq('user_id', params.userId).eq('role_id', params.roleId)
      if (error) throw error
    },

    async setRolesForUser(ctx: RepoContext, params: { userId: string; roleIds: string[] }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'set_roles_for_user', userId: params.userId, count: params.roleIds.length })

      // 删除用户所有角色
      await supabase.from('user_roles').delete().eq('user_id', params.userId)

      // 添加新角色
      if (params.roleIds.length > 0) {
        const rows = params.roleIds.map((roleId) => ({ user_id: params.userId, role_id: roleId }))
        const { error } = await supabase.from('user_roles').insert(rows)
        if (error) throw error
      }
    },

    async createRole(ctx: RepoContext, params: { name: string; description?: string }): Promise<RoleDto> {
      const { logger } = ctx
      logger.info({ action: 'create_role', name: params.name })

      const { data, error } = await supabase
        .from('roles')
        .insert({ name: params.name, description: params.description ?? null })
        .select(ROLE_SELECT)
        .single()

      if (error) throw error
      return mapRole(data as unknown as Record<string, unknown>)
    },

    async deleteRole(ctx: RepoContext, params: { roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'delete_role', roleId: params.roleId })

      const { error } = await supabase.from('roles').delete().eq('id', params.roleId)
      if (error) throw error
    },

    async countUsersWithRole(ctx: RepoContext, params: { roleId: string }): Promise<number> {
      const { logger } = ctx
      logger.info({ action: 'count_users_with_role', roleId: params.roleId })

      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', params.roleId)

      if (error) throw error
      return count ?? 0
    },
  }
}
