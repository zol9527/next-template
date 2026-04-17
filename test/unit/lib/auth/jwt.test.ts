/**
 * Unit: JWT 模块测试
 *
 * Description: 测试 JWT Access Token 的生成和验证功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TokenManager, type AccessTokenPayload } from '@/lib/security/token-manager'

describe('JWT 模块测试', () => {
  // 每个测试前确保环境变量已设置（由 vitest.setup.ts 提供）
  beforeEach(() => {
    if (!process.env.AUTH_JWT_ACCESS_SECRET) {
      throw new Error('AUTH_JWT_ACCESS_SECRET must be set for tests')
    }
  })

  describe('signAccessToken', () => {
    /**
     * Function: signAccessToken
     *
     * Description: 测试生成有效的 Access Token
     *
     * Parameters:
     *   payload(AccessTokenPayload): 包含用户 ID、会话 ID 和角色列表的载荷
     *   expiresInSeconds(number): Token 过期时间（秒）
     *
     * Returns:
     *   token(string): 生成的 JWT Access Token
     */
    it('应该生成有效的 Access Token', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-123',
        sessionId: 'session-abc',
        roles: ['user', 'admin'],
      }

      const token = await TokenManager.signAccessToken(payload, 900)

      expect(token).toBeTypeOf('string')
      expect(token.length).toBeGreaterThan(0)
      // JWT 格式: header.payload.signature
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    /**
     * Function: signAccessToken (最小化场景)
     *
     * Description: 测试仅提供必需字段时的 Token 生成
     */
    it('应该生成仅包含必需字段的 Access Token', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-456',
      }

      const token = await TokenManager.signAccessToken(payload, 900)

      expect(token).toBeTypeOf('string')
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    /**
     * Function: signAccessToken (空角色列表)
     *
     * Description: 测试角色列表为空时的 Token 生成
     */
    it('应该正确处理空角色列表', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-789',
        sessionId: 'session-empty-roles',
        roles: [],
      }

      const token = await TokenManager.signAccessToken(payload, 900)

      expect(token).toBeTypeOf('string')
    })
  })

  describe('verifyAccessToken', () => {
    /**
     * Function: verifyAccessToken
     *
     * Description: 测试验证有效的 Access Token
     *
     * Parameters:
     *   token(string): 待验证的 JWT Token
     *
     * Returns:
     *   result(object): 包含 userId、sessionId、roles 和 payload 的验证结果
     */
    it('应该验证有效的 Token 并返回正确的载荷', async () => {
      const originalPayload: AccessTokenPayload = {
        sub: 'user-123',
        sessionId: 'session-abc',
        roles: ['user', 'admin'],
      }

      const token = await TokenManager.signAccessToken(originalPayload, 900)
      const result = await TokenManager.verifyAccessToken(token)

      expect(result.userId).toBe('user-123')
      expect(result.sessionId).toBe('session-abc')
      expect(result.roles).toEqual(['user', 'admin'])
      expect(result.payload).toBeDefined()
    })

    /**
     * Function: verifyAccessToken (最小化载荷)
     *
     * Description: 测试验证仅包含必需字段的 Token
     */
    it('应该正确验证仅包含必需字段的 Token', async () => {
      const originalPayload: AccessTokenPayload = {
        sub: 'user-456',
      }

      const token = await TokenManager.signAccessToken(originalPayload, 900)
      const result = await TokenManager.verifyAccessToken(token)

      expect(result.userId).toBe('user-456')
      expect(result.sessionId).toBeUndefined()
      expect(result.roles).toEqual([])
    })

    /**
     * Function: verifyAccessToken (无效 Token)
     *
     * Description: 测试验证无效 Token 时抛出错误
     */
    it('应该拒绝无效的 Token', async () => {
      const invalidToken = 'invalid.token.here'

      await expect(TokenManager.verifyAccessToken(invalidToken)).rejects.toThrow()
    })

    /**
     * Function: verifyAccessToken (签名错误)
     *
     * Description: 测试验证篡改后的 Token 时抛出错误
     */
    it('应该拒绝篡改后的 Token', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-123',
        sessionId: 'session-abc',
        roles: ['user'],
      }

      const token = await TokenManager.signAccessToken(payload, 900)

      // 篡改 token 的签名部分（修改中间字符）
      const parts = token.split('.')
      const signature = parts[2]
      const tamperedSignature = signature.substring(0, 5) + (signature[5] === 'A' ? 'B' : 'A') + signature.substring(6)
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`

      // 验证篡改后的 token 应该失败
      await expect(TokenManager.verifyAccessToken(tamperedToken)).rejects.toThrow()
    })

    /**
     * Function: verifyAccessToken (过期 Token)
     *
     * Description: 测试验证已过期的 Token 时抛出错误
     */
    it('应该拒绝已过期的 Token', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-123',
        sessionId: 'session-expired',
        roles: ['user'],
      }

      // 创建一个已过期的 token（-1 秒过期时间）
      const token = await TokenManager.signAccessToken(payload, -1)

      await expect(TokenManager.verifyAccessToken(token)).rejects.toThrow()
    })

    /**
     * Function: verifyAccessToken (角色类型过滤)
     *
     * Description: 测试正确过滤角色数组中的非字符串值
     */
    it('应该正确过滤角色数组中的非字符串值', async () => {
      const payload: AccessTokenPayload = {
        sub: 'user-123',
        sessionId: 'session-mixed-roles',
        roles: ['user', 123, null, 'admin', undefined] as unknown as string[],
      }

      const token = await TokenManager.signAccessToken(payload, 900)
      const result = await TokenManager.verifyAccessToken(token)

      // 只应该返回字符串类型的角色
      expect(result.roles).toEqual(['user', 'admin'])
    })
  })

  describe('Token 生成与验证集成', () => {
    /**
     * Function: Token 生成验证流程
     *
     * Description: 测试完整的 Token 生成和验证流程
     */
    it('应该支持完整的 Token 生成和验证流程', async () => {
      const originalPayload: AccessTokenPayload = {
        sub: 'integration-user',
        sessionId: 'integration-session',
        roles: ['user', 'moderator', 'admin'],
      }

      // 生成 token
      const token = await TokenManager.signAccessToken(originalPayload, 900)
      expect(token).toBeTruthy()

      // 验证 token
      const verified = await TokenManager.verifyAccessToken(token)
      expect(verified.userId).toBe('integration-user')
      expect(verified.sessionId).toBe('integration-session')
      expect(verified.roles).toEqual(['user', 'moderator', 'admin'])
    })
  })
})
