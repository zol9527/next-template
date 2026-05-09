import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors/app-error'

export function createAdminUserRoleService(
  deps: { users: UserRepository; rbac: RbacRepository },
  ctx: ServiceContext,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listUserRoles(userId: string): Promise<{ userId: string; roles: RoleDto[] }> {
      const user = await deps.users.getUserAdminById(repoCtx, { userId })
      if (!user) {
        throw new NotFoundError('用户不存在')
      }

      const roles = await deps.rbac.getRolesForUser(repoCtx, { userId })
      return {
        userId,
        roles,
      }
    },

    async assignRoleToUser(params: {
      userId: string
      roleId: string
      actorUserId?: string
    }): Promise<{ userId: string; roles: RoleDto[] }> {
      const user = await deps.users.getUserAdminById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new NotFoundError('用户不存在')
      }

      const roles = await deps.rbac.listRoles(repoCtx)
      const exists = roles.some((r) => r.id === params.roleId)
      if (!exists) {
        throw new ValidationError('无效的角色 ID')
      }

      await deps.rbac.assignRoleToUser(repoCtx, { userId: params.userId, roleId: params.roleId })

      ctx.logger.info({
        audit: true,
        actorId: params.actorUserId ?? 'unknown',
        action: 'rbac.assign_role_to_user',
        target: `user:${params.userId}`,
        details: { roleId: params.roleId },
      }, 'RBAC 已为用户分配角色')

      return this.listUserRoles(params.userId)
    },

    async removeRoleFromUser(params: {
      userId: string
      roleId: string
      actorUserId?: string
    }): Promise<{ userId: string; roles: RoleDto[] }> {
      const user = await deps.users.getUserAdminById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new NotFoundError('用户不存在')
      }

      const roles = await deps.rbac.listRoles(repoCtx)
      const exists = roles.some((r) => r.id === params.roleId)
      if (!exists) {
        throw new ValidationError('无效的角色 ID')
      }

      const adminRole = roles.find((r) => r.name === 'admin')
      if (adminRole && params.actorUserId && params.actorUserId === params.userId && params.roleId === adminRole.id) {
        throw new ForbiddenError('无法移除自身的 admin 角色')
      }

      await deps.rbac.removeRoleFromUser(repoCtx, { userId: params.userId, roleId: params.roleId })

      ctx.logger.info({
        audit: true,
        actorId: params.actorUserId ?? 'unknown',
        action: 'rbac.remove_role_from_user',
        target: `user:${params.userId}`,
        details: { roleId: params.roleId },
      }, 'RBAC 已移除用户角色')

      return this.listUserRoles(params.userId)
    },

    async setUserRoles(params: {
      userId: string
      roleIds: string[]
      actorUserId?: string
    }): Promise<{ userId: string; roles: RoleDto[] }> {
      const user = await deps.users.getUserAdminById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new NotFoundError('用户不存在')
      }

      const roles = await deps.rbac.listRoles(repoCtx)
      const allowed = new Set(roles.map((r) => r.id))
      const uniqueRoleIds = Array.from(new Set(params.roleIds)).filter(Boolean)
      const missing = uniqueRoleIds.filter((rid) => !allowed.has(rid))
      if (missing.length > 0) {
        throw new ValidationError('包含无效的角色 ID')
      }

      const adminRole = roles.find((r) => r.name === 'admin')
      if (adminRole && params.actorUserId && params.actorUserId === params.userId) {
        const willKeepAdmin = uniqueRoleIds.includes(adminRole.id)
        if (!willKeepAdmin) {
          throw new ForbiddenError('无法移除自身的 admin 角色')
        }
      }

      await deps.rbac.setRolesForUser(repoCtx, { userId: params.userId, roleIds: uniqueRoleIds })

      ctx.logger.info({
        audit: true,
        actorId: params.actorUserId ?? 'unknown',
        action: 'rbac.set_user_roles',
        target: `user:${params.userId}`,
        details: { roleIds: uniqueRoleIds },
      }, 'RBAC 已设置用户角色')

      return this.listUserRoles(params.userId)
    },
  }
}
