/**
 * File: test/unit/lib/security/mfa-encryption.test.ts
 * Description: MFA 加密工具单元测试
（测试 AES-256-GCM 加密/解密、密钥派生、完整性验证等安全特性）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MfaEncryption, resetEncryptionKeyCache } from '@/lib/security/mfa-encryption'
import { env } from '@/config'

// Mock config to provide encryption key
vi.mock('@/config', () => ({
  env: {
    MFA_SECRET_ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long',
    TOTP_ISSUER: 'Test App',
    TOTP_SERVICE_NAME: 'Test App',
    TOTP_DIGITS: 6,
    TOTP_STEP: 30,
    MFA_ACTION_TOKEN_TTL: 300,
    DATABASE_PROVIDER: 'sqlite',
  },
}))

describe('Unit: MfaEncryption', () => {
  beforeEach(() => {
    resetEncryptionKeyCache()
  })

  afterEach(() => {
    resetEncryptionKeyCache()
  })

  describe('encryptSecret', () => {
    it('should encrypt plaintext secret successfully', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'

      const encrypted = MfaEncryption.encryptSecret(plaintext)

      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
      expect(encrypted).not.toEqual(plaintext)
    })

    it('should produce different ciphertext for same plaintext (IV randomness)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'

      const encrypted1 = MfaEncryption.encryptSecret(plaintext)
      const encrypted2 = MfaEncryption.encryptSecret(plaintext)

      // 由于使用随机 IV，两次加密结果应该不同
      expect(encrypted1).not.toEqual(encrypted2)
    })

    it('should throw error for empty string', () => {
      expect(() => MfaEncryption.encryptSecret('')).toThrow('Plaintext must be a non-empty string')
    })

    it('should throw error for null input', () => {
      expect(() => MfaEncryption.encryptSecret(null as unknown as string)).toThrow(
        'Plaintext must be a non-empty string',
      )
    })

    it('should throw error for undefined input', () => {
      expect(() => MfaEncryption.encryptSecret(undefined as unknown as string)).toThrow(
        'Plaintext must be a non-empty string',
      )
    })
  })

  describe('decryptSecret', () => {
    it('should decrypt encrypted secret successfully', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      const decrypted = MfaEncryption.decryptSecret(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt UTF-8 characters correctly', () => {
      const plaintext = '这是一个测试密钥！@#$%'

      const encrypted = MfaEncryption.encryptSecret(plaintext)
      const decrypted = MfaEncryption.decryptSecret(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for empty string', () => {
      expect(() => MfaEncryption.decryptSecret('')).toThrow(
        'Encrypted data must be a non-empty string',
      )
    })

    it('should throw error for invalid base64', () => {
      expect(() => MfaEncryption.decryptSecret('invalid-base64!@#$')).toThrow()
    })

    it('should throw error for tampered data (authentication failure)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      // 篡改最后几个字符（破坏认证标签）
      const tampered = encrypted.slice(0, -5) + 'XXXXX'

      expect(() => MfaEncryption.decryptSecret(tampered)).toThrow('Failed to decrypt secret')
    })
  })

  describe('isValidSecret', () => {
    it('should return true for valid encrypted secret', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      const isValid = MfaEncryption.isValidSecret(encrypted)

      expect(isValid).toBe(true)
    })

    it('should return false for invalid base64', () => {
      const isValid = MfaEncryption.isValidSecret('invalid-base64!@#$')

      expect(isValid).toBe(false)
    })

    it('should return false for empty string', () => {
      const isValid = MfaEncryption.isValidSecret('')

      expect(isValid).toBe(false)
    })

    it('should return false for tampered data', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      // 篡改数据
      const tampered = encrypted.slice(0, -5) + 'XXXXX'

      const isValid = MfaEncryption.isValidSecret(tampered)

      expect(isValid).toBe(false)
    })

    it('should not throw error for invalid input', () => {
      expect(() => MfaEncryption.isValidSecret('invalid')).not.toThrow()
    })
  })

  describe('round-trip encryption/decryption', () => {
    it('should preserve data through encrypt-decrypt cycle', () => {
      const testCases = [
        'JBSWY3DPEHPK3PXP',
        'ABCD1234EFGH5678',
        'short',
        'a'.repeat(100), // 长字符串
      ]

      for (const plaintext of testCases) {
        const encrypted = MfaEncryption.encryptSecret(plaintext)
        const decrypted = MfaEncryption.decryptSecret(encrypted)

        expect(decrypted).toBe(plaintext)
      }
    })
  })

  describe('security characteristics', () => {
    it('should use AES-256-GCM (IV = 12 bytes, auth tag = 16 bytes)', () => {
      const plaintext = 'test-secret'
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      // 解密 base64 得到原始数据
      const decryptedBuffer = Buffer.from(encrypted, 'base64')

      // 验证最小长度：IV(12) + authTag(16) = 28 bytes
      expect(decryptedBuffer.length).toBeGreaterThanOrEqual(28)

      // 密文长度应该至少为 0
      const ciphertextLength = decryptedBuffer.length - 12 - 16
      expect(ciphertextLength).toBeGreaterThan(0)
    })

    it('should fail decryption with wrong key (key rotation scenario)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP'

      // 使用原始密钥加密
      const encrypted = MfaEncryption.encryptSecret(plaintext)

      // 模拟密钥轮换（修改环境变量）
      ;(env as any).MFA_SECRET_ENCRYPTION_KEY = 'different-encryption-key-for-testing'
      resetEncryptionKeyCache()

      // 使用新密钥解密应该失败（认证失败）
      expect(() => MfaEncryption.decryptSecret(encrypted)).toThrow()
    })
  })
})
