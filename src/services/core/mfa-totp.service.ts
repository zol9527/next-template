/**
 * MFA TOTP Service
 *
 * Description: TOTP (Time-based One-Time Password) 服务，用于生成和验证双因素认证码
 *
 * Features:
 * - 生成 TOTP 密钥（Base32 编码）
 * - 生成 QR Code（用于 Authenticator App 扫描）
 * - 验证 TOTP 验证码
 * - 格式化 otpauth:// URI
 *
 * Dependencies:
 * - speakeasy: TOTP 生成和验证
 * - qrcode: QR Code 图像生成
 */

import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { env } from '@/config'

// ==================== 常量定义 ====================

/** 默认 TOTP 配置 */
const DEFAULT_TOTP_OPTIONS = {
  issuer: env.TOTP_ISSUER,
  label: env.TOTP_SERVICE_NAME,
  digits: env.TOTP_DIGITS,
  step: env.TOTP_STEP, // 30 秒时间窗口
  window: 2, // 允许前后各 2 个时间窗口（共 5 个窗口，约 2.5 分钟）
} as const

/** QR Code 生成选项 */
const QR_CODE_OPTIONS = {
  type: 'image/png',
  width: 256,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
} as const

// ==================== 类型定义 ====================

/**
 * Type: TotpSecret
 *
 * Description: TOTP 密钥信息
 */
export type TotpSecret = string

/**
 * Type: TotpKeyUri
 *
 * Description: otpauth:// URI 格式字符串
 */
export type TotpKeyUri = string

/**
 * Type: QrCodeDataUrl
 *
 * Description: QR Code Data URL (base64 编码的 PNG 图片)
 */
export type QrCodeDataUrl = string

/**
 * Type: GenerateSecretResult
 *
 * Description: 生成 TOTP 密钥的完整结果
 */
export type GenerateSecretResult = {
  secret: TotpSecret // Base32 编码的密钥
  uri: TotpKeyUri // otpauth:// URI
}

/**
 * Type: VerifyTokenResult
 *
 * Description: 验证 TOTP 验证码的结果
 */
export type VerifyTokenResult = {
  valid: boolean // 验证是否通过
  delta?: number | null // 时间窗口偏移量（0 为当前窗口，±1 为前后窗口）
}

// ==================== MfaTotpService 类 ====================

/**
 * MfaTotpService
 *
 * Description: TOTP 服务类，提供完整的 TOTP 功能
 */
export class MfaTotpService {
  /**
   * Function: generateSecret
   *
   * Description: 生成新的 TOTP 密钥（Base32 编码）
   *
   * Returns:
   *   result(GenerateSecretResult): 包含密钥和 otpauth:// URI 的对象
   *
   * Example:
   *   const result = MfaTotpService.generateSecret()
   *   // result.secret: 'JBSWY3DPEHPK3PXP'
   *   // result.uri: 'otpauth://totp/...'
   */
  static generateSecret(): GenerateSecretResult {
    const secret = speakeasy.generateSecret({
      name: DEFAULT_TOTP_OPTIONS.label,
      issuer: DEFAULT_TOTP_OPTIONS.issuer,
      length: 32, // 生成 32 字节（160 位）的密钥
      symbols: false, // 不包含特殊字符（提高兼容性）
    })

    return {
      secret: secret.base32,
      uri: secret.otpauth_url ?? '',
    }
  }

  /**
   * Function: formatKeyUri
   *
   * Description: 格式化 otpauth:// URI（用于手动输入或生成 QR Code）
   *
   * Parameters:
   *   secret(TotpSecret): Base32 编码的 TOTP 密钥
   *   email(string): 用户邮箱或标识符
   *
   * Returns:
   *   uri(TotpKeyUri): otpauth:// URI 字符串
   *
   * Example:
   *   const uri = MfaTotpService.formatKeyUri('JBSWY3DPEHPK3PXP', 'admin@example.com')
   *   // 返回: 'otpauth://totp/EduMiniApp%20Admin:admin@example.com?...'
   */
  static formatKeyUri(secret: TotpSecret, email: string): TotpKeyUri {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: email,
      issuer: DEFAULT_TOTP_OPTIONS.issuer,
      digits: DEFAULT_TOTP_OPTIONS.digits,
      encoding: 'base32',
    })

    return otpauthUrl
  }

  /**
   * Function: generateQRCode
   *
   * Description: 生成 TOTP 密钥的 QR Code（PNG Data URL）
   *
   * Parameters:
   *   secret(TotpSecret): Base32 编码的 TOTP 密钥
   *   email(string): 用户邮箱或标识符
   *
   * Returns:
   *   dataUrl(QrCodeDataUrl): base64 编码的 PNG 图片 Data URL
   *
   * Throws:
   *   Error: 当 QR Code 生成失败时抛出错误
   *
   * Example:
   *   const qrCode = await MfaTotpService.generateQRCode('JBSWY3DPEHPK3PXP', 'admin@example.com')
   *   // 返回: 'data:image/png;base64,iVBORw0KGgo...'
   */
  static async generateQRCode(secret: TotpSecret, email: string): Promise<QrCodeDataUrl> {
    const uri = this.formatKeyUri(secret, email)

    try {
      const dataUrl = await QRCode.toDataURL(uri, QR_CODE_OPTIONS)
      return dataUrl
    } catch (error) {
      throw new Error(`Failed to generate QR Code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Function: verifyToken
   *
   * Description: 验证 TOTP 验证码是否正确
   *
   * Parameters:
   *   token(string): 用户输入的 6 位验证码
   *   secret(TotpSecret): Base32 编码的 TOTP 密钥
   *
   * Returns:
   *   result(boolean): 验证通过返回 true，否则返回 false
   *
   * Note:
   *   - 允许前后各 2 个时间窗口（共 5 个窗口，约 2.5 分钟）
   *   - 这可以处理客户端时间略有偏差的情况
   *
   * Example:
   *   const valid = MfaTotpService.verifyToken('123456', 'JBSWY3DPEHPK3PXP')
   *   // 返回: true 或 false
   */
  static verifyToken(token: string, secret: TotpSecret): boolean {
    const result = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      digits: DEFAULT_TOTP_OPTIONS.digits,
      step: DEFAULT_TOTP_OPTIONS.step,
      window: DEFAULT_TOTP_OPTIONS.window,
    })

    return result
  }

  /**
   * Function: verifyTokenDetailed
   *
   * Description: 验证 TOTP 验证码并返回详细信息
   *
   * Parameters:
   *   token(string): 用户输入的 6 位验证码
   *   secret(TotpSecret): Base32 编码的 TOTP 密钥
   *
   * Returns:
   *   result(VerifyTokenResult): 包含验证结果和时间窗口偏移量
   *
   * Note:
   *   delta 表示验证码对应的时间窗口：
   *   - 0: 当前时间窗口
   *   - -1: 前一个时间窗口
   *   - 1: 后一个时间窗口
   *
   * Example:
   *   const result = MfaTotpService.verifyTokenDetailed('123456', 'JBSWY3DPEHPK3PXP')
   *   // 返回: { valid: true, delta: 0 }
   */
  static verifyTokenDetailed(token: string, secret: TotpSecret): VerifyTokenResult {
    const verified = speakeasy.totp.verifyDelta({
      secret,
      encoding: 'base32',
      token,
      digits: DEFAULT_TOTP_OPTIONS.digits,
      step: DEFAULT_TOTP_OPTIONS.step,
      window: DEFAULT_TOTP_OPTIONS.window,
    }) as unknown // speakeasy 类型定义不完整，使用 unknown 绕过

    if (verified === undefined || verified === null) {
      return { valid: false }
    }

    // verified 可能是 number 或类似对象的结构
    const delta = typeof verified === 'number' ? verified : 0

    return {
      valid: true,
      delta,
    }
  }

  /**
   * Function: generateToken
   *
   * Description: 生成当前时间的 TOTP 验证码（用于测试）
   *
   * Parameters:
   *   secret(TotpSecret): Base32 编码的 TOTP 密钥
   *
   * Returns:
   *   token(string): 当前时间的 6 位验证码
   *
   * Warning:
   *   此方法仅用于测试目的，不应在生产环境中使用
   *
   * Example:
   *   const token = MfaTotpService.generateToken('JBSWY3DPEHPK3PXP')
   *   // 返回: '123456'
   */
  static generateToken(secret: TotpSecret): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
      digits: DEFAULT_TOTP_OPTIONS.digits,
      step: DEFAULT_TOTP_OPTIONS.step,
    })
  }

  /**
   * Function: generateSecretWithQRCode
   *
   * Description: 生成 TOTP 密钥并同时生成 QR Code（便捷方法）
   *
   * Parameters:
   *   email(string): 用户邮箱或标识符
   *
   * Returns:
   *   result(object): 包含密钥、URI 和 QR Code Data URL 的对象
   *
   * Example:
   *   const result = await MfaTotpService.generateSecretWithQRCode('admin@example.com')
   *   // result.secret: 'JBSWY3DPEHPK3PXP'
   *   // result.uri: 'otpauth://totp/...'
   *   // result.qrCode: 'data:image/png;base64,...'
   */
  static async generateSecretWithQRCode(email: string): Promise<{
    secret: TotpSecret
    uri: TotpKeyUri
    qrCode: QrCodeDataUrl
  }> {
    const { secret, uri } = this.generateSecret()
    const qrCode = await this.generateQRCode(secret, email)

    return { secret, uri, qrCode }
  }
}

/**
 * 默认导出 MfaTotpService 类，支持函数式调用
 */
export default MfaTotpService
