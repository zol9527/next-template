/**
 * File: test/unit/services/mfa.service.test.ts
 * Description: MFA 服务单元测试
（测试 MFA 设置、启用、禁用、验证、状态查询、备份码生成等核心业务逻辑）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MfaService } from '@/services/core/mfa.service'

// Mock all dependencies
vi.mock('@/services/core/mfa-totp.service', () => {
  return {
    MfaTotpService: {
      generateSecretWithQRCode: vi.fn(),
      verifyToken: vi.fn(),
    },
  }
})

vi.mock('@/lib/security/mfa-encryption', () => {
  return {
    MfaEncryption: {
      encryptSecret: vi.fn(),
      decryptSecret: vi.fn(),
    },
    resetEncryptionKeyCache: vi.fn(),
  }
})

vi.mock('@/services/core/mfa-audit-log.service', () => {
  return {
    MfaAuditLogService: {
      logSuccess: vi.fn(),
      logFailure: vi.fn(),
      formatForStorage: vi.fn(),
    },
  }
})
vi.mock('bcryptjs')

import { MfaTotpService } from '@/services/core/mfa-totp.service'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import { MfaAuditLogService } from '@/services/core/mfa-audit-log.service'
import * as bcrypt from 'bcryptjs'
import type { Logger } from 'pino'

import type { MfaRepository } from '@/repositories/interfaces/mfa.interface'
import type { UserRepository } from '@/repositories/interfaces/user.interface'
import type { ServiceContext } from '@/types/service/service-context'

describe('Unit: MfaService', () => {
  let mockMfaRepo: MfaRepository
  let mockUserRepo: UserRepository
  let mockContext: ServiceContext
  let mockLogger: unknown

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnThis(),
    }

    mockContext = {
      traceId: 'test-trace-id',
      logger: mockLogger as Logger,
      userId: 'test-user-id',
      clientIp: '192.168.1.1',
      userAgent: 'Test Browser',
    }

    mockMfaRepo = {
      getUserMfaData: vi.fn(),
      updateUserMfa: vi.fn(),
      disableUserMfa: vi.fn(),
      setPendingMfaSecret: vi.fn(),
      getPendingMfaSecret: vi.fn(),
      clearPendingMfaSecret: vi.fn(),
      createActionToken: vi.fn(),
      getActionToken: vi.fn(),
      consumeActionToken: vi.fn(),
      cleanupExpiredActionTokens: vi.fn(),
      createAuditLog: vi.fn(),
      getUserAuditLogs: vi.fn(),
    }

    mockUserRepo = {
      getUserById: vi.fn(),
    } as unknown as UserRepository

    // Mock bcrypt
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-value')
    vi.mocked(bcrypt.compare).mockResolvedValue(true)

    // Mock encryption
    vi.mocked(MfaEncryption.encryptSecret).mockReturnValue('encrypted-secret')
    vi.mocked(MfaEncryption.decryptSecret).mockReturnValue('decrypted-secret')

    // Mock TOTP service
    vi.mocked(MfaTotpService.generateSecretWithQRCode).mockResolvedValue({
      secret: 'test-secret',
      uri: 'otpauth://totp/...',
      qrCode: 'data:image/png;base64,...',
    })

    vi.mocked(MfaTotpService.verifyToken).mockReturnValue(true)

    // Mock audit log service
    vi.mocked(MfaAuditLogService.logSuccess).mockReturnValue({
      id: 'log-id-1',
      userId: 'test-user-id',
      action: 'setup',
      ip: '192.168.1.1',
      userAgent: null,
      status: 'success',
      details: null,
      createdAt: new Date(),
    })

    vi.mocked(MfaAuditLogService.logFailure).mockReturnValue({
      id: 'log-id-2',
      userId: 'test-user-id',
      action: 'setup',
      ip: '192.168.1.1',
      userAgent: null,
      status: 'failed',
      details: { errorMessage: 'Test error' },
      createdAt: new Date(),
    })

    vi.mocked(MfaAuditLogService.formatForStorage).mockReturnValue({
      userId: 'test-user-id',
      action: 'setup',
      ip: '192.168.1.1',
      userAgent: null,
      status: 'success',
      details: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setupMFA', () => {
    it('should generate TOTP secret and QR code', async () => {
      const result = await MfaService.setupMFA(
        'user-123',
        'test@example.com',
        mockMfaRepo,
        mockContext,
      )

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('qrCode')
      expect(result).toHaveProperty('backupCodes')

      expect(result.secret).toBe('test-secret')
      expect(result.qrCode).toBe('data:image/png;base64,...')
      expect(result.backupCodes).toHaveLength(10) // 10 个备份码
    })

    it('should log success audit', async () => {
      await MfaService.setupMFA('user-123', 'test@example.com', mockMfaRepo, mockContext)

      expect(MfaAuditLogService.logSuccess).toHaveBeenCalledWith(
        'user-123',
        'setup',
        '0.0.0.0',
      )
      expect(mockMfaRepo.createAuditLog).toHaveBeenCalled()
    })

    it('should save pending secret to database', async () => {
      await MfaService.setupMFA('user-123', 'test@example.com', mockMfaRepo, mockContext)

      // setup 应该保存 pending secret
      expect(mockMfaRepo.setPendingMfaSecret).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          userId: 'user-123',
          secret: 'test-secret',
          backupCodes: expect.any(Array),
        }),
      )
    })
  })

  describe('enableMFA', () => {
    it('should enable MFA with valid token', async () => {
      // Mock pending secret
      vi.mocked(mockMfaRepo.getPendingMfaSecret).mockResolvedValue({
        secret: 'test-secret',
        backupCodes: ['code1', 'code2', 'code3'],
      })

      const params = {
        secret: 'test-secret', // Client provided, but ignored/verified against pending
        token: '123456',
        backupCodes: ['code1', 'code2', 'code3'],
      }

      const result = await MfaService.enableMFA(
        'user-123',
        params,
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(true)

      // Should fetch pending secret
      expect(mockMfaRepo.getPendingMfaSecret).toHaveBeenCalledWith(mockContext, { userId: 'user-123' })

      // 验证 TOTP (using pending secret)
      expect(MfaTotpService.verifyToken).toHaveBeenCalledWith('123456', 'test-secret')

      // 加密密钥
      expect(MfaEncryption.encryptSecret).toHaveBeenCalledWith('test-secret')

      // 哈希备份码
      expect(bcrypt.hash).toHaveBeenCalledTimes(3)

      // 保存到数据库
      expect(mockMfaRepo.updateUserMfa).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          userId: 'user-123',
          mfaEnabled: true,
          mfaSecret: 'encrypted-secret',
          mfaBackupCodes: expect.any(String),
          mfaSetupAt: expect.any(Date),
        }),
      )

      // Clear pending secret
      expect(mockMfaRepo.clearPendingMfaSecret).toHaveBeenCalledWith(mockContext, { userId: 'user-123' })

      // 记录成功审计
      expect(MfaAuditLogService.logSuccess).toHaveBeenCalledWith(
        'user-123',
        'enable',
        '192.168.1.1',
        'Test Browser',
      )
    })

    it('should throw error if no pending secret found', async () => {
      vi.mocked(mockMfaRepo.getPendingMfaSecret).mockResolvedValue(null)

      const params = {
        secret: 'test-secret',
        token: '123456',
        backupCodes: [],
      }

      await expect(
        MfaService.enableMFA('user-123', params, mockMfaRepo, mockContext, '192.168.1.1'),
      ).rejects.toThrow('Please setup MFA first')
    })

    it('should throw error for invalid TOTP token', async () => {
      vi.mocked(mockMfaRepo.getPendingMfaSecret).mockResolvedValue({
        secret: 'test-secret',
        backupCodes: ['code1', 'code2'],
      })

      // Mock TOTP 验证失败
      vi.mocked(MfaTotpService.verifyToken).mockReturnValue(false)

      const params = {
        secret: 'test-secret',
        token: '000000',
        backupCodes: ['code1', 'code2'],
      }

      await expect(
        MfaService.enableMFA('user-123', params, mockMfaRepo, mockContext, '192.168.1.1'),
      ).rejects.toThrow('Invalid TOTP token')

      // 记录失败审计
      expect(MfaAuditLogService.logFailure).toHaveBeenCalledWith(
        'user-123',
        'enable',
        '192.168.1.1',
        'Invalid TOTP token',
        undefined,
      )
      expect(mockMfaRepo.createAuditLog).toHaveBeenCalled()
    })
  })

  describe('disableMFA', () => {
    it('should disable MFA with valid token', async () => {
      // Mock user MFA data
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: '["hash1", "hash2"]',
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      // Mock user data for password verification
      vi.mocked(mockUserRepo.getUserById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-password',
      } as any)

      const result = await MfaService.disableMFA(
        'user-123',
        { token: '123456', password: 'password' },
        { mfa: mockMfaRepo, user: mockUserRepo },
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(true)

      // Verify user fetched
      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(mockContext, { userId: 'user-123' })

      // 获取用户 MFA 数据
      expect(mockMfaRepo.getUserMfaData).toHaveBeenCalledWith(mockContext, {
        userId: 'user-123',
      })

      // 解密密钥
      expect(MfaEncryption.decryptSecret).toHaveBeenCalledWith('encrypted-secret')

      // 验证 TOTP
      expect(MfaTotpService.verifyToken).toHaveBeenCalledWith('123456', 'decrypted-secret')

      // 禁用 MFA
      expect(mockMfaRepo.disableUserMfa).toHaveBeenCalledWith(mockContext, {
        userId: 'user-123',
      })

      // 记录成功审计
      expect(MfaAuditLogService.logSuccess).toHaveBeenCalledWith(
        'user-123',
        'disable',
        '192.168.1.1',
        'Test Browser',
        expect.objectContaining({
          verificationMethod: 'totp',
        }),
      )
    })

    it('should throw error when MFA not enabled', async () => {
      // Mock user data
      vi.mocked(mockUserRepo.getUserById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-password',
      } as any)

      // Mock 用户 MFA 未启用
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
        mfaLastVerifiedAt: null,
      })

      await expect(
        MfaService.disableMFA(
          'user-123',
          { token: '123456', password: 'password' },
          { mfa: mockMfaRepo, user: mockUserRepo },
          mockContext,
          '192.168.1.1',
        ),
      ).rejects.toThrow('MFA is not enabled')
    })

    it('should throw error for invalid token', async () => {
      // Mock user data
      vi.mocked(mockUserRepo.getUserById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-password',
      } as any)

      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: '[]',
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      // Mock TOTP 验证失败
      vi.mocked(MfaTotpService.verifyToken).mockReturnValue(false)

      await expect(
        MfaService.disableMFA(
          'user-123',
          { token: '000000', password: 'password' },
          { mfa: mockMfaRepo, user: mockUserRepo },
          mockContext,
          '192.168.1.1',
        ),
      ).rejects.toThrow('Invalid TOTP token')

      // 记录失败审计
      expect(MfaAuditLogService.logFailure).toHaveBeenCalled()
    })
  })

  describe('verifyMFA', () => {
    it('should verify with TOTP token', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: '["hash1", "hash2"]',
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      const result = await MfaService.verifyMFA(
        'user-123',
        '123456',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(true)

      // 解密密钥并验证 TOTP
      expect(MfaEncryption.decryptSecret).toHaveBeenCalledWith('encrypted-secret')
      expect(MfaTotpService.verifyToken).toHaveBeenCalledWith('123456', 'decrypted-secret')

      // 更新最后验证时间
      expect(mockMfaRepo.updateUserMfa).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          userId: 'user-123',
          mfaEnabled: true,
          mfaLastVerifiedAt: expect.any(Date),
        }),
      )

      // 记录成功审计
      expect(MfaAuditLogService.logSuccess).toHaveBeenCalledWith(
        'user-123',
        'verify',
        '192.168.1.1',
        'Test Browser',
        expect.objectContaining({
          verificationMethod: 'totp',
        }),
      )
    })

    it('should verify with backup code when TOTP fails', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: JSON.stringify(['hash1', 'hash2']),
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      // Mock TOTP 验证失败
      vi.mocked(MfaTotpService.verifyToken).mockReturnValue(false)

      // Mock bcrypt compare 找到匹配的备份码
      vi.mocked(bcrypt.compare)
        .mockResolvedValueOnce(false) // 第一个哈希不匹配
        .mockResolvedValue(true) // 第二个哈希匹配

      const result = await MfaService.verifyMFA(
        'user-123',
        'backup-code-123',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(true)

      // 尝试两个哈希
      expect(bcrypt.compare).toHaveBeenCalledTimes(2)
    })

    it('should return false when MFA not enabled', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
        mfaLastVerifiedAt: null,
      })

      const result = await MfaService.verifyMFA(
        'user-123',
        '123456',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(false)

      // 记录失败审计
      expect(MfaAuditLogService.logFailure).toHaveBeenCalledWith(
        'user-123',
        'verify',
        '192.168.1.1',
        'MFA not enabled',
        'Test Browser',
      )
    })

    it('should return false for invalid token', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: '[]',
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      // Mock TOTP 验证失败
      vi.mocked(MfaTotpService.verifyToken).mockReturnValue(false)
      // Mock bcrypt compare 不匹配
      vi.mocked(bcrypt.compare).mockResolvedValue(false)

      const result = await MfaService.verifyMFA(
        'user-123',
        '000000',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(false)

      // 不应该更新最后验证时间
      expect(mockMfaRepo.updateUserMfa).not.toHaveBeenCalled()
    })

    it('should remove the used backup code from the list after successful verification', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: JSON.stringify(['hash-code1', 'hash-code2', 'hash-code3']),
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: new Date(),
      })

      // Mock TOTP 验证失败
      vi.mocked(MfaTotpService.verifyToken).mockReturnValue(false)

      // Mock bcrypt compare 找到匹配的备份码
      vi.mocked(bcrypt.compare)
        .mockResolvedValueOnce(false) // code1 mismatch
        .mockResolvedValueOnce(true)  // code2 match

      const result = await MfaService.verifyMFA(
        'user-123',
        'code2',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
        'Test Browser',
      )

      expect(result).toBe(true)

      // 验证 mfaBackupCodes 更新
      expect(mockMfaRepo.updateUserMfa).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          userId: 'user-123',
          mfaEnabled: true,
          mfaLastVerifiedAt: expect.any(Date),
          mfaBackupCodes: JSON.stringify(['hash-code1', 'hash-code3']),
        }),
      )
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', () => {
      const codes = MfaService.generateBackupCodes()

      expect(codes).toHaveLength(10)
      expect(typeof codes[0]).toBe('string')
    })

    it('should generate codes in correct format', () => {
      const codes = MfaService.generateBackupCodes()

      // 格式：XXXX-XXXX-XX (10 位字符，有连字符）
      const codePattern = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{2}$/

      for (const code of codes) {
        expect(code).toMatch(codePattern)
      }
    })

    it('should generate unique codes', () => {
      const codes1 = MfaService.generateBackupCodes()
      const codes2 = MfaService.generateBackupCodes()

      const allCodes = [...codes1, ...codes2]
      const uniqueCodes = new Set(allCodes)

      expect(uniqueCodes.size).toBe(20) // 所有码都应该是唯一的
    })
  })

  describe('getMFAStatus', () => {
    it('should return status for user with MFA enabled', async () => {
      const setupDate = new Date('2026-02-01T00:00:00Z')
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: '[]',
        mfaSetupAt: setupDate,
        mfaLastVerifiedAt: new Date(),
      })

      const status = await MfaService.getMFAStatus('user-123', mockMfaRepo, mockContext)

      expect(status.enabled).toBe(true)
      expect(status.setupAt).toEqual(setupDate)
    })

    it('should return status for user with MFA disabled', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
        mfaLastVerifiedAt: null,
      })

      const status = await MfaService.getMFAStatus('user-123', mockMfaRepo, mockContext)

      expect(status.enabled).toBe(false)
      expect(status.setupAt).toBe(null)
    })

    it('should return default status when no data found', async () => {
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue(null)

      const status = await MfaService.getMFAStatus('user-123', mockMfaRepo, mockContext)

      expect(status.enabled).toBe(false)
      expect(status.setupAt).toBe(null)
    })
  })

  describe('integration: complete MFA lifecycle', () => {
    it('should complete setup -> enable -> verify -> disable flow', async () => {
      // 1. Setup
      const setupResult = await MfaService.setupMFA(
        'user-123',
        'test@example.com',
        mockMfaRepo,
        mockContext,
      )

      expect(setupResult.secret).toBeDefined()
      expect(setupResult.backupCodes).toHaveLength(10)

      // Mock pending secret retrieval for enable step
      vi.mocked(mockMfaRepo.getPendingMfaSecret).mockResolvedValue({
        secret: setupResult.secret,
        backupCodes: setupResult.backupCodes,
      })

      // 2. Enable
      const enableResult = await MfaService.enableMFA(
        'user-123',
        {
          secret: setupResult.secret,
          token: '123456',
          backupCodes: setupResult.backupCodes,
        },
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
      )

      expect(enableResult).toBe(true)

      // 模拟 enable 后仓储层可读到用户 MFA 数据
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaBackupCodes: JSON.stringify(['hash1', 'hash2']),
        mfaSetupAt: new Date(),
        mfaLastVerifiedAt: null,
      })

      // 3. Verify
      const verifyResult = await MfaService.verifyMFA(
        'user-123',
        '123456',
        mockMfaRepo,
        mockContext,
        '192.168.1.1',
      )

      expect(verifyResult).toBe(true)

      // 4. Disable
      vi.mocked(mockUserRepo.getUserById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-password',
      } as any)

      const disableResult = await MfaService.disableMFA(
        'user-123',
        { token: '123456', password: 'password' },
        { mfa: mockMfaRepo, user: mockUserRepo },
        mockContext,
        '192.168.1.1',
      )

      expect(disableResult).toBe(true)

      // 模拟 disable 后仓储层可读到禁用状态
      vi.mocked(mockMfaRepo.getUserMfaData).mockResolvedValue({
        userId: 'user-123',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
        mfaLastVerifiedAt: null,
      })

      // 5. Verify status
      const status = await MfaService.getMFAStatus('user-123', mockMfaRepo, mockContext)

      expect(status.enabled).toBe(false) // 已禁用
    })
  })
})
