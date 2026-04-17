import { prisma } from '@/lib/prisma'
import type { Grant } from '@/config/access'
import { isValidScope } from '@/lib/auth/access-utils'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { RoleDto } from '@/contracts/dtos/rbac'
import type { RepoContext } from '@/types/repo/repo-context'

type GrantRow = {
  action: string
  scope: string
}

function isGrantAction(value: string): value is Grant['action'] {
  return value === 'read' || value === 'write' || value === 'execute'
}

function mapGrantRows(logger: RepoContext['logger'], rows: GrantRow[]): Grant[] {
  return rows.flatMap((row) => {
    if (!isGrantAction(row.action)) {
      logger.warn({ action: 'rbac.invalid_grant_action', grantAction: row.action, scope: row.scope }, '检测到无效的 RBAC action，已跳过')
      return []
    }

    if (!isValidScope(row.scope)) {
      logger.warn({ action: 'rbac.invalid_grant_scope', grantAction: row.action, scope: row.scope }, '检测到无效的 RBAC scope，已跳过')
      return []
    }

    return [{ action: row.action, scope: row.scope }]
  })
}

function normalizeGrants(grants: Grant[]): Grant[] {
  const grantMap = new Map<string, Grant>()

  for (const grant of grants) {
    grantMap.set(`${grant.action}:${grant.scope}`, grant)
  }

  return Array.from(grantMap.values())
}

export function createPrismaRbacRepository(): RbacRepository {
  return {
    async getRolesForUser(ctx: RepoContext, params: { userId: string }): Promise<RoleDto[]> {
      const { logger } = ctx
      logger.info({ action: 'get_roles_for_user', userId: params.userId })

      const userRoles = await prisma.userRole.findMany({
        where: { userId: params.userId },
        include: { role: true },
      })

      return userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description ?? undefined,
      }))
    },

    async getGrantsForUser(ctx: RepoContext, params: { userId: string }): Promise<Grant[]> {
      const { logger } = ctx
      logger.info({ action: 'get_grants_for_user', userId: params.userId })

      const rows = await prisma.$queryRaw<GrantRow[]>`
        SELECT DISTINCT ra.action, ra.scope
        FROM user_roles ur
        JOIN role_access ra ON ra.role_id = ur.role_id
        WHERE ur.user_id = ${params.userId}
      `

      return mapGrantRows(logger, rows)
    },

    async listRoles(ctx: RepoContext): Promise<RoleDto[]> {
      const { logger } = ctx
      logger.info({ action: 'list_roles' })

      const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' },
      })

      return roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? undefined,
      }))
    },

    async getGrantsForRole(ctx: RepoContext, params: { roleId: string }): Promise<Grant[]> {
      const { logger } = ctx
      logger.info({ action: 'get_grants_for_role', roleId: params.roleId })

      const roleAccess = await prisma.roleAccess.findMany({ where: { roleId: params.roleId } })

      return mapGrantRows(logger, roleAccess.map((entry) => ({ action: entry.action, scope: entry.scope })))
    },

    async setRoleGrants(ctx: RepoContext, params: { roleId: string; grants: Grant[] }): Promise<void> {
      const { logger } = ctx
      const normalizedGrants = normalizeGrants(params.grants)

      logger.info({ action: 'set_role_grants', roleId: params.roleId, count: normalizedGrants.length })

      await prisma.$transaction(async (tx) => {
        await tx.roleAccess.deleteMany({ where: { roleId: params.roleId } })

        if (normalizedGrants.length === 0) {
          return
        }

        await tx.roleAccess.createMany({
          data: normalizedGrants.map((grant) => ({
            roleId: params.roleId,
            action: grant.action,
            scope: grant.scope,
          })),
        })
      })
    },

    async getRoleIdByName(ctx: RepoContext, params: { roleName: string }): Promise<string | null> {
      const { logger } = ctx
      logger.info({ action: 'get_role_id_by_name', roleName: params.roleName })

      const role = await prisma.role.findUnique({ where: { name: params.roleName } })
      return role?.id ?? null
    },

    async assignRoleToUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'assign_role_to_user', userId: params.userId, roleId: params.roleId })

      await prisma.userRole.create({
        data: { userId: params.userId, roleId: params.roleId },
      })
    },

    async removeRoleFromUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'remove_role_from_user', userId: params.userId, roleId: params.roleId })

      await prisma.userRole.deleteMany({
        where: { userId: params.userId, roleId: params.roleId },
      })
    },

    async setRolesForUser(ctx: RepoContext, params: { userId: string; roleIds: string[] }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'set_roles_for_user', userId: params.userId, count: params.roleIds.length })

      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: params.userId } })
        await tx.userRole.createMany({
          data: params.roleIds.map((roleId) => ({ userId: params.userId, roleId })),
        })
      })
    },

    async createRole(ctx: RepoContext, params: { name: string; description?: string }): Promise<RoleDto> {
      const { logger } = ctx
      logger.info({ action: 'create_role', name: params.name })

      const role = await prisma.role.create({
        data: { name: params.name, description: params.description ?? null },
      })

      return {
        id: role.id,
        name: role.name,
        description: role.description ?? undefined,
      }
    },

    async deleteRole(ctx: RepoContext, params: { roleId: string }): Promise<void> {
      const { logger } = ctx
      logger.info({ action: 'delete_role', roleId: params.roleId })

      await prisma.role.delete({ where: { id: params.roleId } })
    },

    async countUsersWithRole(ctx: RepoContext, params: { roleId: string }): Promise<number> {
      const { logger } = ctx
      logger.info({ action: 'count_users_with_role', roleId: params.roleId })

      return prisma.userRole.count({ where: { roleId: params.roleId } })
    },
  }
}
