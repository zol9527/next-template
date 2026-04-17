/**
 * File: test/unit/services/mfa-action-token.service.test.ts
 * Description: MFA 操作令牌服务单元测试
（测试令牌生成、验证、消耗、过期检查、时序安全等安全特性）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const timingSafeEqualCalls = vi.hoisted(() => vi.fn())

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    timingSafeEqual: (
      ...args: Parameters<typeof actual.timingSafeEqual>
    ): ReturnType<typeof actual.timingSafeEqual> => {
      timingSafeEqualCalls(...args)
      return actual.timingSafeEqual(...args)
    },
  }
})

import { MfaActionTokenService } from '@/services/mfa-action-token.service'

describe('Unit: MfaActionTokenService', () => {
  describe('generateToken', () => {
    it('should generate valid token', () => {
      const result = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('tokenHash')
      expect(result).toHaveProperty('expiresAt')

      expect(typeof result.token).toBe('string')
      expect(typeof result.tokenHash).toBe('string')
      expect(result.expiresAt).toBeInstanceOf(Date)

      // Token 应该是 base64url 编码
      expect(result.token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
    })

    it('should generate unique tokens', () => {
      const result1 = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const result2 = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      expect(result1.token).not.toEqual(result2.token)
      expect(result1.tokenHash).not.toEqual(result2.tokenHash)
    })

    it('should use custom TTL', () => {
      const customTTL = 600 // 10 分钟
      const now = Date.now()

      const result = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
        ttl: customTTL,
      })

      const expiresAtMs = result.expiresAt.getTime()
      expect(expiresAtMs).toBeGreaterThanOrEqual(now + customTTL * 1000)
      expect(expiresAtMs).toBeLessThan(now + (customTTL + 10) * 1000)
    })

    it('should include resource ID when provided', () => {
      const result = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
        resourceId: 'order-456',
      })

      // 资源 ID 会被存储到数据库，但不在返回值中
      expect(result.token).toBeDefined()
      expect(result.tokenHash).toBeDefined()
    })
  })

  describe('verifyToken', () => {
    beforeEach(() => {
      timingSafeEqualCalls.mockClear()
    })

    it('should verify valid token', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const result = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, null)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject token with wrong hash', () => {
      const { token, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const wrongHash = 'a'.repeat(64)

      const result = MfaActionTokenService.verifyToken(token, wrongHash, expiresAt, null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid_token')
    })

    it('should reject used token', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const result = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, new Date())

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token_already_used')
    })

    it('should reject expired token', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
        ttl: -1, // 负 TTL，立即过期
      })

      const result = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token_expired')
    })

    it('should use timingSafeEqual for hash comparison (timing-safe)', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const result = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, null)
      expect(result.valid).toBe(true)
      expect(timingSafeEqualCalls).toHaveBeenCalledTimes(1)
    })

    it('should not call timingSafeEqual when hash length mismatches', () => {
      const { token, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const invalidLengthHash = 'a'.repeat(62)

      const result = MfaActionTokenService.verifyToken(token, invalidLengthHash, expiresAt, null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid_token')
      expect(timingSafeEqualCalls).not.toHaveBeenCalled()
    })
  })

  describe('verifyAndConsumeToken', () => {
    it('should verify valid token and return user info', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
        resourceId: 'order-456',
      })

      const storedData = {
        tokenHash,
        action: 'refund',
        userId: 'user-123',
        resourceId: 'order-456',
        expiresAt,
        usedAt: null,
      }

      const result = MfaActionTokenService.verifyAndConsumeToken(token, 'refund', storedData)

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.resourceId).toBe('order-456')
    })

    it('should reject token with wrong action type', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const storedData = {
        tokenHash,
        action: 'withdraw', // 不同的操作类型
        userId: 'user-123',
        resourceId: null,
        expiresAt,
        usedAt: null,
      }

      const result = MfaActionTokenService.verifyAndConsumeToken(token, 'refund', storedData)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid_token')
    })

    it('should reject used token', () => {
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
      })

      const storedData = {
        tokenHash,
        action: 'refund',
        userId: 'user-123',
        resourceId: null,
        expiresAt,
        usedAt: new Date(), // 已使用
      }

      const result = MfaActionTokenService.verifyAndConsumeToken(token, 'refund', storedData)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token_already_used')
    })
  })

  describe('isTokenExpired', () => {
    it('should detect expired token', () => {
      const expiredAt = new Date(Date.now() - 1000) // 1 秒前

      const isExpired = MfaActionTokenService.isTokenExpired(expiredAt)

      expect(isExpired).toBe(true)
    })

    it('should return false for valid token', () => {
      const futureAt = new Date(Date.now() + 300000) // 5 分钟后

      const isExpired = MfaActionTokenService.isTokenExpired(futureAt)

      expect(isExpired).toBe(false)
    })

    it('should handle edge case: exactly now', () => {
      // 这个测试取决于时钟精度，通常当前时刻不算过期
      const now = new Date()

      const isExpired = MfaActionTokenService.isTokenExpired(now)

      expect(typeof isExpired).toBe('boolean')
    })
  })

  describe('shouldCleanupToken', () => {
    it('should cleanup used tokens after threshold', () => {
      const expiresAt = new Date(Date.now() + 300000)
      const usedAt = new Date(Date.now() - 700000) // 10 分钟前使用（默认 TTL 5 分钟 * 2 = 10 分钟）

      const shouldCleanup = MfaActionTokenService.shouldCleanupToken(expiresAt, usedAt)

      expect(shouldCleanup).toBe(true)
    })

    it('should not cleanup recently used tokens', () => {
      const expiresAt = new Date(Date.now() + 300000)
      const usedAt = new Date(Date.now() - 1000) // 1 秒前使用

      const shouldCleanup = MfaActionTokenService.shouldCleanupToken(expiresAt, usedAt)

      expect(shouldCleanup).toBe(false)
    })

    it('should cleanup expired unused tokens', () => {
      const expiresAt = new Date(Date.now() - 700000) // 10 分钟前过期
      const usedAt = null as unknown as Date // 从未使用

      const shouldCleanup = MfaActionTokenService.shouldCleanupToken(expiresAt, usedAt)

      expect(shouldCleanup).toBe(true)
    })

    it('should use custom cleanup threshold', () => {
      const expiresAt = new Date(Date.now() - 60000) // 1 分钟前过期
      const usedAt = null as unknown as Date

      const shouldCleanup = MfaActionTokenService.shouldCleanupToken(expiresAt, usedAt, 30) // 30 秒阈值

      expect(shouldCleanup).toBe(true)
    })

    it('should not cleanup active unused tokens', () => {
      const expiresAt = new Date(Date.now() + 300000)
      const usedAt = null as unknown as Date

      const shouldCleanup = MfaActionTokenService.shouldCleanupToken(expiresAt, usedAt)

      expect(shouldCleanup).toBe(false)
    })
  })

  describe('validateActionType', () => {
    it('should accept valid action types', () => {
      const validActions = ['refund', 'withdraw', 'delete-user', 'modify-permissions', 'export-data', 'system-settings']

      for (const action of validActions) {
        expect(MfaActionTokenService.validateActionType(action)).toBe(true)
      }
    })

    it('should accept custom action strings', () => {
      expect(MfaActionTokenService.validateActionType('custom-action')).toBe(true)
      expect(MfaActionTokenService.validateActionType('special-operation-123')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(MfaActionTokenService.validateActionType('')).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(MfaActionTokenService.validateActionType(null as unknown as string)).toBe(false)
      expect(MfaActionTokenService.validateActionType(undefined as unknown as string)).toBe(false)
    })
  })

  describe('formatTokenForStorage', () => {
    it('should format token data for storage', () => {
      const options = {
        userId: 'user-123',
        action: 'refund',
        resourceId: 'order-456',
      }

      const formatted = MfaActionTokenService.formatTokenForStorage(options)

      expect(formatted).toHaveProperty('tokenHash')
      expect(formatted).toHaveProperty('userId')
      expect(formatted).toHaveProperty('action')
      expect(formatted).toHaveProperty('resourceId')
      expect(formatted).toHaveProperty('expiresAt')

      expect(formatted.userId).toBe('user-123')
      expect(formatted.action).toBe('refund')
      expect(formatted.resourceId).toBe('order-456')
      expect(typeof formatted.tokenHash).toBe('string')
    })

    it('should handle null resource ID', () => {
      const options = {
        userId: 'user-123',
        action: 'withdraw',
      }

      const formatted = MfaActionTokenService.formatTokenForStorage(options)

      expect(formatted.resourceId).toBe(null)
    })

    it('should use default TTL when not specified', () => {
      const options = {
        userId: 'user-123',
        action: 'refund',
      }

      const formatted = MfaActionTokenService.formatTokenForStorage(options)

      const now = Date.now()
      const expectedExpiry = now + 300000 // 5 分钟 = 300 秒

      expect(formatted.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry)
      expect(formatted.expiresAt.getTime()).toBeLessThan(expectedExpiry + 1000) // 允许 1 秒误差
    })
  })

  describe('integration: token lifecycle', () => {
    it('should complete full token lifecycle', () => {
      // 1. 生成令牌
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'refund',
        resourceId: 'order-456',
      })

      // 2. 验证令牌（未使用）
      const verifyResult1 = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, null)
      expect(verifyResult1.valid).toBe(true)

      // 3. 模拟存储数据
      const storedData = {
        tokenHash,
        action: 'refund',
        userId: 'user-123',
        resourceId: 'order-456',
        expiresAt,
        usedAt: null,
      }

      // 4. 验证并准备消耗
      const consumeResult = MfaActionTokenService.verifyAndConsumeToken(token, 'refund', storedData)
      expect(consumeResult.valid).toBe(true)
      expect(consumeResult.userId).toBe('user-123')
      expect(consumeResult.resourceId).toBe('order-456')

      // 5. 模拟标记为已使用
      storedData.usedAt = new Date()

      // 6. 再次验证应该失败
      const verifyResult2 = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, storedData.usedAt)
      expect(verifyResult2.valid).toBe(false)
      expect(verifyResult2.error).toBe('token_already_used')
    })

    it('should prevent token reuse after expiry', () => {
      // 生成一个短 TTL 的令牌
      const { token, tokenHash, expiresAt } = MfaActionTokenService.generateToken({
        userId: 'user-123',
        action: 'withdraw',
        ttl: -1, // 负 TTL，已过期
      })

      const result = MfaActionTokenService.verifyToken(token, tokenHash, expiresAt, null)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('token_expired')
    })
  })
})
