/**
 * MFA ActionToken Service
 *
 * Description: MFA 一次性操作令牌服务，用于敏感操作的二次验证
 *
 * Features:
 * - 生成一次性操作令牌（用于敏感操作前的 MFA 验证）
 * - 验证并消耗令牌（使用后立即失效）
 * - 清理过期令牌
 *
 * Security:
 * - Token 使用 crypto.randomBytes(32) 生成
 * - 存储 SHA-256 哈希（不存储明文）
 * - 令牌一次性使用，使用后立即标记为已使用
 * - 有效期由 env.MFA_ACTION_TOKEN_TTL 控制（默认 5 分钟）
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { env } from '@/config'

// ==================== 常量定义 ====================

/** Token 字节长度（32 字节 = 256 位） */
const TOKEN_BYTES = 32

/** Token 输出编码（base64url，便于 URL 传输） */
const TOKEN_ENCODING = 'base64url' as const

/** 默认令牌有效期（秒） */
const DEFAULT_TOKEN_TTL = env.MFA_ACTION_TOKEN_TTL // 300 秒 = 5 分钟

// ==================== 类型定义 ====================

/**
 * Type: ActionToken
 *
 * Description: 明文操作令牌（返回给客户端）
 */
export type ActionToken = string

/**
 * Type: ActionTokenHash
 *
 * Description: 操作令牌的 SHA-256 哈希（存储到数据库）
 */
export type ActionTokenHash = string

/**
 * Type: ActionType
 *
 * Description: 支持的操作类型
 */
export type ActionType =
  | 'refund' // 退款
  | 'withdraw' // 提现
  | 'delete-user' // 删除用户
  | 'modify-permissions' // 修改权限
  | 'export-data' // 导出数据
  | 'system-settings' // 系统设置
  | string // 允许扩展

/**
 * Type: GenerateTokenOptions
 *
 * Description: 生成令牌的选项
 */
export type GenerateTokenOptions = {
  userId: string // 用户 ID
  action: ActionType // 操作类型
  resourceId?: string // 可选：绑定的资源 ID（如订单 ID）
  ttl?: number // 可选：自定义有效期（秒）
}

/**
 * Type: TokenVerificationResult
 *
 * Description: 令牌验证结果
 */
export type TokenVerificationResult = {
  valid: boolean // 是否有效
  userId?: string // 用户 ID
  resourceId?: string // 资源 ID
  error?: 'token_not_found' | 'token_already_used' | 'token_expired' | 'invalid_token'
}

// ==================== 内部辅助函数 ====================

/**
 * Function: generateTokenString
 *
 * Description: 生成随机令牌字符串
 *
 * Returns:
 *   token(ActionToken): base64url 编码的随机令牌
 */
function generateTokenString(): ActionToken {
  return randomBytes(TOKEN_BYTES).toString(TOKEN_ENCODING)
}

/**
 * Function: hashToken
 *
 * Description: 计算令牌的 SHA-256 哈希
 *
 * Parameters:
 *   token(ActionToken): 明文令牌
 *
 * Returns:
 *   hash(ActionTokenHash): 十六进制格式的哈希值
 */
function hashToken(token: ActionToken): ActionTokenHash {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Function: calculateExpiresAt
 *
 * Description: 计算令牌过期时间
 *
 * Parameters:
 *   ttl(number): 有效期（秒）
 *
 * Returns:
 *   expiresAt(Date): 过期时间
 */
function calculateExpiresAt(ttl: number): Date {
  const now = Date.now()
  return new Date(now + ttl * 1000)
}

// ==================== MfaActionTokenService 类 ====================

/**
 * MfaActionTokenService
 *
 * Description: MFA 操作令牌服务类
 *
 * Note:
 *   此服务提供令牌生成和验证的逻辑，实际的数据存储由 Repository 层处理
 */
export class MfaActionTokenService {
  /**
   * Function: generateToken
   *
   * Description: 生成一次性操作令牌
   *
   * Parameters:
   *   options(GenerateTokenOptions): 生成选项
   *
   * Returns:
   *   result(object): 包含令牌和哈希的对象
   *
   * Example:
   *   const result = MfaActionTokenService.generateToken({
   *     userId: 'user-123',
   *     action: 'refund',
   *     resourceId: 'order-456',
   *   })
   *   // result.token: 'abc123...'（返回给客户端）
   *   // result.tokenHash: 'def456...'（存储到数据库）
   */
  static generateToken(options: GenerateTokenOptions): {
    token: ActionToken
    tokenHash: ActionTokenHash
    expiresAt: Date
  } {
    const { ttl = DEFAULT_TOKEN_TTL } = options

    // 生成随机令牌
    const token = generateTokenString()

    // 计算哈希
    const tokenHash = hashToken(token)

    // 计算过期时间
    const expiresAt = calculateExpiresAt(ttl)

    return {
      token,
      tokenHash,
      expiresAt,
    }
  }

  /**
   * Function: verifyToken
   *
   * Description: 验证令牌是否有效（不消耗令牌）
   *
   * Parameters:
   *   token(ActionToken): 明文令牌
   *   storedTokenHash(ActionTokenHash): 存储的哈希值
   *   expiresAt(Date): 令牌过期时间
   *   usedAt(Date | null): 令牌使用时间
   *
   * Returns:
   *   result(TokenVerificationResult): 验证结果
   *
   * Note:
   *   此方法仅验证令牌有效性，不会标记为已使用
   */
  static verifyToken(
    token: ActionToken,
    storedTokenHash: ActionTokenHash,
    expiresAt: Date,
    usedAt: Date | null,
  ): TokenVerificationResult {
    // 计算输入令牌的哈希
    const inputHash = hashToken(token)

    // 验证哈希是否匹配（使用 constant-time 比较，减少时序侧信道风险）
    // 注意：timingSafeEqual 要求两个 Buffer 等长
    const inputBuf = Buffer.from(inputHash, 'hex')
    const storedBuf = Buffer.from(storedTokenHash, 'hex')
    if (inputBuf.length !== storedBuf.length || !timingSafeEqual(inputBuf, storedBuf)) {
      return { valid: false, error: 'invalid_token' }
    }

    // 检查是否已被使用
    if (usedAt !== null) {
      return { valid: false, error: 'token_already_used' }
    }

    // 检查是否过期
    const now = new Date()
    if (now > expiresAt) {
      return { valid: false, error: 'token_expired' }
    }

    return { valid: true }
  }

  /**
   * Function: verifyAndConsumeToken
   *
   * Description: 验证令牌并准备消耗（返回验证结果供调用方更新数据库）
   *
   * Parameters:
   *   token(ActionToken): 明文令牌
   *   expectedAction(ActionType): 期望的操作类型
   *   storedData(object): 存储的令牌数据
   *
   * Returns:
   *   result(TokenVerificationResult): 验证结果
   *
   * Note:
   *   此方法验证令牌，调用方需要：
   *   1. 检查操作类型是否匹配
   *   2. 将 usedAt 设置为当前时间（消耗令牌）
   */
  static verifyAndConsumeToken(
    token: ActionToken,
    expectedAction: ActionType,
    storedData: {
      tokenHash: ActionTokenHash
      action: ActionType
      userId: string
      resourceId: string | null
      expiresAt: Date
      usedAt: Date | null
    },
  ): TokenVerificationResult {
    // 首先验证令牌基本有效性
    const basicVerify = this.verifyToken(token, storedData.tokenHash, storedData.expiresAt, storedData.usedAt)
    if (!basicVerify.valid) {
      return basicVerify
    }

    // 验证操作类型是否匹配
    if (storedData.action !== expectedAction) {
      return { valid: false, error: 'invalid_token' }
    }

    // 令牌有效，返回用户信息供调用方使用
    return {
      valid: true,
      userId: storedData.userId,
      resourceId: storedData.resourceId ?? undefined,
    }
  }

  /**
   * Function: isTokenExpired
   *
   * Description: 检查令牌是否已过期
   *
   * Parameters:
   *   expiresAt(Date): 令牌过期时间
   *
   * Returns:
   *   isExpired(boolean): 已过期返回 true
   */
  static isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt
  }

  /**
   * Function: shouldCleanupToken
   *
   * Description: 判断令牌是否应该被清理
   *
   * Parameters:
   *   expiresAt(Date): 令牌过期时间
   *   usedAt(Date | null): 令牌使用时间
   *   cleanupThreshold(number): 清理阈值（秒），默认为令牌 TTL 的 2 倍
   *
   * Returns:
   *   shouldCleanup(boolean): 应该清理返回 true
   *
   * Note:
   *   已使用或已过期超过阈值的令牌应该被清理
   */
  static shouldCleanupToken(
    expiresAt: Date,
    usedAt: Date | null,
    cleanupThreshold?: number,
  ): boolean {
    const threshold = cleanupThreshold ?? DEFAULT_TOKEN_TTL * 2
    const now = Date.now()

    // 已使用的令牌：检查是否超过清理阈值
    if (usedAt !== null) {
      const usedTime = usedAt.getTime()
      return now - usedTime > threshold * 1000
    }

    // 未使用的令牌：检查是否已过期超过清理阈值
    const expiresTime = expiresAt.getTime()
    return now - expiresTime > threshold * 1000
  }

  /**
   * Function: validateActionType
   *
   * Description: 验证操作类型是否有效
   *
   * Parameters:
   *   action(string): 操作类型
   *
   * Returns:
   *   isValid(boolean): 有效返回 true
   */
  static validateActionType(action: string): action is ActionType {
    return typeof action === 'string' && action.length > 0
  }

  /**
   * Function: formatTokenForStorage
   *
   * Description: 格式化令牌数据用于存储
   *
   * Parameters:
   *   options(GenerateTokenOptions): 生成选项
   *
   * Returns:
   *   data(object): 可直接存储的数据对象
   *
   * Note:
   *   此方法返回的数据可直接用于创建数据库记录
   */
  static formatTokenForStorage(options: GenerateTokenOptions): {
    tokenHash: ActionTokenHash
    userId: string
    action: ActionType
    resourceId: string | null
    expiresAt: Date
  } {
    const { tokenHash, expiresAt } = this.generateToken(options)
    const { userId, action, resourceId } = options

    return {
      tokenHash,
      userId,
      action,
      resourceId: resourceId ?? null,
      expiresAt,
    }
  }
}

/**
 * 默认导出 MfaActionTokenService 类，支持函数式调用
 */
export default MfaActionTokenService
