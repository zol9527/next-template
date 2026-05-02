import { describe, it, expect, vi } from 'vitest'
import type pino from 'pino'

import { createAdminRbacService } from '@/services/core/admin-rbac.service'
import type { ServiceContext } from '@/types/service/service-context'

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

const mockServiceContext: ServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

describe('管理员 RBAC 服务测试', () => {
  it('当角色已分配给用户时，应禁止删除并抛出 FORBIDDEN', async () => {
    const rbac = {
      listRoles: vi.fn().mockResolvedValue([
        { id: 'role-1', name: 'teacher', description: '教师' },
      ]),
      countUsersWithRole: vi.fn().mockResolvedValue(2),
      deleteRole: vi.fn(),
      getRolesForUser: vi.fn().mockResolvedValue([]),
      getGrantsForUser: vi.fn().mockResolvedValue([]),
      getGrantsForRole: vi.fn().mockResolvedValue([]),
      setRoleGrants: vi.fn(),
      getRoleIdByName: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn(),
      setRolesForUser: vi.fn(),
      createRole: vi.fn(),
    } as any

    const service = createAdminRbacService({ rbac }, mockServiceContext)

    await expect(service.deleteRole({ roleId: 'role-1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('不允许删除 admin 角色，应抛出 FORBIDDEN', async () => {
    const rbac = {
      listRoles: vi.fn().mockResolvedValue([
        { id: 'role-admin', name: 'admin', description: '管理员' },
      ]),
      countUsersWithRole: vi.fn().mockResolvedValue(0),
      deleteRole: vi.fn(),
      getRolesForUser: vi.fn().mockResolvedValue([]),
      getGrantsForUser: vi.fn().mockResolvedValue([]),
      getGrantsForRole: vi.fn().mockResolvedValue([]),
      setRoleGrants: vi.fn(),
      getRoleIdByName: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn(),
      setRolesForUser: vi.fn(),
      createRole: vi.fn(),
    } as any

    const service = createAdminRbacService({ rbac }, mockServiceContext)

    await expect(service.deleteRole({ roleId: 'role-admin' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})
