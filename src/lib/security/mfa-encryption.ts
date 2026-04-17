/**
 * MFA Encryption Utilities
 *
 * Description: MFA 密钥加密/解密工具，使用 AES-256-GCM 算法保护 TOTP 密钥
 *
 * Features:
 * - AES-256-GCM 加密/解密 TOTP 密钥
 * - 每次加密使用随机 IV（初始化向量）
 * - 输出格式: base64(iv + ciphertext + authTag)
 * - 使用环境变量 MFA_SECRET_ENCRYPTION_KEY 作为密钥来源
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '@/config'

// ==================== 常量定义 ====================

/** IV（初始化向量）长度：12 字节（GCM 推荐） */
const IV_LENGTH = 12

/** 认证标签长度：16 字节（GCM 标准） */
const AUTH_TAG_LENGTH = 16

/** 密钥派生函数参数 */
const KEY_DERIVATION = {
  salt: 'mfa-encryption-salt-v1', // 固定 salt，确保相同密钥生成相同加密密钥
  keyLength: 32, // 32 字节 = 256 位（AES-256）
} as const

// ==================== 类型定义 ====================

/**
 * Type: EncryptedSecret
 *
 * Description: 加密后的密钥数据结构
 */
export type EncryptedSecret = string

// ==================== 内部辅助函数 ====================

/**
 * 模块级缓存：避免每次加/解密都重复进行 scrypt 派生（重 CPU/内存开销）。
 *
 * 说明：
 * - 当 env.MFA_SECRET_ENCRYPTION_KEY 发生变化时，会自动重新派生并更新缓存。
 * - 测试环境或需要主动轮换密钥时，可调用 resetEncryptionKeyCache() 强制清空缓存。
 */
let cachedDerivedKey: Buffer | null = null
let cachedKeyMaterial: string | null = null

/**
 * Function: resetEncryptionKeyCache
 *
 * Description: 清空派生密钥缓存（测试或运行时密钥轮换场景使用）
 */
export function resetEncryptionKeyCache(): void {
  cachedDerivedKey = null
  cachedKeyMaterial = null
}

/**
 * Function: getEncryptionKey
 *
 * Description: 从环境变量派生 AES-256 加密密钥
 *
 * Returns:
 *   key(Buffer): 32 字节的加密密钥
 *
 * Throws:
 *   Error: 当 MFA_SECRET_ENCRYPTION_KEY 未配置时抛出错误
 */
function getEncryptionKey(): Buffer {
  if (!env.MFA_SECRET_ENCRYPTION_KEY) {
    throw new Error('MFA_SECRET_ENCRYPTION_KEY is not configured')
  }

  // 如果密钥素材未变化且已有缓存，直接返回，避免重复 scrypt 派生
  if (cachedDerivedKey && cachedKeyMaterial === env.MFA_SECRET_ENCRYPTION_KEY) {
    return cachedDerivedKey
  }

  // 使用 scrypt 从 base64 密钥派生 32 字节密钥
  // scrypt 是内存密集型密钥派生函数，更适合加密用途
  const derived = scryptSync(
    env.MFA_SECRET_ENCRYPTION_KEY,
    KEY_DERIVATION.salt,
    KEY_DERIVATION.keyLength,
  )

  cachedDerivedKey = derived
  cachedKeyMaterial = env.MFA_SECRET_ENCRYPTION_KEY
  return derived
}

/**
 * Function: packEncryptedData
 *
 * Description: 将 IV、密文和认证标签打包为 base64 字符串
 *
 * Parameters:
 *   iv(Buffer): 初始化向量（12 字节）
 *   ciphertext(Buffer): 加密后的密文
 *   authTag(Buffer): 认证标签（16 字节）
 *
 * Returns:
 *   encoded(string): base64 编码的字符串 (iv + ciphertext + authTag)
 */
function packEncryptedData(iv: Buffer, ciphertext: Buffer, authTag: Buffer): string {
  const combined = Buffer.concat([iv, ciphertext, authTag])
  return combined.toString('base64')
}

/**
 * Function: unpackEncryptedData
 *
 * Description: 从 base64 字符串解包 IV、密文和认证标签
 *
 * Parameters:
 *   encrypted(string): base64 编码的加密数据
 *
 * Returns:
 *   data(object): 包含 iv、ciphertext 和 authTag 的对象
 *
 * Throws:
 *   Error: 当数据格式无效时抛出错误
 */
function unpackEncryptedData(encrypted: string): { iv: Buffer; ciphertext: Buffer; authTag: Buffer } {
  const combined = Buffer.from(encrypted, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short')
  }

  const iv = combined.subarray(0, IV_LENGTH)
  // 认证标签在最后 16 字节
  const authTag = combined.subarray(-AUTH_TAG_LENGTH)
  // 密文在中间
  const ciphertext = combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH)

  return { iv, ciphertext, authTag }
}

// ==================== MfaEncryption 类 ====================

/**
 * MfaEncryption
 *
 * Description: MFA 密钥加密/解密工具类
 */
export class MfaEncryption {
  /**
   * Function: encryptSecret
   *
   * Description: 使用 AES-256-GCM 加密 TOTP 密钥
   *
   * Parameters:
   *   plaintext(string): 明文 TOTP 密钥（通常是 base32 编码）
   *
   * Returns:
   *   encrypted(EncryptedSecret): base64 编码的加密数据
   *
   * Throws:
   *   Error: 当加密失败时抛出错误
   *
   * Example:
   *   const secret = 'JBSWY3DPEHPK3PXP'
   *   const encrypted = MfaEncryption.encryptSecret(secret)
   *   // 返回: 'a2FzZGphbGt...（base64 字符串）'
   */
  static encryptSecret(plaintext: string): EncryptedSecret {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string')
    }

    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)

    // 创建加密器（AES-256-GCM）
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    // 加密明文
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

    // 获取认证标签
    const authTag = cipher.getAuthTag()

    // 打包为 base64 字符串
    return packEncryptedData(iv, ciphertext, authTag)
  }

  /**
   * Function: decryptSecret
   *
   * Description: 解密 AES-256-GCM 加密的 TOTP 密钥
   *
   * Parameters:
   *   encrypted(EncryptedSecret): base64 编码的加密数据
   *
   * Returns:
   *   plaintext(string): 解密后的明文 TOTP 密钥
   *
   * Throws:
   *   Error: 当解密失败或认证失败时抛出错误
   *
   * Note:
   *   如果密钥错误或数据被篡改，解密将失败并抛出错误
   *
   * Example:
   *   const encrypted = 'a2FzZGphbGt...'
   *   const secret = MfaEncryption.decryptSecret(encrypted)
   *   // 返回: 'JBSWY3DPEHPK3PXP'
   */
  static decryptSecret(encrypted: EncryptedSecret): string {
    if (!encrypted || typeof encrypted !== 'string') {
      throw new Error('Encrypted data must be a non-empty string')
    }

    const key = getEncryptionKey()
    const { iv, ciphertext, authTag } = unpackEncryptedData(encrypted)

    // 创建解密器（AES-256-GCM）
    const decipher = createDecipheriv('aes-256-gcm', key, iv)

    // 设置认证标签（验证数据完整性）
    decipher.setAuthTag(authTag)

    try {
      // 解密密文
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return plaintext.toString('utf8')
    } catch (_error) {
      // 解密失败可能是由于：
      // 1. 错误的密钥
      // 2. 数据被篡改
      // 3. IV 或认证标签损坏
      throw new Error('Failed to decrypt secret: invalid data or key')
    }
  }

  /**
   * Function: isValidSecret
   *
   * Description: 验证加密数据是否可以成功解密（用于测试密钥是否正确）
   *
   * Parameters:
   *   encrypted(EncryptedSecret): base64 编码的加密数据
   *
   * Returns:
   *   isValid(boolean): 可以解密返回 true，否则返回 false
   *
   * Note:
   *   此方法捕获所有错误，仅返回布尔值，不会抛出异常
   */
  static isValidSecret(encrypted: EncryptedSecret): boolean {
    try {
      const decrypted = this.decryptSecret(encrypted)
      return typeof decrypted === 'string' && decrypted.length > 0
    } catch {
      return false
    }
  }
}

/**
 * 默认导出 MfaEncryption 类，支持函数式调用
 */
export default MfaEncryption
