import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import type { GrantDto } from '@/contracts/dtos/rbac/access.dto'
import type { AdminRoleDetail } from '@/contracts/dtos/admin/rbac/roles.dto'
import type { Grant } from '@/config/access'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors/app-error'

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

    async getRoleDetail(roleId: string): Promise<AdminRoleDetail> {
      const roles = await deps.rbac.listRoles(repoCtx)
      const role = roles.find((r) => r.id === roleId)
      if (!role) {
        throw new NotFoundError('角色不存在')
      }

      // 并行获取权限列表和用户计数，减少总延迟
      const [grants, userCount] = await Promise.all([
        deps.rbac.getGrantsForRole(repoCtx, { roleId }),
        deps.rbac.countUsersWithRole(repoCtx, { roleId }),
      ])

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        grants: grants.map((g) => ({ action: g.action, scope: g.scope })),
        userCount,
        // RoleDto 暂无时间戳字段，数据库中无真实数据时返回 null
        createdAt: (role as Record<string, unknown>).createdAt as string | null ?? null,
        updatedAt: (role as Record<string, unknown>).updatedAt as string | null ?? null,
      }
    },

    async updateRole(params: { roleId: string; name?: string; description?: string; actorId?: string }): Promise<AdminRoleDetail> {
      const roles = await deps.rbac.listRoles(repoCtx)
      const targetRole = roles.find((r) => r.id === params.roleId)
      if (!targetRole) {
        throw new NotFoundError('角色不存在')
      }

      // 保护 admin 保留角色名，禁止修改
      if (targetRole.name === 'admin' && params.name && params.name !== 'admin') {
        throw new ForbiddenError('无法修改 admin 角色名称')
      }

      // 检查角色名是否与其他角色重复
      if (params.name) {
        const duplicate = roles.some((r) => r.id !== params.roleId && r.name === params.name)
        if (duplicate) {
          throw new ConflictError('角色名已存在')
        }
      }

      await deps.rbac.updateRole(repoCtx, {
        roleId: params.roleId,
        name: params.name,
        description: params.description,
      })

      ctx.logger.info({
        audit: true,
        actorId: params.actorId ?? 'unknown',
        action: 'rbac.update_role',
        target: `role:${params.roleId}`,
        // 审计日志仅记录变更的字段名，避免泄露敏感值
        details: { updatedFields: [params.name && 'name', params.description && 'description'].filter(Boolean) },
      }, 'RBAC 角色信息已更新')

      // 直接获取更新后的详情返回（避免在 getRoleDetail 内再次 listRoles 全表扫描）
      // 但为了复用逻辑、保持一致性，仍调用 getRoleDetail
      return this.getRoleDetail(params.roleId)
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
