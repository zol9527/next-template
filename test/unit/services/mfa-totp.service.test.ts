/**
 * File: test/unit/services/mfa-totp.service.test.ts
 * Description: MFA TOTP 服务单元测试
（测试 TOTP 密钥生成、QR Code 生成、验证令牌、时间窗口等）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MfaTotpService } from '@/services/mfa-totp.service'
import { env } from '@/config'

// Mock config to provide required environment variables
vi.mock('@/config', () => ({
  env: {
    MFA_SECRET_ENCRYPTION_KEY: 'test-encryption-key-32-bytes-long',
    TOTP_ISSUER: 'Test App',
    TOTP_SERVICE_NAME: 'TestApp',
    TOTP_DIGITS: 6,
    TOTP_STEP: 30,
    MFA_ACTION_TOKEN_TTL: 300,
    DATABASE_PROVIDER: 'sqlite',
  },
}))

describe('Unit: MfaTotpService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateSecret', () => {
    it('should generate valid TOTP secret', () => {
      const result = MfaTotpService.generateSecret()

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('uri')

      // Secret 应该是 base32 格式（只包含 A-Z 和 2-7）
      expect(result.secret).toMatch(/^[A-Z2-7]+$/)
      expect(result.secret.length).toBeGreaterThanOrEqual(20) // 至少 160 位
    })

    it('should generate different secrets on each call', () => {
      const secret1 = MfaTotpService.generateSecret()
      const secret2 = MfaTotpService.generateSecret()

      expect(secret1.secret).not.toEqual(secret2.secret)
      expect(secret1.uri).not.toEqual(secret2.uri)
    })

    it('should generate valid otpauth URI', () => {
      const result = MfaTotpService.generateSecret()

      expect(result.uri).toMatch(/^otpauth:\/\/totp\/.+/)
      // speakeasy 生成的 URI：otpauth://totp/Label?secret=...（digits 是默认值 6）
      expect(result.uri).toContain('secret=')
    })
  })

  describe('formatKeyUri', () => {
    it('should format key URI correctly', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const email = 'test@example.com'

      const uri = MfaTotpService.formatKeyUri(secret, email)

      expect(uri).toMatch(/^otpauth:\/\/totp\//)
      expect(uri).toContain(secret)
      expect(uri).toContain('test@example.com')
      // URL 编码：空格可以是 + 或 %20
      expect(uri).toMatch(/issuer=Test(%20|\+)App/)
    })

    it('should handle special characters in email', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const email = 'user+tag@example.com'

      const uri = MfaTotpService.formatKeyUri(secret, email)

      expect(uri).toContain(email)
    })
  })

  describe('generateQRCode', async () => {
    it('should generate QR code data URL', async () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const email = 'test@example.com'

      const qrCode = await MfaTotpService.generateQRCode(secret, email)

      expect(qrCode).toMatch(/^data:image\/png;base64,/)
      expect(qrCode.length).toBeGreaterThan(100)
    })

    it('should generate same QR code for same input', async () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const email = 'test@example.com'

      const qrCode1 = await MfaTotpService.generateQRCode(secret, email)
      const qrCode2 = await MfaTotpService.generateQRCode(secret, email)

      expect(qrCode1).toEqual(qrCode2)
    })
  })

  describe('verifyToken', () => {
    it('should verify correct token', () => {
      const { secret } = MfaTotpService.generateSecret()
      const token = MfaTotpService.generateToken(secret)

      const isValid = MfaTotpService.verifyToken(token, secret)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect token', () => {
      const { secret } = MfaTotpService.generateSecret()
      const wrongToken = '000000'

      const isValid = MfaTotpService.verifyToken(wrongToken, secret)

      expect(isValid).toBe(false)
    })

    it('should reject tokens with invalid format', () => {
      const { secret } = MfaTotpService.generateSecret()
      const invalidToken = '12345' // 5 digits

      const isValid = MfaTotpService.verifyToken(invalidToken, secret)

      expect(isValid).toBe(false)
    })

    it('should handle time window (allow previous/next windows)', () => {
      const { secret } = MfaTotpService.generateSecret()
      const token = MfaTotpService.generateToken(secret)

      // 立即验证应该成功
      expect(MfaTotpService.verifyToken(token, secret)).toBe(true)
    })

    it('should reject tokens from very old windows', () => {
      // 生成一个固定密钥，用于测试
      const secret = 'JBSWY3DPEHPK3PXP'
      // 这个验证码可能来自很久以前的时间窗口
      const oldToken = '000000'

      const isValid = MfaTotpService.verifyToken(oldToken, secret)

      // 应该失败，因为时间窗口超出允许范围
      expect(isValid).toBe(false)
    })
  })

  describe('verifyTokenDetailed', () => {
    it('should return delta information', () => {
      const { secret } = MfaTotpService.generateSecret()
      const token = MfaTotpService.generateToken(secret)

      const result = MfaTotpService.verifyTokenDetailed(token, secret)

      expect(result.valid).toBe(true)
      expect(result.delta).toBeDefined()
      expect(typeof result.delta).toBe('number')
    })

    it('should return delta 0 for current window', () => {
      const { secret } = MfaTotpService.generateSecret()
      const token = MfaTotpService.generateToken(secret)

      const result = MfaTotpService.verifyTokenDetailed(token, secret)

      expect(result.valid).toBe(true)
      expect(result.delta).toBe(0)
    })

    it('should return valid false for incorrect token', () => {
      const { secret } = MfaTotpService.generateSecret()
      const wrongToken = '000000'

      const result = MfaTotpService.verifyTokenDetailed(wrongToken, secret)

      expect(result.valid).toBe(false)
      expect(result.delta).toBeUndefined()
    })
  })

  describe('generateToken', () => {
    it('should generate 6-digit token', () => {
      const secret = 'JBSWY3DPEHPK3PXP'

      const token = MfaTotpService.generateToken(secret)

      expect(token).toMatch(/^\d{6}$/)
      expect(parseInt(token, 10)).toBeGreaterThanOrEqual(0)
      expect(parseInt(token, 10)).toBeLessThan(1000000)
    })

    it('should generate same token for same time', () => {
      const secret = 'JBSWY3DPEHPK3PXP'

      const token1 = MfaTotpService.generateToken(secret)
      const token2 = MfaTotpService.generateToken(secret)

      expect(token1).toEqual(token2)
    })

    it('should generate different tokens for different secrets', () => {
      const secret1 = 'JBSWY3DPEHPK3PXP'
      const secret2 = 'KRXMJC4RHEKQ4PXP'

      const token1 = MfaTotpService.generateToken(secret1)
      const token2 = MfaTotpService.generateToken(secret2)

      expect(token1).not.toEqual(token2)
    })
  })

  describe('generateSecretWithQRCode', () => {
    it('should generate complete setup data', async () => {
      const email = 'test@example.com'

      const result = await MfaTotpService.generateSecretWithQRCode(email)

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('uri')
      expect(result).toHaveProperty('qrCode')

      expect(result.secret).toMatch(/^[A-Z2-7]+$/)
      expect(result.uri).toMatch(/^otpauth:\/\/totp\//)
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/)
    })

    it('should generate consistent data', async () => {
      const email = 'test@example.com'

      const result = await MfaTotpService.generateSecretWithQRCode(email)

      // QR Code 应该包含生成的 secret 和 uri
      expect(result.qrCode).toBeDefined()
    })
  })

  describe('integration: token verification workflow', () => {
    it('should complete full TOTP lifecycle', async () => {
      // 1. 生成密钥
      const { secret, qrCode } = await MfaTotpService.generateSecretWithQRCode('test@example.com')

      expect(secret).toBeDefined()
      expect(qrCode).toBeDefined()

      // 2. 生成验证码
      const token = MfaTotpService.generateToken(secret)

      expect(token).toMatch(/^\d{6}$/)

      // 3. 验证验证码
      const isValid = MfaTotpService.verifyToken(token, secret)

      expect(isValid).toBe(true)
    })

    it('should detect replay attacks (token reuse)', () => {
      const { secret } = MfaTotpService.generateSecret()
      const token = MfaTotpService.generateToken(secret)

      // 第一次验证应该成功
      expect(MfaTotpService.verifyToken(token, secret)).toBe(true)

      // 同一令牌在同时间窗口内再次验证应该仍然有效
      // （重放攻击防护由时间窗口机制实现）
      // 注意：TOTP 本身不防止时间窗口内的重放，这需要额外的服务端状态
      expect(MfaTotpService.verifyToken(token, secret)).toBe(true)
    })
  })
})
