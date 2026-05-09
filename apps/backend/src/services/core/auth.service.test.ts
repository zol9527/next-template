import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhoneNumber } from '@/lib/wechat/phone'
import { ConflictError } from '@/lib/errors/app-error'
import { createAuthService, AuthError } from '@/services/core/auth.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { WechatOauthClient } from '@/lib/wechat/oauth'

vi.mock('@/lib/wechat/phone', () => ({
  getPhoneNumber: vi.fn(),
}))

describe('AuthService - WeChat Profile Methods', () => {
  let ctx: ServiceContext
  let users: {
    getUserById: ReturnType<typeof vi.fn>
    updateWechatDisplayProfile: ReturnType<typeof vi.fn>
    updateUserPhone: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    const childLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnValue({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      }),
    }

    ctx = {
      traceId: 'test-trace-id',
      logger: childLogger,
    } as unknown as ServiceContext

    users = {
      getUserById: vi.fn().mockResolvedValue({
        id: 'user-123',
        username: null,
        nickname: null,
        email: null,
        phone: null,
        avatarUrl: null,
        userType: null,
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
      }),
      updateWechatDisplayProfile: vi.fn().mockResolvedValue(undefined),
      updateUserPhone: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('completeWechatProfile', () => {
    it('should update display profile through repository', async () => {
      const auth = createAuthService(
        {
          users: users as unknown as UserRepository,
          sessions: {} as unknown as SessionRepository,
          wechatAccounts: {} as unknown as WechatAccountRepository,
          rbac: {} as unknown as RbacRepository,
          wechatOauth: {} as unknown as WechatOauthClient,
        },
        ctx,
      )

      await auth.completeWechatProfile({
        userId: 'user-123',
        nickname: '测试昵称',
        avatarUrl: 'https://example.com/avatar.png',
      })

      expect(users.getUserById).toHaveBeenCalledWith(expect.anything(), { userId: 'user-123' })
      expect(users.updateWechatDisplayProfile).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-123',
        nickname: '测试昵称',
        avatarUrl: 'https://example.com/avatar.png',
      })
    })
  })

  describe('bindWechatPhone', () => {
    it('should fetch and mask phone number before returning', async () => {
      vi.mocked(getPhoneNumber).mockResolvedValue({
        phone: '13812345678',
        countryCode: '86',
      })

      const auth = createAuthService(
        {
          users: users as unknown as UserRepository,
          sessions: {} as unknown as SessionRepository,
          wechatAccounts: {} as unknown as WechatAccountRepository,
          rbac: {} as unknown as RbacRepository,
          wechatOauth: {} as unknown as WechatOauthClient,
        },
        ctx,
      )

      const result = await auth.bindWechatPhone({
        userId: 'user-123',
        code: 'wx-phone-code',
      })

      expect(getPhoneNumber).toHaveBeenCalledWith('wx-phone-code')
      expect(users.updateUserPhone).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-123',
        phone: '13812345678',
      })
      expect(result).toEqual({ phone: '138****5678' })
    })

    it('should map duplicate phone conflict to 409 error', async () => {
      vi.mocked(getPhoneNumber).mockResolvedValue({
        phone: '13812345678',
        countryCode: '86',
      })
      users.updateUserPhone.mockRejectedValue({ code: 'P2002' })

      const auth = createAuthService(
        {
          users: users as unknown as UserRepository,
          sessions: {} as unknown as SessionRepository,
          wechatAccounts: {} as unknown as WechatAccountRepository,
          rbac: {} as unknown as RbacRepository,
          wechatOauth: {} as unknown as WechatOauthClient,
        },
        ctx,
      )

      await expect(
        auth.bindWechatPhone({
          userId: 'user-123',
          code: 'wx-phone-code',
        }),
      ).rejects.toEqual(new ConflictError('该手机号已绑定其他账号'))
    })
  })

  describe('AuthError', () => {
    it('should be an error class', () => {
      const error = new AuthError('UNAUTHORIZED', 'Test error')
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Test error')
    })
  })
})
