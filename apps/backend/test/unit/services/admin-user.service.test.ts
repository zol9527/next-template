/**
 * Unit: 管理员用户服务测试
 *
 * Description: 测试管理员用户服务的核心功能，包括用户上传权限管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminUserService, AdminUserServiceError } from '@/services/core/admin-user.service'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { AdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type pino from 'pino'

/**
 * 模拟日志记录器
 */
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

/**
 * 模拟服务上下文
 */
const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

/**
 * 创建模拟的用户仓库
 */
function createMockUserRepository(overrides?: any): any {
  return {
    getUserById: vi.fn().mockResolvedValue(null),
    getUserByIdentifier: vi.fn().mockResolvedValue(null),
    getUserAdminById: vi.fn().mockResolvedValue(null),
    updateUserStatus: vi.fn().mockResolvedValue(undefined),
    updateUploadPermission: vi.fn().mockResolvedValue(undefined),
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50, nextCursor: null }),
    listUsersWithCursor: vi.fn().mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 }),
    resetLoginFailures: vi.fn().mockResolvedValue(undefined),
    recordLoginFailure: vi.fn().mockResolvedValue(undefined),
    createUserForWechat: vi.fn().mockResolvedValue({
      id: 'new-user-id',
      username: 'new_user',
      nickname: null,
      email: null,
      phone: null,
      avatarUrl: null,
      userType: 'regular',
      status: 'active',
      passwordHash: null,
      failedLoginCount: 0,
      lockedUntil: null,
      canUpload: false,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaSetupAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getGlobalStats: vi.fn().mockResolvedValue({ totalUsers: 0 }),
    updateWechatProfile: vi.fn().mockResolvedValue(undefined),
    findByEmail: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(null as never),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    updateWechatDisplayProfile: vi.fn().mockResolvedValue(undefined),
    updateUserPhone: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/**
 * 创建模拟的会话仓库
 */
function createMockSessionRepository(overrides?: any): any {
  return {
    getSessionById: vi.fn().mockResolvedValue(null),
    getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({
      id: 'new-session-id',
      userId: 'user-123',
      refreshTokenHash: 'hash',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }),
    rotateSession: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    revokeOldestSessions: vi.fn().mockResolvedValue(undefined),
    getUserSessions: vi.fn().mockResolvedValue([]),
    getUserSessionsCount: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

/**
 * 创建模拟的用户详情
 */
function createMockUserDetail(overrides?: Partial<AdminUserDetail>): AdminUserDetail {
  return {
    id: 'user-123',
    username: 'testuser',
    nickname: '测试用户',
    email: 'test@example.com',
    phone: '13800138000',
    avatarUrl: 'https://example.com/avatar.jpg',
    userType: 'regular',
    status: 'active',
    canUpload: false,
    passwordHash: null,
    failedLoginCount: 0,
    lockedUntil: null,
    passwordUpdatedAt: null,
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: null,
    mfaSetupAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('管理员用户服务测试', () => {
  const MOCK_ADMIN_USER_ID = 'admin-123'
  const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('设置上传权限 (setUploadPermission)', () => {
    /**
     * Function: setUploadPermission (成功场景 - 允许上传)
     *
     * Description: 测试成功授予用户上传权限
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   canUpload(boolean): 是否允许上传（true）
     *
     * Returns:
     *   result(object): 包含用户 ID 和上传权限状态
     */
    it('应该成功授予用户上传权限', async () => {
      const mockUser = createMockUserDetail({ id: MOCK_USER_ID, canUpload: false })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
        updateUploadPermission: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.setUploadPermission(MOCK_USER_ID, true)

      expect(result).toEqual({
        userId: MOCK_USER_ID,
        canUpload: true,
      })
      expect(users.updateUploadPermission).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID, canUpload: true },
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'admin.set_upload_permission', targetUserId: MOCK_USER_ID, canUpload: true },
        '设置用户上传权限'
      )
    })

    /**
     * Function: setUploadPermission (成功场景 - 撤销上传权限)
     *
     * Description: 测试成功撤销用户上传权限
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   canUpload(boolean): 是否允许上传（false）
     *
     * Returns:
     *   result(object): 包含用户 ID 和上传权限状态
     */
    it('应该成功撤销用户上传权限', async () => {
      const mockUser = createMockUserDetail({ id: MOCK_USER_ID, canUpload: true })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
        updateUploadPermission: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.setUploadPermission(MOCK_USER_ID, false)

      expect(result).toEqual({
        userId: MOCK_USER_ID,
        canUpload: false,
      })
      expect(users.updateUploadPermission).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID, canUpload: false },
      )
    })

    /**
     * Function: setUploadPermission (用户不存在)
     *
     * Description: 测试为不存在的用户切换权限时抛出错误
     */
    it('应该在用户不存在时抛出 NOT_FOUND 错误', async () => {
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      await expect(service.setUploadPermission('non-existent-user-id', true)).rejects.toThrow(
        AdminUserServiceError
      )

      try {
        await service.setUploadPermission('non-existent-user-id', true)
      } catch (error) {
        expect(error).toBeInstanceOf(AdminUserServiceError)
        if (error instanceof AdminUserServiceError) {
          expect(error.code).toBe('NOT_FOUND')
          expect(error.message).toBe('用户不存在')
        }
      }

      // 验证 updateUploadPermission 没有被调用
      expect(users.updateUploadPermission).not.toHaveBeenCalled()
    })

    /**
     * Function: setUploadPermission (记录操作日志)
     *
     * Description: 测试切换权限时正确记录操作日志
     */
    it('应该正确记录切换权限的操作日志', async () => {
      const mockUser = createMockUserDetail({ id: MOCK_USER_ID, canUpload: false })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
        updateUploadPermission: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      await service.setUploadPermission(MOCK_USER_ID, true)

      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          action: 'admin.set_upload_permission',
          targetUserId: MOCK_USER_ID,
          canUpload: true,
        },
        '设置用户上传权限'
      )
    })
  })

  describe('禁用用户 (disableUser)', () => {
    /**
     * Function: disableUser (成功场景)
     *
     * Description: 测试成功禁用用户
     */
    it('应该成功禁用用户并撤销所有会话', async () => {
      const users = createMockUserRepository({
        updateUserStatus: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository({
        revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
      })

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.disableUser(MOCK_USER_ID)

      expect(result).toEqual({
        userId: MOCK_USER_ID,
        status: 'disabled',
        revokedAllSessions: true,
      })
      expect(users.updateUserStatus).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID, status: 'disabled' }
      )
      expect(sessions.revokeAllSessionsForUser).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID }
      )
    })

    /**
     * Function: disableUser (禁止禁用自己)
     *
     * Description: 测试管理员不能禁用自己
     */
    it('应该阻止管理员禁用自己', async () => {
      const users = createMockUserRepository()
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      await expect(service.disableUser(MOCK_ADMIN_USER_ID)).rejects.toThrow(AdminUserServiceError)

      try {
        await service.disableUser(MOCK_ADMIN_USER_ID)
      } catch (error) {
        expect(error).toBeInstanceOf(AdminUserServiceError)
        if (error instanceof AdminUserServiceError) {
          expect(error.code).toBe('CANNOT_DISABLE_SELF')
          expect(error.message).toBe('管理员不能将自己设置为禁用状态')
        }
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { action: 'admin.disable_user.self_forbidden', targetUserId: MOCK_ADMIN_USER_ID },
        '管理员尝试禁用自己，已阻止该操作'
      )
      expect(users.updateUserStatus).not.toHaveBeenCalled()
    })
  })

  describe('启用用户 (enableUser)', () => {
    /**
     * Function: enableUser (成功场景)
     *
     * Description: 测试成功启用用户
     */
    it('应该成功启用用户', async () => {
      const users = createMockUserRepository({
        updateUserStatus: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.enableUser(MOCK_USER_ID)

      expect(result).toEqual({
        userId: MOCK_USER_ID,
        status: 'active',
        revokedAllSessions: false,
      })
      expect(users.updateUserStatus).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID, status: 'active' }
      )
    })
  })

  describe('解锁用户 (unlockUser)', () => {
    /**
     * Function: unlockUser (成功场景)
     *
     * Description: 测试成功解锁用户
     */
    it('应该成功解锁用户', async () => {
      const mockUser = createMockUserDetail({
        id: MOCK_USER_ID,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
        resetLoginFailures: vi.fn().mockResolvedValue(undefined),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.unlockUser(MOCK_USER_ID)

      const { passwordHash, mfaSecret, mfaBackupCodes, ...expectedUser } = mockUser

      expect(result).toEqual(expectedUser)
      expect(users.resetLoginFailures).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID }
      )
    })

    /**
     * Function: unlockUser (用户不存在)
     *
     * Description: 测试解锁不存在的用户返回 null
     * Note: 业务实现会先调用 resetLoginFailures 然后返回 null
     */
    it('应该在用户不存在时返回 null', async () => {
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.unlockUser('non-existent-user-id')

      expect(result).toBeNull()
      // 注意：业务实现会先调用 resetLoginFailures 即使用户不存在
      expect(users.resetLoginFailures).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: 'non-existent-user-id' }
      )
    })
  })

  describe('撤销用户会话 (revokeUserSessions)', () => {
    /**
     * Function: revokeUserSessions (成功场景)
     *
     * Description: 测试成功撤销用户所有会话
     */
    it('应该成功撤销用户所有会话', async () => {
      const mockUser = createMockUserDetail({ id: MOCK_USER_ID })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository({
        revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
      })

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.revokeUserSessions(MOCK_USER_ID)

      const { passwordHash, mfaSecret, mfaBackupCodes, ...expectedUser } = mockUser

      expect(result).toEqual(expectedUser)
      expect(sessions.revokeAllSessionsForUser).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID }
      )
    })

    /**
     * Function: revokeUserSessions (会话仓库未配置)
     *
     * Description: 测试会话仓库未配置时抛出错误
     */
    it('应该在会话仓库未配置时抛出错误', async () => {
      const users = createMockUserRepository()

      const service = createAdminUserService(
        { users },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      await expect(service.revokeUserSessions(MOCK_USER_ID)).rejects.toThrow(
        'Session repository is not configured'
      )
    })
  })

  describe('获取用户详情 (getUserDetail)', () => {
    /**
     * Function: getUserDetail (成功场景)
     *
     * Description: 测试成功获取用户详情
     */
    it('应该成功获取用户详情', async () => {
      const mockUser = createMockUserDetail({ id: MOCK_USER_ID })
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.getUserDetail(MOCK_USER_ID)

      const { passwordHash, mfaSecret, mfaBackupCodes, ...expectedUser } = mockUser

      expect(result).toEqual(expectedUser)
      expect(users.getUserAdminById).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: MOCK_USER_ID }
      )
    })

    /**
     * Function: getUserDetail (用户不存在)
     *
     * Description: 测试获取不存在的用户详情返回 null
     */
    it('应该在用户不存在时返回 null', async () => {
      const users = createMockUserRepository({
        getUserAdminById: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()

      const service = createAdminUserService(
        { users, sessions },
        mockServiceContext,
        MOCK_ADMIN_USER_ID,
      )

      const result = await service.getUserDetail('non-existent-user-id')

      expect(result).toBeNull()
    })
  })
})
