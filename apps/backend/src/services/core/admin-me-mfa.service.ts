import crypto from 'crypto'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { env } from '@/config'
import { MfaEncryption } from '@/lib/security/mfa-encryption'
import type { MfaVerifyDto, MfaDisableDto } from '@/contracts/dtos/admin/me'
import type { AdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { AdminRepository } from '@/repositories/interfaces/core/admin-repository.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import { ValidationError } from '@/lib/errors/app-error'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ServiceContext } from '@/types/service/service-context'

// 统一 TOTP 校验配置：允许一定时间漂移，避免边界时刻偶发验证失败
authenticator.options = {
  ...authenticator.options,
  digits: env.TOTP_DIGITS,
  step: env.TOTP_STEP,
  window: 2,
}

// ==================== 类型定义 ====================

/**
 * Type: MfaStatusResult
 *
 * Description: MFA 状态查询结果
 */
type MfaStatusResult = {
  enabled: boolean
  type: 'totp' | null
  enabledAt: string | null
}

/**
 * Type: TotpSetupResult
 *
 * Description: TOTP 设置结果
 */
type TotpSetupResult = {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

/**
 * Type: MfaEnableResult
 *
 * Description: MFA 启用结果
 */
type MfaEnableResult = {
  enabled: boolean
  backupCodes: string[]
}

// ==================== AdminMeMfaService 类 ====================

export class AdminMeMfaService {
  private readonly repoCtx: RepoContext

  constructor(
    private deps: { users: UserRepository; admin: AdminRepository },
    ctx: ServiceContext
  ) {
    this.repoCtx = {
      traceId: ctx.traceId,
      logger: ctx.logger.child({ layer: 'repository' }),
    }
  }

  /**
   * Function: ensureAdminEmail
   *
   * Description: 确保管理员邮箱存在，用于生成 otpauth URL
   *
   * Parameters:
   * 	admin(AdminUserDetail): 管理员详情
   *
   * Returns:
   * 	email(string): 管理员邮箱
   */
  private ensureAdminEmail(admin: AdminUserDetail): string {
    if (!admin.email) {
      throw new ValidationError('管理员未设置邮箱，无法配置 TOTP')
    }
    return admin.email
  }

  /**
   * Function: getMfaStatus
   *
   * Description: 获取当前管理员的 MFA 状态
   *
   * Parameters:
   *   adminId(string): 管理员 ID
   *
   * Returns:
   *   status(MfaStatusResult): MFA 状态信息
   *
   * Throws:
   *   ValidationError: 管理员不存在时抛出
   */
  async getMfaStatus(adminId: string): Promise<MfaStatusResult> {
    const admin = await this.deps.users.getUserById(this.repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }

    return {
      enabled: admin.mfaEnabled,
      type: admin.mfaEnabled ? 'totp' : null,
      enabledAt: admin.mfaSetupAt,
    }
  }

  /**
   * Function: generateTotpSecret
   *
   * Description: 生成 TOTP 密钥和二维码，用于 MFA 设置
   *
   * Parameters:
   *   adminId(string): 管理员 ID
   *
   * Returns:
   *   result(TotpSetupResult): 包含密钥、二维码 URL 和备份码
   *
   * Throws:
   *   ValidationError: 管理员不存在时抛出
   */
  async generateTotpSecret(adminId: string): Promise<TotpSetupResult> {
    const admin = await this.deps.users.getUserById(this.repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }

    // 允许在 MFA 已启用时重新设置验证器（用于更换设备等场景）

    // 生成 TOTP 密钥
    const secret = authenticator.generateSecret()

    // 生成二维码 URL
    const otpauthUrl = authenticator.keyuri(this.ensureAdminEmail(admin), 'GenericAdmin', secret)

    // 生成二维码图片
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    // 生成备份码
    const backupCodes = this.generateBackupCodes()

    // 临时存储密钥和备份码（等待验证）
    await this.deps.admin.setPendingMfaSecret(this.repoCtx, {
      adminId,
      secret,
      backupCodes,
    })

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    }
  }

  /**
   * Function: verifyAndEnableTotp
   *
   * Description: 验证 TOTP 验证码并启用 MFA
   *
   * Parameters:
   *   adminId(string): 管理员 ID
   *   dto(MfaVerifyDto): 包含 6 位验证码的 DTO
   *
   * Returns:
   *   result(MfaEnableResult): 包含启用状态和备份码
   *
   * Throws:
   *   ValidationError: 验证失败或管理员不存在时抛出
   */
  async verifyAndEnableTotp(adminId: string, dto: MfaVerifyDto): Promise<MfaEnableResult> {
    const admin = await this.deps.users.getUserById(this.repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }

    // 允许在 MFA 已启用时重新设置验证器（用于更换设备等场景）

    // 获取待验证的密钥
    const pending = await this.deps.admin.getPendingMfaSecret(this.repoCtx, { adminId })
    if (!pending) {
      throw new ValidationError('请先生成密钥')
    }

    // 验证 TOTP 码
    const isValid = authenticator.verify({
      token: dto.code,
      secret: pending.secret,
    })

    if (!isValid) {
      throw new ValidationError('验证码错误，请重试')
    }

    // 启用 MFA
    await this.deps.admin.enableMfa(this.repoCtx, {
      adminId,
      type: 'totp',
      secret: pending.secret,
      backupCodes: pending.backupCodes,
    })

    // 清理临时数据
    await this.deps.admin.clearPendingMfaSecret(this.repoCtx, { adminId })

    return {
      enabled: true,
      backupCodes: pending.backupCodes,
    }
  }

  /**
   * Function: disableMfa
   *
   * Description: 禁用管理员的 MFA
   *
   * Parameters:
   *   adminId(string): 管理员 ID
   *   dto(MfaDisableDto): 包含验证码和确认禁用标志的 DTO

   *
   * Returns:
   *   result(object): 包含禁用状态的对象
   *
   * Throws:
   *   ValidationError: 验证失败、管理员不存在或 MFA 未启用时抛出
   */
  async disableMfa(adminId: string, dto: MfaDisableDto): Promise<{ enabled: boolean }> {
    const admin = await this.deps.users.getUserById(this.repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }

    if (!admin.mfaEnabled || !admin.mfaSecret) {
      throw new ValidationError('MFA 未启用')
    }

    let secret: string
    try {
      secret = MfaEncryption.decryptSecret(admin.mfaSecret)
    } catch {
      throw new ValidationError('MFA 配置异常，请重新设置')
    }

    // 验证 TOTP 码
    const isValid = authenticator.verify({
      token: dto.code,
      secret,
    })

    if (!isValid) {
      throw new ValidationError('验证码错误，请重试')
    }

    // 禁用 MFA
    await this.deps.admin.disableMfa(this.repoCtx, { adminId })

    return { enabled: false }
  }

  /**
   * Function: regenerateBackupCodes
   *
   * Description: 重新生成备份码
   *
   * Parameters:
   *   adminId(string): 管理员 ID
   *   code(string): TOTP 验证码（用于验证身份）
   *
   * Returns:
   *   result(object): 包含新备份码的对象
   *
   * Throws:
   *   ValidationError: 验证失败、管理员不存在或 MFA 未启用时抛出
   */
  async regenerateBackupCodes(
    adminId: string,
    code: string
  ): Promise<{ backupCodes: string[] }> {
    const admin = await this.deps.users.getUserById(this.repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }

    if (!admin.mfaEnabled || !admin.mfaSecret) {
      throw new ValidationError('MFA 未启用')
    }

    let secret: string
    try {
      secret = MfaEncryption.decryptSecret(admin.mfaSecret)
    } catch {
      throw new ValidationError('MFA 配置异常，请重新设置')
    }

    // 验证 TOTP 码
    const isValid = authenticator.verify({
      token: code,
      secret,
    })

    if (!isValid) {
      throw new ValidationError('验证码错误，请重试')
    }

    // 生成新备份码
    const newBackupCodes = this.generateBackupCodes()
    await this.deps.admin.updateBackupCodes(this.repoCtx, {
      adminId,
      backupCodes: newBackupCodes,
    })

    return { backupCodes: newBackupCodes }
  }

  /**
   * Function: generateBackupCodes
   *
   * Description: 生成备份码列表
   *
   * Returns:
   *   codes(string[]): 8 个备份码，格式为 XXX-XXX
   *
   * Note:
   *   备份码使用 3 位大写字母和数字组合，中间用连字符分隔
   */
  private generateBackupCodes(): string[] {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const codes: string[] = []

    for (let i = 0; i < 8; i++) {
      let part1 = ''
      let part2 = ''
      const randomBytes = crypto.randomBytes(6)

      for (let j = 0; j < 3; j++) {
        part1 += charset[randomBytes[j] % charset.length]
        part2 += charset[randomBytes[j + 3] % charset.length]
      }

      codes.push(`${part1}-${part2}`)
    }

    return codes
  }
}

/**
 * Function: createAdminMeMfaService
 *
 * Description: 创建 AdminMeMfaService 实例的工厂函数
 *
 * Parameters:
 *   deps(object): 依赖对象
 *     - users: User Repository
 *     - admin: Admin Repository
 *   ctx(ServiceContext): 服务上下文
 *
 * Returns:
 *   service(AdminMeMfaService): AdminMeMfaService 实例
 */
export function createAdminMeMfaService(
  deps: { users: UserRepository; admin: AdminRepository },
  ctx: ServiceContext
): AdminMeMfaService {
  // 使用 users 和 admin repository
  return new AdminMeMfaService(deps, ctx)
}
