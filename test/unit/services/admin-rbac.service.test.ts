/**
 * Unit: 管理员 RBAC 服务测试
 *
 * Description: 覆盖角色删除的约束（已分配用户时禁止删除）
 */

import { describe, it, expect, vi } from 'vitest'
import type pino from 'pino'

import { createAdminRbacService } from '@/services/admin-rbac.service'
import type { RbacRepository } from '@/repositories/interfaces/rbac.interface'
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

function createMockRbacRepository(overrides?: Partial<RbacRepository>): RbacRepository {
  return {
    getRolesForUser: vi.fn().mockResolvedValue([]),
    getGrantsForUser: vi.fn().mockResolvedValue([]),
    getGrantsForRole: vi.fn().mockResolvedValue([]),
    setRoleGrants: vi.fn().mockResolvedValue(undefined),

    listRoles: vi.fn().mockResolvedValue([]),

    getRoleIdByName: vi.fn().mockResolvedValue(null),
    assignRoleToUser: vi.fn().mockResolvedValue(undefined),
    removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
    setRolesForUser: vi.fn().mockResolvedValue(undefined),

    createRole: vi.fn().mockResolvedValue({ id: 'role-id', name: 'role', description: '角色' }),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    countUsersWithRole: vi.fn().mockResolvedValue(0),

    ...overrides,
  }
}

describe('管理员 RBAC 服务测试', () => {
  it('当角色已分配给用户时，应禁止删除并抛出 CONFLICT', async () => {
    const rbac = createMockRbacRepository({
      listRoles: vi.fn().mockResolvedValue([
        { id: 'role-1', name: 'teacher', description: '教师' },
      ]),
      countUsersWithRole: vi.fn().mockResolvedValue(2),
    })

    const service = createAdminRbacService({ rbac }, mockServiceContext)

    await expect(service.deleteRole('role-1')).rejects.toMatchObject({
      code: 'CONFLICT',
    })

    expect(vi.mocked(rbac.deleteRole)).not.toHaveBeenCalled()
  })

  it('不允许删除 admin 角色，应抛出 FORBIDDEN', async () => {
    const rbac = createMockRbacRepository({
      listRoles: vi.fn().mockResolvedValue([
        { id: 'role-admin', name: 'admin', description: '管理员' },
      ]),
      countUsersWithRole: vi.fn().mockResolvedValue(0),
    })

    const service = createAdminRbacService({ rbac }, mockServiceContext)

    await expect(service.deleteRole('role-admin')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })

    expect(vi.mocked(rbac.deleteRole)).not.toHaveBeenCalled()
  })
})
