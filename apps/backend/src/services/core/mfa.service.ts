/**
 * MFA Service
 *
 * Description: MFA 整合服务，协调 TOTP、加密、审计和令牌服务
 *
 * Features:
 * - setupMFA(): 设置 MFA（生成密钥和 QR Code）
 * - enableMFA(): 启用 MFA（验证后保存加密密钥）
 * - disableMFA(): 禁用 MFA
 * - verifyMFA(): 验证 MFA 验证码
 * - generateBackupCodes(): 生成备份码
 * - verifyBackupCode(): 验证备份码
 * - getMFAStatus(): 获取 MFA 状态
 *
 * Dependencies:
 * - MfaTotpService: TOTP 操作
 * - MfaEncryption: 密钥加密/解密
 * - MfaAuditLogService: 审计日志
 * - MfaRepository: 数据持久化
 */

import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { MfaTotpService } from '@/services/core/mfa-totp.service'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import { MfaAuditLogService } from '@/services/core/mfa-audit-log.service'
import type { MfaRepository, UpdateUserMfaParams } from '@/repositories/interfaces/core/mfa.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { ServiceContext } from '@/types/service/service-context'

// ==================== 常量定义 ====================

/** 备份码数量 */
const BACKUP_CODES_COUNT = 10

/** 备份码长度（字符） */
const BACKUP_CODE_LENGTH = 10

/** 备份码字符集（去除易混淆字符） */
const BACKUP_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/** bcrypt 成本因子 */
const BCRYPT_COST_FACTOR = 12

// ==================== 类型定义 ====================

/**
 * Type: SetupMfaResult
 *
 * Description: MFA 设置结果
 */
export type SetupMfaResult = {
  secret: string // 明文 TOTP 密钥（仅返回一次）
  qrCode: string // QR Code Data URL
  backupCodes: string[] // 备份码（明文，仅返回一次）
}

/**
 * Type: EnableMfaParams
 *
 * Description: 启用 MFA 的参数
 */
export type EnableMfaParams = {
  secret: string // 明文 TOTP 密钥
  token: string // TOTP 验证码（验证密钥是否正确）
  backupCodes: string[] // 备份码
}

/**
 * Type: DisableMfaParams
 *
 * Description: 禁用 MFA 的参数
 */
export type DisableMfaParams = {
  token: string // TOTP 验证码（验证权限）
  password: string // 用户密码（二次验证）
}

/**
 * Type: MfaStatus
 *
 * Description: MFA 状态
 */
export type MfaStatus = {
  enabled: boolean
  setupAt: Date | null
}

// ==================== 辅助函数 ====================

/**
 * Function: generateBackupCode
 *
 * Description: 生成单个备份码
 *
 * Returns:
 *   code(string): 10 位备份码
 */
function generateBackupCode(): string {
  const charset = BACKUP_CODE_CHARS
  const charsetLen = charset.length

  // 使用密码学安全的随机字节，并通过拒绝采样(rejection sampling)映射到字符集
  // 以避免 `% charsetLen` 带来的取模偏差(modulo bias)
  const maxUnbiased = Math.floor(256 / charsetLen) * charsetLen

  let out = ''
  while (out.length < BACKUP_CODE_LENGTH) {
    // 一次取足够多的随机字节，减少循环次数
    const bytes = randomBytes(Math.max(16, BACKUP_CODE_LENGTH))

    for (const b of bytes) {
      if (b >= maxUnbiased) continue
      out += charset[b % charsetLen]
      if (out.length === BACKUP_CODE_LENGTH) break
    }
  }

  // 每隔 4 个字符添加一个连字符，提高可读性
  return out.slice(0, 4) + '-' + out.slice(4, 8) + '-' + out.slice(8)
}

/**
 * Function: hashBackupCodes
 *
 * Description: 对备份码进行 bcrypt 哈希
 *
 * Parameters:
 *   codes(string[]): 明文备份码数组
 *
 * Returns:
 *   hashed(string): JSON 字符串，包含哈希后的备份码
 */
async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, BCRYPT_COST_FACTOR)),
  )
  return JSON.stringify(hashedCodes)
}

/**
 * Function: findMatchingBackupCodeIndex
 *
 * Description: 查找匹配的备份码索引
 *
 * Parameters:
 *   code(string): 输入的备份码
 *   hashedJson(string): JSON 字符串，包含哈希后的备份码
 *
 * Returns:
 *   index(number): 匹配的索引，未找到返回 -1
 */
async function findMatchingBackupCodeIndex(code: string, hashedJson: string): Promise<number> {
  try {
    const hashedCodes: string[] = JSON.parse(hashedJson)

    for (let i = 0; i < hashedCodes.length; i++) {
      if (await bcrypt.compare(code, hashedCodes[i])) {
        return i
      }
    }

    return -1
  } catch {
    return -1
  }
}

// ==================== MfaService 类 ====================

/**
 * MfaService
 *
 * Description: MFA 整合服务类
 */
export class MfaService {
  /**
   * Function: setupMFA
   *
   * Description: 设置 MFA（生成密钥和 QR Code）
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   email(string): 用户邮箱
   *   mfaRepo(MfaRepository): MFA Repository
   *   ctx(ServiceContext): 服务上下文
   *
   * Returns:
   *   result(SetupMfaResult): 包含密钥、QR Code 和备份码的结果
   *
   * Note:
   *   此方法仅生成密钥和备份码，不保存到数据库
   *   用户需要验证后调用 enableMFA 保存
   */
  static async setupMFA(
    userId: string,
    email: string,
    mfaRepo: MfaRepository,
    ctx: ServiceContext,
  ): Promise<SetupMfaResult> {
    const { logger } = ctx
    logger.info({ action: 'mfa_setup', userId })

    // 生成 TOTP 密钥和 QR Code
    const { secret, qrCode } = await MfaTotpService.generateSecretWithQRCode(email)

    // 生成备份码
    const backupCodes = Array.from({ length: BACKUP_CODES_COUNT }, () => generateBackupCode())

    // 临时存储密钥和备份码（等待验证）
    await mfaRepo.setPendingMfaSecret(ctx, {
      userId,
      secret,
      backupCodes,
    })

    // 记录审计日志
    const logEntry = MfaAuditLogService.logSuccess(userId, 'setup', '0.0.0.0') // IP 由 API 层提供
    await mfaRepo.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

    return {
      secret,
      qrCode,
      backupCodes,
    }
  }

  /**
   * Function: enableMFA
   *
   * Description: 启用 MFA（验证后保存加密密钥）
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   params(EnableMfaParams): 启用参数
   *   mfaRepo(MfaRepository): MFA Repository
   *   ctx(ServiceContext): 服务上下文
   *   clientIp(string): 客户端 IP
   *   userAgent(string): 客户端 User-Agent
   *
   * Returns:
   *   success(boolean): 启用成功返回 true
   *
   * Throws:
   *   Error: 当验证失败时抛出错误
   */
  static async enableMFA(
    userId: string,
    params: EnableMfaParams,
    mfaRepo: MfaRepository,
    ctx: ServiceContext,
    clientIp: string,
    userAgent?: string,
  ): Promise<boolean> {
    const { logger } = ctx
    const { token } = params

    logger.info({ action: 'mfa_enable', userId })

    // 获取待验证的密钥
    const pending = await mfaRepo.getPendingMfaSecret(ctx, { userId })
    if (!pending) {
      throw new Error('Please setup MFA first')
    }

    const { secret, backupCodes } = pending

    // 验证 TOTP 验证码
    if (!MfaTotpService.verifyToken(token, secret)) {
      // 记录失败日志
      const logEntry = MfaAuditLogService.logFailure(userId, 'enable', clientIp, 'Invalid TOTP token', userAgent)
      await mfaRepo.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

      throw new Error('Invalid TOTP token')
    }

    // 加密 TOTP 密钥
    const encryptedSecret = MfaEncryption.encryptSecret(secret)

    // 哈希备份码
    const hashedBackupCodes = await hashBackupCodes(backupCodes)

    // 保存到数据库
    await mfaRepo.updateUserMfa(ctx, {
      userId,
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
      mfaBackupCodes: hashedBackupCodes,
      mfaSetupAt: new Date(),
    })

    // 清理临时数据
    await mfaRepo.clearPendingMfaSecret(ctx, { userId })

    // 记录成功日志
    const logEntry = MfaAuditLogService.logSuccess(userId, 'enable', clientIp, userAgent)
    await mfaRepo.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

    return true
  }

  /**
   * Function: disableMFA
   *
   * Description: 禁用 MFA
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   params(DisableMfaParams): 禁用参数（包含 token 和 password）
   *   repos(object): 仓储依赖
   *     - mfa: MFA Repository
   *     - user: User Repository
   *   ctx(ServiceContext): 服务上下文
   *   clientIp(string): 客户端 IP
   *   userAgent(string): 客户端 User-Agent
   *
   * Returns:
   *   success(boolean): 禁用成功返回 true
   *
   * Throws:
   *   Error: 当验证失败时抛出错误
   */
  static async disableMFA(
    userId: string,
    params: DisableMfaParams,
    repos: { mfa: MfaRepository; user: UserRepository },
    ctx: ServiceContext,
    clientIp: string,
    userAgent?: string,
  ): Promise<boolean> {
    const { logger } = ctx
    const { token, password } = params

    logger.info({ action: 'mfa_disable', userId })

    // 1. 验证密码（防线一：知识因子）
    const user = await repos.user.getUserById(ctx, { userId })
    if (!user) {
      throw new Error('User not found')
    }

    if (user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        const logEntry = MfaAuditLogService.logFailure(userId, 'disable', clientIp, 'Invalid password', userAgent)
        await repos.mfa.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))
        throw new Error('Invalid password')
      }
    } else {
      // 如果用户没有密码（如仅 OAuth），我们要求必须设置密码才能禁用 MFA
      // 也可以根据策略允许，但出于安全考虑，MFA 禁用应该非常严格
      throw new Error('You must set a password before disabling MFA')
    }

    // 2. 验证 TOTP（防线二：持有因子）
    // 获取用户 MFA 数据
    const mfaData = await repos.mfa.getUserMfaData(ctx, { userId })
    if (!mfaData || !mfaData.mfaEnabled) {
      throw new Error('MFA is not enabled')
    }

    // 解密密钥
    const secret = MfaEncryption.decryptSecret(mfaData.mfaSecret!)

    // 验证 TOTP 验证码
    if (!MfaTotpService.verifyToken(token, secret)) {
      // 记录失败日志
      const logEntry = MfaAuditLogService.logFailure(userId, 'disable', clientIp, 'Invalid TOTP token', userAgent)
      await repos.mfa.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

      throw new Error('Invalid TOTP token')
    }

    // 禁用 MFA
    await repos.mfa.disableUserMfa(ctx, { userId })

    // 记录成功日志
    const logEntry = MfaAuditLogService.logSuccess(userId, 'disable', clientIp, userAgent, {
      verificationMethod: 'totp',
    })
    await repos.mfa.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

    return true
  }

  /**
   * Function: verifyMFA
   *
   * Description: 验证 MFA 验证码（用于登录或敏感操作）
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   token(string): TOTP 验证码或备份码
   *   mfaRepo(MfaRepository): MFA Repository
   *   ctx(ServiceContext): 服务上下文
   *   clientIp(string): 客户端 IP
   *   userAgent(string): 客户端 User-Agent
   *
   * Returns:
   *   valid(boolean): 验证通过返回 true
   */
  static async verifyMFA(
    userId: string,
    token: string,
    mfaRepo: MfaRepository,
    ctx: ServiceContext,
    clientIp: string,
    userAgent?: string,
  ): Promise<boolean> {
    const { logger } = ctx

    logger.info({ action: 'mfa_verify', userId })

    // 获取用户 MFA 数据
    const mfaData = await mfaRepo.getUserMfaData(ctx, { userId })
    if (!mfaData || !mfaData.mfaEnabled) {
      // 记录失败日志
      const logEntry = MfaAuditLogService.logFailure(userId, 'verify', clientIp, 'MFA not enabled', userAgent)
      await mfaRepo.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

      return false
    }

    let isValid = false
    let verificationMethod: 'totp' | 'backup-code' | null = null

    // 首先尝试 TOTP 验证
    try {
      const secret = MfaEncryption.decryptSecret(mfaData.mfaSecret!)
      isValid = MfaTotpService.verifyToken(token, secret)
      verificationMethod = 'totp'
    } catch {
      // TOTP 验证失败，尝试备份码
    }

    // 如果 TOTP 验证失败，尝试备份码
    let usedBackupCodeIndex = -1
    if (!isValid && mfaData.mfaBackupCodes) {
      usedBackupCodeIndex = await findMatchingBackupCodeIndex(token, mfaData.mfaBackupCodes)
      if (usedBackupCodeIndex !== -1) {
        isValid = true
        verificationMethod = 'backup-code'
      }
    }

    // 更新最后验证时间
    if (isValid) {
      const updateData: UpdateUserMfaParams = {
        userId,
        mfaEnabled: true, // 保持启用状态
        mfaLastVerifiedAt: new Date(),
      }

      // 如果使用了备份码，将其从列表中移除
      if (usedBackupCodeIndex !== -1 && mfaData.mfaBackupCodes) {
        try {
          const codes = JSON.parse(mfaData.mfaBackupCodes)
          codes.splice(usedBackupCodeIndex, 1)
          updateData.mfaBackupCodes = JSON.stringify(codes)
        } catch {
          // JSON 解析失败，忽略（不应该发生）
        }
      }

      await mfaRepo.updateUserMfa(ctx, updateData)
    }

    // 记录审计日志
    const logEntry = isValid
      ? MfaAuditLogService.logSuccess(userId, 'verify', clientIp, userAgent, verificationMethod ? { verificationMethod } : undefined)
      : MfaAuditLogService.logFailure(userId, 'verify', clientIp, 'Invalid token', userAgent)
    await mfaRepo.createAuditLog(ctx, MfaAuditLogService.formatForStorage(logEntry))

    return isValid
  }

  /**
   * Function: generateBackupCodes
   *
   * Description: 生成新的备份码（用于重置）
   *
   * Returns:
   *   codes(string[]): 10 个新的备份码
   */
  static generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODES_COUNT }, () => generateBackupCode())
  }

  /**
   * Function: getMFAStatus
   *
   * Description: 获取用户的 MFA 状态
   *
   * Parameters:
   *   userId(string): 用户 ID
   *   mfaRepo(MfaRepository): MFA Repository
   *   ctx(ServiceContext): 服务上下文
   *
   * Returns:
   *   status(MfaStatus): MFA 状态
   */
  static async getMFAStatus(
    userId: string,
    mfaRepo: MfaRepository,
    ctx: ServiceContext,
  ): Promise<MfaStatus> {
    const { logger } = ctx
    logger.debug({ action: 'mfa_get_status', userId })

    const mfaData = await mfaRepo.getUserMfaData(ctx, { userId })

    return {
      enabled: mfaData?.mfaEnabled ?? false,
      setupAt: mfaData?.mfaSetupAt ?? null,
    }
  }
}

/**
 * 默认导出 MfaService 类，支持函数式调用
 */
export default MfaService
