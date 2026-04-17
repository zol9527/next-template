
import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createAuthService } from '@/services/auth.service'
import type { UserRepository } from '@/repositories/interfaces/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/session.interface'
import type { WechatAccountRepository } from '@/repositories/interfaces/wechat-account.interface'
import type { RbacRepository } from '@/repositories/interfaces/rbac.interface'
import type { RoleDto } from '@/contracts/dtos/rbac'
import type pino from 'pino'

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

function createMockUserRepository(overrides?: Partial<UserRepository>): UserRepository {
  return {
    getUserById: vi.fn().mockResolvedValue(null),
    getUserByIdentifier: vi.fn().mockResolvedValue(null),
    getUserAdminById: vi.fn().mockResolvedValue(null),
    updateUserStatus: vi.fn().mockResolvedValue(undefined),
    updateUploadPermission: vi.fn().mockResolvedValue(undefined),
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listUsersWithCursor: vi.fn().mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 }),
    resetLoginFailures: vi.fn().mockResolvedValue(undefined),
    recordLoginFailure: vi.fn().mockResolvedValue(undefined),
    createUserForWechat: vi.fn().mockResolvedValue({} as any),
    updateWechatProfile: vi.fn().mockResolvedValue(undefined),
    getGlobalStats: vi.fn().mockResolvedValue({ totalUsers: 0 }),
    findByEmail: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(null as never),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    updateWechatDisplayProfile: vi.fn().mockResolvedValue(undefined),
    updateUserPhone: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockSessionRepository(overrides?: Partial<SessionRepository>): SessionRepository {
  return {
    getSessionById: vi.fn().mockResolvedValue(null),
    getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({} as any),
    rotateSession: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    revokeOldestSessions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockWechatAccountRepository(overrides?: Partial<WechatAccountRepository>): WechatAccountRepository {
  return {
    findByOpenid: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue(null),
    createAccount: vi.fn().mockResolvedValue(undefined),
    updateSessionKey: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockRbacRepository(overrides?: Partial<RbacRepository>): RbacRepository {
  return {
    getRolesForUser: vi.fn().mockResolvedValue([]),
    getGrantsForUser: vi.fn().mockResolvedValue([]),
    getGrantsForRole: vi.fn().mockResolvedValue([]),
    setRoleGrants: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([]),
    getRoleIdByName: vi.fn().mockResolvedValue('role-123'),
    assignRoleToUser: vi.fn().mockResolvedValue(undefined),
    removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
    setRolesForUser: vi.fn().mockResolvedValue(undefined),
    createRole: vi.fn().mockResolvedValue({} as RoleDto),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    countUsersWithRole: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function createMockWechatOauth() {
  return {
    code2Session: vi.fn().mockResolvedValue({
      openid: 'wechat-openid-123',
      unionid: null,
      session_key: 'wechat-session-key-123',
    }),
  }
}

describe('AuthService Security', () => {
  const mockAuthContext = {
    userAgent: 'TestAgent/1.0',
    clientIp: '127.0.0.1',
  }

  it('should not leak password validity on locked accounts', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
    // Locked user
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      phone: '13800138000',
      avatarUrl: null,
      userType: 'regular',
      status: 'active',
      passwordHash,
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Locked
    }

    const users = createMockUserRepository({
      getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
    })
    const sessions = createMockSessionRepository()
    const wechatAccounts = createMockWechatAccountRepository()
    const rbac = createMockRbacRepository()
    const wechatOauth = createMockWechatOauth()

    const authService = createAuthService(
      { users, sessions, wechatAccounts, rbac, wechatOauth },
      mockServiceContext,
    )

    await expect(
      authService.validateCredentials({
        identifier: 'testuser',
        password: 'CorrectPassword123!',
      }),
    ).rejects.toThrow('Account locked')

    await expect(
      authService.validateCredentials({
        identifier: 'testuser',
        password: 'WrongPassword123!',
      }),
    ).rejects.toThrow('Invalid credentials')
  })
})
