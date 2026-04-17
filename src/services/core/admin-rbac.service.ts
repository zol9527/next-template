import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import type { GrantDto } from '@/contracts/dtos/rbac/access.dto'
import type { Grant } from '@/config/access'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { ForbiddenError, NotFoundError } from '@/lib/errors/app-error'

export function createAdminRbacService(deps: { rbac: RbacRepository }, ctx: ServiceContext) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listRoles(): Promise<RoleDto[]> {
      return await deps.rbac.listRoles(repoCtx)
    },

    async createRole(params: { name: string; description?: string; actorId?: string }): Promise<RoleDto> {
      const role = await deps.rbac.createRole(repoCtx, params)

      ctx.logger.info({
        audit: true,
        actorId: params.actorId ?? 'unknown',
        action: 'rbac.create_role',
        target: `role:${role.id}`,
        details: { name: params.name, description: params.description },
      }, 'RBAC 角色已创建')

      return role
    },

    async getRoleGrants(roleId: string): Promise<GrantDto[]> {
      const roles = await deps.rbac.listRoles(repoCtx)
      const exists = roles.some((r) => r.id === roleId)
      if (!exists) {
        throw new NotFoundError('角色不存在')
      }

      return await deps.rbac.getGrantsForRole(repoCtx, { roleId })
    },

    async updateRoleGrants(params: {
      roleId: string
      grants: GrantDto[]
      actorId?: string
    }): Promise<GrantDto[]> {
      const roles = await deps.rbac.listRoles(repoCtx)
      const exists = roles.some((r) => r.id === params.roleId)
      if (!exists) {
        throw new NotFoundError('角色不存在')
      }

      const previousGrants = await deps.rbac.getGrantsForRole(repoCtx, { roleId: params.roleId })

      await deps.rbac.setRoleGrants(repoCtx, {
        roleId: params.roleId,
        grants: params.grants as Grant[],
      })

      ctx.logger.info({
        audit: true,
        actorId: params.actorId ?? 'unknown',
        action: 'rbac.update_role_grants',
        target: `role:${params.roleId}`,
        details: {
          previousGrants: previousGrants.length,
          newGrants: params.grants.length,
        },
      }, 'RBAC 角色权限已更新')

      return await deps.rbac.getGrantsForRole(repoCtx, { roleId: params.roleId })
    },

    async deleteRole(params: { roleId: string; actorId?: string; actorRoleIds?: string[] }): Promise<void> {
      const roles = await deps.rbac.listRoles(repoCtx)
      const role = roles.find((r) => r.id === params.roleId)
      if (!role) {
        throw new NotFoundError('角色不存在')
      }

      if (role.name === 'admin') {
        throw new ForbiddenError('无法删除 admin 角色')
      }

      // 防止删除操作者自身拥有的角色
      if (params.actorId) {
        const actorRoles = await deps.rbac.getRolesForUser(repoCtx, { userId: params.actorId })
        const actorHasRole = actorRoles.some((r) => r.id === params.roleId)
        if (actorHasRole) {
          throw new ForbiddenError('无法删除自身拥有的角色')
        }
      }

      const userCount = await deps.rbac.countUsersWithRole(repoCtx, { roleId: params.roleId })
      if (userCount > 0) {
        throw new ForbiddenError(`该角色已分配给 ${userCount} 个用户，无法删除`)
      }

      await deps.rbac.deleteRole(repoCtx, { roleId: params.roleId })

      ctx.logger.info({
        audit: true,
        actorId: params.actorId ?? 'unknown',
        action: 'rbac.delete_role',
        target: `role:${params.roleId}`,
        details: { roleName: role.name },
      }, 'RBAC 角色已删除')
    },
  }
}
