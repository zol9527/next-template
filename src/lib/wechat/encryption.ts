import crypto from 'crypto'
import { env } from '@/config'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionSecret(): string {
  const secret = env.WECHAT_SESSION_KEY_SECRET
  if (!secret) {
    throw new Error('Missing WECHAT_SESSION_KEY_SECRET (required for encrypting wechat session_key)')
  }
  return secret
}

/**
 * Function: encryptSessionKey
 *
 * Description: 加密 session_key（AES-256-GCM）
 *
 * Parameters:
 *   sessionKey(string): 微信返回的 session_key
 *
 * Returns:
 *   encrypted(string): 加密后的 session_key（Base64 编码）
 */
export function encryptSessionKey(sessionKey: string): string {
  // 确保密钥长度为 32 字节（AES-256）
  const key = crypto.createHash('sha256').update(getEncryptionSecret()).digest()
  const iv = crypto.randomBytes(16) // 初始化向量

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(sessionKey, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // 格式: iv(16) + authTag(16) + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted])

  return combined.toString('base64')
}

/**
 * Function: decryptSessionKey
 *
 * Description: 解密 session_key
 *
 * Parameters:
 *   encrypted(string): 加密后的 session_key
 *
 * Returns:
 *   sessionKey(string): 解密后的原始 session_key
 */
export function decryptSessionKey(encrypted: string): string {
  // 确保密钥长度为 32 字节（AES-256）
  const key = crypto.createHash('sha256').update(getEncryptionSecret()).digest()
  const combined = Buffer.from(encrypted, 'base64')

  const iv = combined.subarray(0, 16)
  const authTag = combined.subarray(16, 32)
  const encryptedData = combined.subarray(32)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
