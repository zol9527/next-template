// src/services/client/admin-me.client-service.ts
/**
 * Module: admin-me.client-service.ts
 *
 * Description: 管理员个人资料客户端服务，封装个人资料相关的 API 调用
 *
 * Methods:
 *   - getProfile(): 获取当前管理员信息
 *   - updateProfile(): 更新个人资料
 *   - changePassword(): 修改密码
 *   - getSessions(): 获取登录会话列表
 *   - revokeSession(): 撤销指定会话
 *   - revokeAllSessions(): 撤销所有其他会话
 */

import { UpdateProfileDto, ChangePasswordDto } from '@/contracts/dtos/admin/me';

/**
 * Class: AdminMeClientService
 *
 * Description: 管理员个人资料客户端服务类
 */
export class AdminMeClientService {
  private basePath = '/api/v1/admin/me';

  /**
   * Function: getProfile
   *
   * Description: 获取当前管理员个人信息
   *
   * Returns:
   *   Promise<any>: 管理员信息
   */
  async getProfile() {
    const res = await fetch(this.basePath);
    return res.json();
  }

  /**
   * Function: updateProfile
   *
   * Description: 更新当前管理员的个人资料
   *
   * Parameters:
   *   data (UpdateProfileDto): 更新的个人资料数据
   *
   * Returns:
   *   Promise<any>: 更新结果
   */
  async updateProfile(data: UpdateProfileDto) {
    const res = await fetch(this.basePath, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Function: changePassword
   *
   * Description: 修改当前管理员的密码
   *
   * Parameters:
   *   data (ChangePasswordDto): 密码修改数据
   *
   * Returns:
   *   Promise<any>: 修改结果
   */
  async changePassword(data: ChangePasswordDto) {
    const res = await fetch(`${this.basePath}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Function: getSessions
   *
   * Description: 获取当前管理员的登录会话列表
   *
   * Returns:
   *   Promise<any>: 会话列表
   */
  async getSessions() {
    const res = await fetch(`${this.basePath}/sessions`);
    return res.json();
  }

  /**
   * Function: revokeSession
   *
   * Description: 撤销指定的登录会话
   *
   * Parameters:
   *   sessionId (string): 会话 ID
   *
   * Returns:
   *   Promise<any>: 撤销结果
   */
  async revokeSession(sessionId: string) {
    const res = await fetch(`${this.basePath}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    return res.json();
  }

  /**
   * Function: revokeAllSessions
   *
   * Description: 撤销所有其他登录会话（保留当前会话）
   *
   * Returns:
   *   Promise<any>: 撤销结果
   */
  async revokeAllSessions() {
    const res = await fetch(`${this.basePath}/sessions`, {
      method: 'DELETE',
    });
    return res.json();
  }
}
