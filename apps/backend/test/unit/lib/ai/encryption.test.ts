/**
 * File: test/unit/lib/ai/encryption.test.ts
 * Description: AI API Key 加密工具单元测试
 *   测试 AES-256-GCM 加密/解密、脱敏、IV 随机性、篡改检测等安全特性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiKeyEncryption, maskApiKey, resetAiKeyCache } from '@/lib/ai/core/encryption'
import { env } from '@/config'

// Mock config 提供 AI 加密密钥
vi.mock('@/config', () => ({
  env: {
    AI_API_KEY_ENCRYPTION_KEY: 'test-ai-encryption-key-32-bytes-long',
  },
}))

describe('Unit: AiKeyEncryption', () => {
  beforeEach(() => {
    resetAiKeyCache()
  })

  afterEach(() => {
    resetAiKeyCache()
  })

  // ==================== encrypt ====================

  describe('encrypt', () => {
    it('应成功加密 API Key 并返回 base64 字符串', () => {
      const plaintext = 'sk-abcdef1234567890abcdef'

      const encrypted = AiKeyEncryption.encrypt(plaintext)

      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
      expect(encrypted).not.toEqual(plaintext)
    })

    it('相同明文应产生不同密文（IV 随机性）', () => {
      const plaintext = 'sk-same-key-for-test'

      const encrypted1 = AiKeyEncryption.encrypt(plaintext)
      const encrypted2 = AiKeyEncryption.encrypt(plaintext)

      // 由于每次使用随机 IV，相同明文的密文应该不同
      expect(encrypted1).not.toEqual(encrypted2)
    })

    it('空字符串应抛出错误', () => {
      expect(() => AiKeyEncryption.encrypt('')).toThrow('Plaintext must be a non-empty string')
    })

    it('null 输入应抛出错误', () => {
      expect(() => AiKeyEncryption.encrypt(null as unknown as string)).toThrow(
        'Plaintext must be a non-empty string',
      )
    })

    it('undefined 输入应抛出错误', () => {
      expect(() => AiKeyEncryption.encrypt(undefined as unknown as string)).toThrow(
        'Plaintext must be a non-empty string',
      )
    })
  })

  // ==================== decrypt ====================

  describe('decrypt', () => {
    it('应正确解密加密后的 API Key', () => {
      const plaintext = 'sk-abcdef1234567890abcdef'

      const encrypted = AiKeyEncryption.encrypt(plaintext)
      const decrypted = AiKeyEncryption.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('应正确处理 UTF-8 字符', () => {
      const plaintext = '密钥测试！@#$%^&*()'

      const encrypted = AiKeyEncryption.encrypt(plaintext)
      const decrypted = AiKeyEncryption.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('空字符串应抛出错误', () => {
      expect(() => AiKeyEncryption.decrypt('')).toThrow('Encrypted data must be a non-empty string')
    })

    it('null 输入应抛出错误', () => {
      expect(() => AiKeyEncryption.decrypt(null as unknown as string)).toThrow(
        'Encrypted data must be a non-empty string',
      )
    })

    it('无效 base64 数据应抛出错误', () => {
      expect(() => AiKeyEncryption.decrypt('not-valid-base64!!!')).toThrow()
    })

    it('篡改的密文应抛出解密错误（GCM 认证失败）', () => {
      const plaintext = 'sk-test-key-12345'
      const encrypted = AiKeyEncryption.encrypt(plaintext)

      // 篡改密文最后几个字符（破坏认证标签）
      const tampered = encrypted.slice(0, -5) + 'XXXXX'

      expect(() => AiKeyEncryption.decrypt(tampered)).toThrow(
        'Failed to decrypt AI API key: invalid data or key',
      )
    })
  })

  // ==================== 往返加密/解密 ====================

  describe('往返加密/解密', () => {
    it('多次加解密应保持数据完整', () => {
      const testCases = [
        'sk-1234567890abcdef',
        'minimax-api-key-abcdefghijklmnopqrstuvwxyz',
        'short',
        'a'.repeat(200), // 长字符串
      ]

      for (const plaintext of testCases) {
        const encrypted = AiKeyEncryption.encrypt(plaintext)
        const decrypted = AiKeyEncryption.decrypt(encrypted)

        expect(decrypted).toBe(plaintext)
      }
    })
  })

  // ==================== 安全特性 ====================

  describe('安全特性', () => {
    it('应使用 AES-256-GCM（IV=12 字节，AuthTag=16 字节）', () => {
      const plaintext = 'sk-test-key'
      const encrypted = AiKeyEncryption.encrypt(plaintext)

      // 解码 base64 得到原始字节
      const rawBuffer = Buffer.from(encrypted, 'base64')

      // 最小长度：IV(12) + authTag(16) = 28 字节
      expect(rawBuffer.length).toBeGreaterThanOrEqual(28)

      // 密文部分应大于 0（plaintext 非空）
      const ciphertextLength = rawBuffer.length - 12 - 16
      expect(ciphertextLength).toBeGreaterThan(0)
    })

    it('密钥轮换后解密旧密文应失败', () => {
      const plaintext = 'sk-original-key-test'

      // 使用原始密钥加密
      const encrypted = AiKeyEncryption.encrypt(plaintext)

      // 模拟密钥轮换
      ;(env as Record<string, unknown>).AI_API_KEY_ENCRYPTION_KEY = 'new-encryption-key-after-rotation'
      resetAiKeyCache()

      // 新密钥解密旧密文应失败
      expect(() => AiKeyEncryption.decrypt(encrypted)).toThrow()
    })
  })
})

// ==================== maskApiKey ====================

describe('Unit: maskApiKey', () => {
  it('应正确脱敏长 API Key（保留前3后4，中间 ****）', () => {
    const key = 'sk-1234567890abcdefghijklmnop'

    const masked = maskApiKey(key)

    expect(masked).toBe('sk-****mnop')
  })

  it('应正确脱敏标准长度 API Key', () => {
    const key = 'sk-abcdefghij'

    const masked = maskApiKey(key)

    // 前3后4
    expect(masked).toBe('sk-****ghij')
  })

  it('长度刚好超过 8 的 Key 应正常脱敏', () => {
    const key = '123456789'

    const masked = maskApiKey(key)

    // 前3后4
    expect(masked).toBe('123****6789')
  })

  it('长度等于 8 的 Key 应返回 ****', () => {
    const key = '12345678'

    const masked = maskApiKey(key)

    expect(masked).toBe('****')
  })

  it('长度小于 8 的短密钥应返回 ****', () => {
    const key = 'sk-abc'

    const masked = maskApiKey(key)

    expect(masked).toBe('****')
  })

  it('空字符串应返回 ****', () => {
    const masked = maskApiKey('')

    expect(masked).toBe('****')
  })
})
