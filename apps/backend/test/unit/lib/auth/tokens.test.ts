/**
 * Unit: Tokens 模块测试
 *
 * Description: 测试 Refresh Token 的生成和哈希功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TokenManager } from '@/lib/security/token-manager'

describe('Tokens 模块测试', () => {
  beforeEach(() => {
    // 确保环境变量已设置（由 vitest.setup.ts 提供）
    if (!process.env.AUTH_JWT_ACCESS_SECRET) {
      throw new Error('AUTH_JWT_ACCESS_SECRET must be set for tests')
    }
    if (!process.env.AUTH_REFRESH_TOKEN_PEPPER) {
      throw new Error('AUTH_REFRESH_TOKEN_PEPPER must be set for tests')
    }
  })

  describe('createRefreshToken', () => {
    /**
     * Function: createRefreshToken
     *
     * Description: 测试创建新的刷新令牌对
     *
     * Returns:
     *   pair(RefreshTokenPair): 包含 token 和 tokenHash 的令牌对
     *   pair.token(string): 明文刷新令牌
     *   pair.tokenHash(string): 刷新令牌的哈希值
     */
    it('应该生成有效的刷新令牌对', () => {
      const pair = TokenManager.createRefreshToken()

      expect(pair).toBeDefined()
      expect(pair.token).toBeTypeOf('string')
      expect(pair.tokenHash).toBeTypeOf('string')
      expect(pair.token.length).toBeGreaterThan(0)
      expect(pair.tokenHash.length).toBeGreaterThan(0)
    })

    /**
     * Function: createRefreshToken (格式验证)
     *
     * Description: 测试生成的令牌格式是否符合 base64url 编码
     */
    it('应该生成 base64url 编码的令牌', () => {
      const pair = TokenManager.createRefreshToken()

      // base64url 编码的字符集：A-Z, a-z, 0-9, -, _, =
      const base64UrlPattern = /^[A-Za-z0-9\-_]+=*$/
      expect(pair.token).toMatch(base64UrlPattern)
    })

    /**
     * Function: createRefreshToken (哈希格式验证)
     *
     * Description: 测试生成的哈希值格式是否符合十六进制
     */
    it('应该生成十六进制格式的哈希值', () => {
      const pair = TokenManager.createRefreshToken()

      // SHA-256 哈希输出 64 位十六进制字符
      const hexPattern = /^[a-f0-9]{64}$/
      expect(pair.tokenHash).toMatch(hexPattern)
    })

    /**
     * Function: createRefreshToken (唯一性)
     *
     * Description: 测试每次生成的令牌都是唯一的
     */
    it('应该每次生成唯一的令牌', () => {
      const pair1 = TokenManager.createRefreshToken()
      const pair2 = TokenManager.createRefreshToken()

      expect(pair1.token).not.toBe(pair2.token)
      expect(pair1.tokenHash).not.toBe(pair2.tokenHash)
    })

    /**
     * Function: createRefreshToken (一致性)
     *
     * Description: 测试令牌对的一致性（哈希应匹配令牌）
     */
    it('应该生成一致的令牌对（哈希应匹配令牌）', () => {
      const pair = TokenManager.createRefreshToken()

      // 使用哈希函数验证一致性
      const computedHash = TokenManager.hashRefreshToken(pair.token)
      expect(pair.tokenHash).toBe(computedHash)
    })

    /**
     * Function: createRefreshToken (长度固定性)
     *
     * Description: 测试生成的令牌长度是否固定（32 字节 = 43 位 base64url 字符）
     */
    it('应该生成固定长度的令牌', () => {
      const pair = TokenManager.createRefreshToken()

      // 32 字节随机数经过 base64url 编码后应为 43 字符（无填充）或 44 字符（有填充）
      expect(pair.token.length).toBeGreaterThanOrEqual(43)
      expect(pair.token.length).toBeLessThanOrEqual(44)
    })
  })

  describe('hashRefreshToken', () => {
    /**
     * Function: hashRefreshToken
     *
     * Description: 测试对刷新令牌进行哈希
     *
     * Parameters:
     *   token(string): 待哈希的刷新令牌
     *
     * Returns:
     *   hash(string): 令牌的 SHA-256 HMAC 哈希值（十六进制格式）
     */
    it('应该生成有效的哈希值', () => {
      const token = 'test_refresh_token_12345'
      const hash = TokenManager.hashRefreshToken(token)

      expect(hash).toBeTypeOf('string')
      expect(hash.length).toBe(64) // SHA-256 输出 64 位十六进制字符
    })

    /**
     * Function: hashRefreshToken (确定性)
     *
     * Description: 测试相同输入应产生相同哈希值
     */
    it('应该对相同输入产生相同的哈希值', () => {
      const token = 'consistent_token_input'
      const hash1 = TokenManager.hashRefreshToken(token)
      const hash2 = TokenManager.hashRefreshToken(token)

      expect(hash1).toBe(hash2)
    })

    /**
     * Function: hashRefreshToken (差异性)
     *
     * Description: 测试不同输入应产生不同哈希值
     */
    it('应该对不同输入产生不同的哈希值', () => {
      const token1 = 'token_one_123'
      const token2 = 'token_two_456'
      const hash1 = TokenManager.hashRefreshToken(token1)
      const hash2 = TokenManager.hashRefreshToken(token2)

      expect(hash1).not.toBe(hash2)
    })

    /**
     * Function: hashRefreshToken (大小写敏感)
     *
     * Description: 测试哈希函数是否大小写敏感
     */
    it('应该区分大小写', () => {
      const token1 = 'TokenABC'
      const token2 = 'tokenabc'
      const hash1 = TokenManager.hashRefreshToken(token1)
      const hash2 = TokenManager.hashRefreshToken(token2)

      expect(hash1).not.toBe(hash2)
    })

    /**
     * Function: hashRefreshToken (特殊字符)
     *
     * Description: 测试处理包含特殊字符的令牌
     */
    it('应该正确处理包含特殊字符的令牌', () => {
      const specialToken = 'token_with-special.chars@123!'
      const hash = TokenManager.hashRefreshToken(specialToken)

      expect(hash).toBeTypeOf('string')
      expect(hash.length).toBe(64)
    })

    /**
     * Function: hashRefreshToken (空字符串)
     *
     * Description: 测试处理空字符串的情况
     */
    it('应该正确处理空字符串', () => {
      const emptyToken = ''
      const hash = TokenManager.hashRefreshToken(emptyToken)

      expect(hash).toBeTypeOf('string')
      expect(hash.length).toBe(64)
    })

    /**
     * Function: hashRefreshToken (长令牌)
     *
     * Description: 测试处理较长的令牌
     */
    it('应该正确处理长令牌', () => {
      const longToken = 'a'.repeat(1000)
      const hash = TokenManager.hashRefreshToken(longToken)

      expect(hash).toBeTypeOf('string')
      expect(hash.length).toBe(64)
    })
  })

  describe('令牌和哈希的关系', () => {
    /**
     * Function: 令牌哈希验证
     *
     * Description: 测试验证令牌和其哈希值的关系
     */
    it('应该能够验证令牌与其哈希值的匹配关系', () => {
      const pair = TokenManager.createRefreshToken()

      // 哈希应该匹配原始令牌
      expect(pair.tokenHash).toBe(TokenManager.hashRefreshToken(pair.token))

      // 不同令牌的哈希不应匹配
      const anotherPair = TokenManager.createRefreshToken()
      expect(pair.tokenHash).not.toBe(TokenManager.hashRefreshToken(anotherPair.token))
    })

    /**
     * Function: 哈希不可逆性验证
     *
     * Description: 验证哈希值不包含原始令牌信息（不可逆）
     */
    it('哈希值不应包含原始令牌信息', () => {
      const pairs = TokenManager.createRefreshToken()

      // 哈希值应该与原始令牌完全不同
      expect(pairs.tokenHash).not.toContain(pairs.token)

      // 哈希值长度固定（十六进制）
      expect(pairs.tokenHash.length).toBe(64)
      // 原始令牌长度不同（base64url）
      expect(pairs.token.length).not.toBe(64)
    })
  })
})
