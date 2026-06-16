/**
 * Unit: MFA Repository (Prisma) Test
 *
 * Description: 测试 MFA Repository 的 pending secret 相关方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPrismaMfaRepository } from '@/repositories/prisma/core/mfa.repository'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
import type { RepoContext } from '@/types/repo/repo-context'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mfaActionToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    mfaAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock MfaEncryption
vi.mock('@/lib/security/mfa-encryption', () => ({
  MfaEncryption: {
    encryptSecret: vi.fn(),
    decryptSecret: vi.fn(),
  },
}))

const { prisma } = vi.mocked(await import('@/lib/prisma'), { deep: true })

// Mock logger
const mockLogger = {
  level: 'debug',
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  silent: vi.fn(),
  msgPrefix: undefined,
  child: vi.fn(() => mockLogger),
}

// Mock RepoContext
const mockCtx: RepoContext = {
  traceId: 'test-trace-id',
  logger: mockLogger as any,
}

describe('PrismaMfaRepository', () => {
  let repository: MfaRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = createPrismaMfaRepository()
  })

  describe('setPendingMfaSecret', () => {
    it('should store encrypted secret and backup codes', async () => {
      vi.mocked(MfaEncryption.encryptSecret).mockReturnValue('encrypted-secret')

      await repository.setPendingMfaSecret(mockCtx, {
        userId: 'user-123',
        secret: 'raw-secret',
        backupCodes: ['code1', 'code2'],
      })

      expect(MfaEncryption.encryptSecret).toHaveBeenCalledWith('raw-secret')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaPendingSecret: 'encrypted-secret',
          mfaPendingBackupCodes: JSON.stringify(['code1', 'code2']),
          mfaPendingExpiresAt: expect.any(Date),
        },
      })
    })
  })

  describe('getPendingMfaSecret', () => {
    it('should retrieve and decrypt secret', async () => {
      const futureDate = new Date(Date.now() + 600000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        mfaPendingSecret: 'encrypted-secret',
        mfaPendingBackupCodes: JSON.stringify(['code1', 'code2']),
        mfaPendingExpiresAt: futureDate,
      } as any)
      vi.mocked(MfaEncryption.decryptSecret).mockReturnValue('raw-secret')

      const result = await repository.getPendingMfaSecret(mockCtx, { userId: 'user-123' })

      expect(result).toEqual({
        secret: 'raw-secret',
        backupCodes: ['code1', 'code2'],
      })
      expect(MfaEncryption.decryptSecret).toHaveBeenCalledWith('encrypted-secret')
    })

    it('should return null if not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await repository.getPendingMfaSecret(mockCtx, { userId: 'user-123' })

      expect(result).toBeNull()
    })

    it('should return null and clear if expired', async () => {
      const pastDate = new Date(Date.now() - 600000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        mfaPendingSecret: 'encrypted-secret',
        mfaPendingBackupCodes: JSON.stringify(['code1', 'code2']),
        mfaPendingExpiresAt: pastDate,
      } as any)

      const result = await repository.getPendingMfaSecret(mockCtx, { userId: 'user-123' })

      expect(result).toBeNull()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    })

    it('should return null and clear if decryption fails', async () => {
      const futureDate = new Date(Date.now() + 600000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        mfaPendingSecret: 'encrypted-secret',
        mfaPendingBackupCodes: JSON.stringify(['code1', 'code2']),
        mfaPendingExpiresAt: futureDate,
      } as any)
      vi.mocked(MfaEncryption.decryptSecret).mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      const result = await repository.getPendingMfaSecret(mockCtx, { userId: 'user-123' })

      expect(result).toBeNull()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    })
  })

  describe('clearPendingMfaSecret', () => {
    it('should clear pending secret fields', async () => {
      await repository.clearPendingMfaSecret(mockCtx, { userId: 'user-123' })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaPendingSecret: null,
          mfaPendingBackupCodes: null,
          mfaPendingExpiresAt: null,
        },
      })
    })
  })
})
