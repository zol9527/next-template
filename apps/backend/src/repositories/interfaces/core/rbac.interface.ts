import type { RepoContext } from '@/types/repo/repo-context'
import type { RoleDto } from '@/contracts/dtos/rbac'
import type { Grant } from '@/config/access'

export interface RbacRepository {
  getRolesForUser(ctx: RepoContext, params: { userId: string }): Promise<RoleDto[]>
  getGrantsForUser(ctx: RepoContext, params: { userId: string }): Promise<Grant[]>

  listRoles(ctx: RepoContext): Promise<RoleDto[]>

  getGrantsForRole(ctx: RepoContext, params: { roleId: string }): Promise<Grant[]>
  setRoleGrants(ctx: RepoContext, params: { roleId: string; grants: Grant[] }): Promise<void>

  getRoleIdByName(ctx: RepoContext, params: { roleName: string }): Promise<string | null>
  assignRoleToUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void>
  removeRoleFromUser(ctx: RepoContext, params: { userId: string; roleId: string }): Promise<void>
  setRolesForUser(ctx: RepoContext, params: { userId: string; roleIds: string[] }): Promise<void>
  createRole(ctx: RepoContext, params: { name: string; description?: string }): Promise<RoleDto>
  updateRole(ctx: RepoContext, params: { roleId: string; name?: string; description?: string }): Promise<RoleDto>
  deleteRole(ctx: RepoContext, params: { roleId: string }): Promise<void>
  countUsersWithRole(ctx: RepoContext, params: { roleId: string }): Promise<number>
}
