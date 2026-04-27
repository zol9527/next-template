/**
 * AI API Key 加密工具
 *
 * Description: AI API Key 的加密/解密和脱敏工具
 *   使用 AES-256-GCM 算法保护 AI Provider 的 API Key
 *   独立于 MFA 加密系统，使用单独的密钥和 salt
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '@/config'

// ==================== 常量定义 ====================

/** IV（初始化向量）长度：12 字节（GCM 推荐） */
const IV_LENGTH = 12

/** 认证标签长度：16 字节（GCM 标准） */
const AUTH_TAG_LENGTH = 16

/** 密钥派生参数（独立于 MFA 的 salt） */
const KEY_DERIVATION = {
  salt: 'ai-encryption-salt-v1',
  keyLength: 32,
} as const

// ==================== 内部缓存 ====================

let cachedDerivedKey: Buffer | null = null
let cachedKeyMaterial: string | null = null

/**
 * Function: resetAiKeyCache
 *
 * Description: 清空派生密钥缓存（测试或运行时密钥轮换场景使用）
 */
export function resetAiKeyCache(): void {
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
 *   Error: 当 AI_API_KEY_ENCRYPTION_KEY 未配置时抛出错误
 */
function getEncryptionKey(): Buffer {
  const keyMaterial = env.AI_API_KEY_ENCRYPTION_KEY

  if (!keyMaterial) {
    throw new Error('AI_API_KEY_ENCRYPTION_KEY is not configured')
  }

  if (cachedDerivedKey && cachedKeyMaterial === keyMaterial) {
    return cachedDerivedKey
  }

  const derived = scryptSync(keyMaterial, KEY_DERIVATION.salt, KEY_DERIVATION.keyLength)
  cachedDerivedKey = derived
  cachedKeyMaterial = keyMaterial
  return derived
}

// ==================== 数据打包/解包 ====================

function packEncryptedData(iv: Buffer, ciphertext: Buffer, authTag: Buffer): string {
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64')
}

function unpackEncryptedData(encrypted: string): { iv: Buffer; ciphertext: Buffer; authTag: Buffer } {
  const combined = Buffer.from(encrypted, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short')
  }

  return {
    iv: combined.subarray(0, IV_LENGTH),
    authTag: combined.subarray(-AUTH_TAG_LENGTH),
    ciphertext: combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH),
  }
}

// ==================== AiKeyEncryption 类 ====================

/**
 * AiKeyEncryption
 *
 * Description: AI API Key 加密/解密工具类
 */
export class AiKeyEncryption {
  /**
   * Function: encrypt
   *
   * Description: 使用 AES-256-GCM 加密 API Key
   *
   * Parameters:
   *   plaintext(string): 明文 API Key
   *
   * Returns:
   *   encrypted(string): base64 编码的加密数据
   */
  static encrypt(plaintext: string): string {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string')
    }

    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return packEncryptedData(iv, ciphertext, authTag)
  }

  /**
   * Function: decrypt
   *
   * Description: 解密 AES-256-GCM 加密的 API Key
   *
   * Parameters:
   *   encrypted(string): base64 编码的加密数据
   *
   * Returns:
   *   plaintext(string): 解密后的明文 API Key
   */
  static decrypt(encrypted: string): string {
    if (!encrypted || typeof encrypted !== 'string') {
      throw new Error('Encrypted data must be a non-empty string')
    }

    const key = getEncryptionKey()
    const { iv, ciphertext, authTag } = unpackEncryptedData(encrypted)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Failed to decrypt AI API key: invalid data or key')
    }
  }
}

/**
 * Function: maskApiKey
 *
 * Description: 将 API Key 脱敏为 'sk-****xxxx' 格式
 *
 * Parameters:
 *   key(string): 原始 API Key
 *
 * Returns:
 *   masked(string): 脱敏后的 API Key
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 8) {
    return '****'
  }
  const prefix = key.substring(0, 3)
  const suffix = key.substring(key.length - 4)
  return `${prefix}****${suffix}`
}
