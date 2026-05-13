/**
 * Token Manager
 *
 * Description: 统一管理所有 Token 相关操作，提供一致的调用接口
 *
 * Features:
 * - Access Token (JWT) 的签名和验证
 * - Refresh Token 的生成和哈希
 * - 统一的错误处理和类型安全
 */

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '@/config'

// ==================== 类型定义 ====================

/**
 * Type: AccessTokenPayload
 *
 * Description: Access Token (JWT) 载荷类型
 */
export type AccessTokenPayload = {
  sub: string
  sessionId?: string
  roles?: string[]
}

/**
 * Type: RefreshTokenPair
 *
 * Description: Refresh Token 对，包含明文 token 和哈希值
 */
export type RefreshTokenPair = {
  token: string
  tokenHash: string
}

/**
 * Type: MfaTokenPayload
 *
 * Description: MFA Pending Token 载荷类型
 */
export type MfaTokenPayload = {
  sub: string
  type: 'mfa_pending'
}

// ==================== 内部辅助函数 ====================

/**
 * Function: getAccessSecretKey
 *
 * Description: 获取 JWT 签名密钥
 *
 * Returns:
 *   key(Uint8Array): 编码后的密钥
 *
 * Throws:
 *   Error: 当 AUTH_JWT_ACCESS_SECRET 未配置时抛出错误
 */
function getAccessSecretKey(): Uint8Array {
  if (!env.AUTH_JWT_ACCESS_SECRET) {
    throw new Error('AUTH_JWT_ACCESS_SECRET is not configured')
  }
  return new TextEncoder().encode(env.AUTH_JWT_ACCESS_SECRET)
}

/**
 * Function: getMfaSecretKey
 *
 * Description: 获取 MFA Token 的独立签名密钥
 *   优先使用 AUTH_JWT_MFA_SECRET，未配置时回退到 AUTH_JWT_ACCESS_SECRET
 *   这确保了 MFA Token 与 Access Token 使用不同的密钥，遵循最小权限原则
 *
 * Returns:
 *   key(Uint8Array): 编码后的密钥
 *
 * Throws:
 *   Error: 当无可用密钥时抛出错误
 */
function getMfaSecretKey(): Uint8Array {
  const secret = env.AUTH_JWT_MFA_SECRET || env.AUTH_JWT_ACCESS_SECRET
  if (!secret) {
    throw new Error('AUTH_JWT_MFA_SECRET or AUTH_JWT_ACCESS_SECRET is not configured')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Function: assertAuthSecrets
 *
 * Description: 断言认证相关的密钥已配置
 *
 * Throws:
 *   Error: 当所需密钥未配置时抛出错误
 */
function assertAuthSecrets() {
  if (!env.AUTH_JWT_ACCESS_SECRET) {
    throw new Error('AUTH_JWT_ACCESS_SECRET is not configured')
  }
  if (!env.AUTH_REFRESH_TOKEN_PEPPER) {
    throw new Error('AUTH_REFRESH_TOKEN_PEPPER is not configured')
  }
}

/**
 * TokenManager
 *
 * Description: Token 管理器，提供统一的 Token 操作接口
 */
export class TokenManager {
  // ==================== Access Token (JWT) ====================

  /**
   * Function: signAccessToken
   *
   * Description: 签名生成 Access Token (JWT)
   *
   * Parameters:
   *   payload(AccessTokenPayload): Token 载荷，包含用户 ID、会话 ID、角色等信息
   *   expiresInSeconds(number): 过期时间（秒）
   *
   * Returns:
   *   token(string): 签名后的 JWT 字符串
   */
  static async signAccessToken(payload: AccessTokenPayload, expiresInSeconds: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return new SignJWT({
      sessionId: payload.sessionId,
      roles: Array.isArray(payload.roles) ? payload.roles : undefined,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .setJti(randomUUID()) // 唯一 ID，便于审计追踪和 token 级别黑名单
      .sign(getAccessSecretKey())
  }

  /**
   * Function: verifyAccessToken
   *
   * Description: 验证 Access Token 并解析载荷
   *
   * Parameters:
   *   token(string): 待验证的 JWT 字符串
   *
   * Returns:
   *   result(object): 解析后的载荷，包含 userId、sessionId、roles、payload
   *
   * Throws:
   *   Error: 当 Token 无效或过期时抛出错误
   */
  static async verifyAccessToken(token: string) {
    const result = await jwtVerify(token, getAccessSecretKey(), {
      algorithms: ['HS256'],
    })

    const roles = result.payload.roles
    const roleNames = Array.isArray(roles) ? roles.filter((v): v is string => typeof v === 'string') : []

    return {
      userId: result.payload.sub,
      sessionId:
        typeof result.payload.sessionId === 'string' ? result.payload.sessionId : undefined,
      roles: roleNames,
      payload: result.payload,
    }
  }

  // ==================== Refresh Token ====================

  /**
   * Function: createRefreshToken
   *
   * Description: 生成新的 Refresh Token 对（token + hash）
   *
   * Returns:
   *   pair(RefreshTokenPair): 包含 token（明文）和 tokenHash（哈希）的对象
   *
   * Note:
   *   token: 返回给客户端存储
   *   tokenHash: 存储到数据库用于验证
   */
  static createRefreshToken(): RefreshTokenPair {
    assertAuthSecrets()
    const token = randomBytes(32).toString('base64url')
    const tokenHash = this.hashRefreshToken(token)
    return { token, tokenHash }
  }

  /**
   * Function: hashRefreshToken
   *
   * Description: 对 Refresh Token 进行哈希计算
   *
   * Parameters:
   *   token(string): 明文 Refresh Token
   *
   * Returns:
   *   hash(string): 哈希后的字符串（hex 格式）
   *
   * Note:
   *   使用 HMAC SHA256 算法，配合 AUTH_REFRESH_TOKEN_PEPPER 增强安全性
   */
  static hashRefreshToken(token: string): string {
    assertAuthSecrets()
    const pepper = env.AUTH_REFRESH_TOKEN_PEPPER
    if (!pepper) {
      throw new Error('AUTH_REFRESH_TOKEN_PEPPER is not configured')
    }
    return createHmac('sha256', pepper).update(token).digest('hex')
  }

  /**
   * Function: verifyRefreshToken
   *
   * Description: 验证明文 Refresh Token 是否与给定的哈希值匹配
   *
   * Parameters:
   *   token(string): 明文 Refresh Token
   *   hash(string): 存储在数据库中的哈希值
   *
   * Returns:
   *   isValid(boolean): token 与 hash 匹配返回 true，否则返回 false
   *
   * Note:
   *   使用恒定时间比较，防止时序攻击
   */
  static verifyRefreshToken(token: string, hash: string): boolean {
    const tokenHash = this.hashRefreshToken(token)
    // 使用恒定时间比较，防止时序攻击
    if (tokenHash.length !== hash.length) return false

    return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash))
  }

  // ==================== 组合操作 ====================

  /**
   * Function: createTokenPair
   *
   * Description: 同时创建 Access Token 和 Refresh Token
   *
   * Parameters:
   *   payload(AccessTokenPayload): Access Token 载荷
   *   accessExpiresInSeconds(number): Access Token 过期时间（秒）
   *
   * Returns:
   *   pair(object): 包含 accessToken 和 refreshTokenPair 的对象
   */
  static async createTokenPair(payload: AccessTokenPayload, accessExpiresInSeconds: number) {
    const [accessToken, refreshTokenPair] = await Promise.all([
      this.signAccessToken(payload, accessExpiresInSeconds),
      Promise.resolve(this.createRefreshToken()),
    ])

    return {
      accessToken,
      refreshToken: refreshTokenPair.token,
      refreshTokenHash: refreshTokenPair.tokenHash,
    }
  }

  // ==================== MFA Pending Token ====================

  /**
   * Function: signMfaToken
   *
   * Description: 签名生成 MFA Pending Token (JWT)
   *
   * Parameters:
   *   payload(object): 包含 sub (userId)
   *   expiresInSeconds(number): 过期时间（秒）
   *
   * Returns:
   *   token(string): 签名后的 JWT 字符串
   */
  static async signMfaToken(payload: { sub: string }, expiresInSeconds: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    return new SignJWT({
      type: 'mfa_pending',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .sign(getMfaSecretKey())
  }

  /**
   * Function: verifyMfaToken
   *
   * Description: 验证 MFA Pending Token
   *
   * Parameters:
   *   token(string): 待验证的 JWT 字符串
   *
   * Returns:
   *   payload(MfaTokenPayload): 解析后的载荷
   *
   * Throws:
   *   Error: 当 Token 无效、过期或类型不匹配时抛出错误
   */
  static async verifyMfaToken(token: string): Promise<MfaTokenPayload> {
    const result = await jwtVerify(token, getMfaSecretKey(), {
      algorithms: ['HS256'],
    })

    if (result.payload.type !== 'mfa_pending') {
      throw new Error('Invalid token type')
    }

    if (!result.payload.sub) {
      throw new Error('Token missing subject')
    }

    return {
      sub: result.payload.sub,
      type: 'mfa_pending',
    }
  }
}

/**
 * 默认导出 TokenManager 实例，支持函数式调用
 */
export default TokenManager
