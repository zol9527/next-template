import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPrismaWechatAccountRepository } from '@/plugins/wechat/repositories/prisma/wechat-account.repository'
import type { RepoContext } from '@/types/repo/repo-context'
import type { WechatAccountRecord } from '@/plugins/wechat/repositories/interfaces/wechat-account.types'
import { prisma } from '@/lib/prisma'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    wechatAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

const mockCtx: RepoContext = {
  traceId: 'test-trace-id',
  logger: mockLogger as unknown as RepoContext['logger'],
}

describe('WechatAccountRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findByUserId', () => {
    it('应该成功找到用户的微信账号', async () => {
      const mockAccount: WechatAccountRecord = {
        id: 'account-123',
        userId: 'user-123',
        openid: 'wx-openid-123',
        unionid: 'wx-unionid-123',
        sessionKey: null,
      }

      vi.mocked(prisma.wechatAccount.findUnique).mockResolvedValue({
        id: 'account-123',
        userId: 'user-123',
        openid: 'wx-openid-123',
        unionid: 'wx-unionid-123',
        sessionKey: null,
        sessionKeyUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.findByUserId(mockCtx, { userId: 'user-123' })

      expect(result).toEqual(mockAccount)
      expect(prisma.wechatAccount.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith({
        action: 'find_by_user_id',
        userId: 'user-123',
      })
    })

    it('应该返回 null 当用户没有微信账号时', async () => {
      vi.mocked(prisma.wechatAccount.findUnique).mockResolvedValue(null)

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.findByUserId(mockCtx, { userId: 'non-existent-user' })

      expect(result).toBeNull()
    })
  })

  describe('findByOpenid', () => {
    it('应该成功通过 openid 找到微信账号', async () => {
      const mockAccount: WechatAccountRecord = {
        id: 'account-123',
        userId: 'user-123',
        openid: 'wx-openid-123',
        unionid: 'wx-unionid-123',
        sessionKey: null,
      }

      vi.mocked(prisma.wechatAccount.findUnique).mockResolvedValue({
        id: 'account-123',
        userId: 'user-123',
        openid: 'wx-openid-123',
        unionid: 'wx-unionid-123',
        sessionKey: null,
        sessionKeyUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.findByOpenid(mockCtx, { openid: 'wx-openid-123' })

      expect(result).toEqual(mockAccount)
      expect(prisma.wechatAccount.findUnique).toHaveBeenCalledWith({
        where: { openid: 'wx-openid-123' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith({
        action: 'find_by_openid',
      })
    })

    it('应该返回 null 当 openid 不存在时', async () => {
      vi.mocked(prisma.wechatAccount.findUnique).mockResolvedValue(null)

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.findByOpenid(mockCtx, { openid: 'non-existent-openid' })

      expect(result).toBeNull()
    })
  })

  describe('createAccount', () => {
    it('应该成功创建微信账号（包含 unionid）', async () => {
      const newAccount: WechatAccountRecord = {
        id: 'new-account-123',
        userId: 'user-123',
        openid: 'wx-openid-new',
        unionid: 'wx-unionid-new',
        sessionKey: null,
      }

      vi.mocked(prisma.wechatAccount.create).mockResolvedValue({
        id: 'new-account-123',
        userId: 'user-123',
        openid: 'wx-openid-new',
        unionid: 'wx-unionid-new',
        sessionKey: null,
        sessionKeyUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.createAccount(mockCtx, {
        userId: 'user-123',
        openid: 'wx-openid-new',
        unionid: 'wx-unionid-new',
      })

      expect(result).toEqual(newAccount)
      expect(prisma.wechatAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          openid: 'wx-openid-new',
          unionid: 'wx-unionid-new',
          sessionKey: null,
          sessionKeyUpdatedAt: null,
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith({
        action: 'create_account',
        userId: 'user-123',
        openid: 'wx-openid-new',
      })
    })

    it('应该成功创建微信账号（不包含 unionid）', async () => {
      const newAccount: WechatAccountRecord = {
        id: 'new-account-456',
        userId: 'user-456',
        openid: 'wx-openid-456',
        unionid: null,
        sessionKey: null,
      }

      vi.mocked(prisma.wechatAccount.create).mockResolvedValue({
        id: 'new-account-456',
        userId: 'user-456',
        openid: 'wx-openid-456',
        unionid: null,
        sessionKey: null,
        sessionKeyUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.createAccount(mockCtx, {
        userId: 'user-456',
        openid: 'wx-openid-456',
        unionid: null,
      })

      expect(result).toEqual(newAccount)
      expect(prisma.wechatAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          openid: 'wx-openid-456',
          unionid: null,
          sessionKey: null,
          sessionKeyUpdatedAt: null,
        },
      })
    })

    it('当 unionid 为 undefined 时应转换为 null', async () => {
      const newAccount: WechatAccountRecord = {
        id: 'new-account-789',
        userId: 'user-789',
        openid: 'wx-openid-789',
        unionid: null,
        sessionKey: null,
      }

      vi.mocked(prisma.wechatAccount.create).mockResolvedValue({
        id: 'new-account-789',
        userId: 'user-789',
        openid: 'wx-openid-789',
        unionid: null,
        sessionKey: null,
        sessionKeyUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const repo = createPrismaWechatAccountRepository()
      const result = await repo.createAccount(mockCtx, {
        userId: 'user-789',
        openid: 'wx-openid-789',
        unionid: null,
      })

      expect(result).toEqual(newAccount)
      expect(prisma.wechatAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-789',
          openid: 'wx-openid-789',
          unionid: null,
          sessionKey: null,
          sessionKeyUpdatedAt: null,
        },
      })
    })
  })
})
