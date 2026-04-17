// src/services/client/admin-me-mfa.client-service.ts
/**
 * Module: admin-me-mfa.client-service.ts
 *
 * Description: 管理员 MFA 设置客户端服务，封装 MFA 相关的 API 调用
 *
 * Methods:
 *   - getStatus(): 获取 MFA 状态
 *   - generateTotpSecret(): 生成 TOTP 密钥和二维码
 *   - verifyAndEnable(): 验证并启用 TOTP
 *   - disable(): 禁用 MFA
 *   - regenerateBackupCodes(): 重新生成备份码
 */

import { MfaVerifyDto } from '@/contracts/dtos/admin/me';

/**
 * Class: AdminMeMfaClientService
 *
 * Description: 管理员 MFA 设置客户端服务类
 */
export class AdminMeMfaClientService {
  private basePath = '/api/v1/admin/me/mfa';

  /**
   * Function: getStatus
   *
   * Description: 获取当前管理员的 MFA 状态
   *
   * Returns:
   *   Promise<any>: MFA 状态信息
   */
  async getStatus() {
    const res = await fetch(this.basePath);
    return res.json();
  }

  /**
   * Function: generateTotpSecret
   *
   * Description: 生成 TOTP 密钥和二维码
   *
   * Returns:
   *   Promise<any>: 包含密钥、二维码 URL 和备份码的数据
   */
  async generateTotpSecret() {
    const res = await fetch(`${this.basePath}/setup/totp`, {
      method: 'POST',
    });
    return res.json();
  }

  /**
   * Function: verifyAndEnable
   *
   * Description: 验证 TOTP 验证码并启用 MFA
   *
   * Parameters:
   *   data (MfaVerifyDto): 包含 6 位验证码的验证数据
   *
   * Returns:
   *   Promise<any>: 启用结果
   */
  async verifyAndEnable(data: MfaVerifyDto) {
    const res = await fetch(`${this.basePath}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Function: disable
   *
   * Description: 禁用 MFA
   *
   * Parameters:
   *   data (object): 包含验证码和确认禁用标志的数据
   *     - code: 6 位验证码
   *     - confirmDisable: 确认禁用标志（必须为 true）
   *
   * Returns:
   *   Promise<any>: 禁用结果
   */
  async disable(data: { code: string; confirmDisable: boolean }) {
    const res = await fetch(this.basePath, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Function: regenerateBackupCodes
   *
   * Description: 重新生成备份码
   *
   * Parameters:
   *   code (string): 6 位验证码
   *
   * Returns:
   *   Promise<any>: 包含新备份码的结果
   */
  async regenerateBackupCodes(code: string) {
    const res = await fetch(`${this.basePath}/backup-codes/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return res.json();
  }
}
