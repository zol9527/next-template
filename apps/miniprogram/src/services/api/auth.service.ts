/**
 * Function: authService
 *
 * Description: 认证服务模块，支持开发环境密码登录和生产环境微信登录
 *
 * Returns:
 *   loginWithPassword(function): 密码登录（开发环境）
 *   loginWithWechat(function): 微信登录（生产环境）
 *   login(function): 统一登录入口，根据环境自动选择登录方式
 *   getCurrentUser(function): 获取当前用户信息
 *   refreshToken(function): 刷新 Token
 *   logout(function): 退出登录
 */

import { httpClient } from '../../core/http-client';
import { logger } from '../../utils/logger';
import { StorageKey, ApiPaths } from '../../config/constants';
import { storage } from '../../utils/storage';
import { envConfig } from '../../config/env';
import type { UserInfo, LoginResponse } from '../../types';

const API_PREFIX = '/auth';

/**
 * 认证模式
 */
export type AuthMode = 'password' | 'wechat';

/**
 * 获取当前认证模式
 * 开发环境使用密码登录，生产环境使用微信登录
 */
export function getAuthMode(): AuthMode {
  return envConfig.isDev ? 'password' : 'wechat';
}

/**
 * 认证服务
 */
export const authService = {
  /**
   * 密码登录（仅开发环境使用）
   *
   * @param identifier - 用户名/邮箱/手机号
   * @param password - 密码
   */
  async loginWithPassword(identifier: string, password: string): Promise<LoginResponse> {
    logger.info('开始密码登录', { identifier, mode: 'password' });

    try {
      const result = await httpClient.post<LoginResponse>(`${API_PREFIX}/login`, {
        identifier,
        password,
      });

      // 保存 token
      this._saveTokens(result);

      logger.info('密码登录成功', { userId: result.userId });
      return result;
    } catch (error) {
      logger.error('密码登录失败', error, { identifier });
      throw error;
    }
  },

  /**
   * 微信登录（生产环境使用）
   * 只提交 code，不再依赖昵称头像
   *
   * @param code - 微信登录 code（通过 wx.login 获取）
   */
  async loginWithWechat(code: string): Promise<LoginResponse> {
    logger.info('开始微信登录', { mode: 'wechat' });

    try {
      const result = await httpClient.post<LoginResponse>(ApiPaths.WECHAT_LOGIN, {
        code,
      });
      // 保存 token
      this._saveTokens(result);

      logger.info('微信登录成功', { userId: result.userId });
      return result;
    } catch (error) {
      logger.error('微信登录失败', error);
      throw error;
    }
  },

   /**
   * 统一登录入口
   * 根据当前环境自动选择登录方式：
   * - 开发环境：使用提供的 identifier/password 进行密码登录
   * - 生产环境：调用 uni.login 获取 code 进行微信登录
   *
   * @param params - 登录参数（开发环境需要 identifier 和 password）
   */
  async login(params?: { identifier?: string; password?: string }): Promise<LoginResponse> {
    const mode = getAuthMode();

    if (mode === 'password') {
      // 开发环境：密码登录
      if (!params?.identifier || !params?.password) {
        throw new Error('开发环境登录需要提供 identifier 和 password');
      }
      return this.loginWithPassword(params.identifier, params.password);
    }

    // 生产环境：微信登录
    return this._loginWithWechatAuto();
  },

  /**
   * 自动获取微信 code 并登录
   */
  async _loginWithWechatAuto(): Promise<LoginResponse> {
    logger.info('自动获取微信登录 code...');

    try {
      // 调用微信登录获取 code（使用 uni-app API）
      const loginResult = await new Promise<{
        code?: string;
        authResult?: unknown;
        errMsg: string;
      }>((resolve, reject) => {
        uni.login({
          provider: 'weixin',  // uni-app 需要指定 provider
          success: resolve,
          fail: reject,
        });
      });

      if (!loginResult.code) {
        throw new Error('获取微信登录 code 失败');
      }

      logger.debug('获取微信 code 成功', { codeLength: loginResult.code.length });

      // 使用 code 进行登录
      return this.loginWithWechat(loginResult.code);
    } catch (error) {
      logger.error('微信自动登录失败', error);
      throw error;
    }
  },

  /**
   * 保存 token 到本地存储
   */
  _saveTokens(result: LoginResponse): void {
    if (result.accessToken) {
      storage.set(StorageKey.ACCESS_TOKEN, result.accessToken);
      logger.debug('已保存 accessToken');
    }
    if (result.refreshToken) {
      storage.set(StorageKey.REFRESH_TOKEN, result.refreshToken);
      logger.debug('已保存 refreshToken');
    }
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo> {
    logger.info('获取当前用户信息');

    try {
      const result = await httpClient.get<UserInfo>(`/user/me`);

      // 缓存用户信息
      storage.setJSON(StorageKey.USER_INFO, result);

      logger.info('获取用户信息成功', { userId: result.user?.id });
      return result;
    } catch (error) {
      logger.error('获取用户信息失败', error);
      throw error;
    }
  },

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<LoginResponse> {
    logger.info('刷新 Token');

    try {
      const result = await httpClient.post<LoginResponse>(`${API_PREFIX}/refresh`);

      logger.info('Token 刷新成功');
      return result;
    } catch (error) {
      logger.error('Token 刷新失败', error);
      throw error;
    }
  },

  /**
   * 退出登录
   * 如果 token 已不存在（如已过期被清除），则跳过网络请求只清理本地数据
   */
  async logout(): Promise<void> {
    logger.info('开始退出登录');

    try {
      // 仅在有 token 时才调用后端退出接口，避免 token 已失效时触发 401 循环
      const currentToken = this.getToken();
      if (currentToken) {
        await httpClient.post(`${API_PREFIX}/logout`);
        logger.info('退出登录成功');
      } else {
        logger.info('无有效 token，跳过后端退出请求');
      }
    } catch (error) {
      logger.error('退出登录请求失败', error);
      // 即使请求失败也继续清除本地数据
    } finally {
      // 清除本地存储
      storage.remove(StorageKey.ACCESS_TOKEN);
      storage.remove(StorageKey.REFRESH_TOKEN);
      storage.remove(StorageKey.USER_INFO);
      storage.remove(StorageKey.COOKIES);
    }
  },

  /**
   * 检查登录状态
   */
  isLoggedIn(): boolean {
    const token = storage.get(StorageKey.ACCESS_TOKEN);
    return !!token;
  },

  /**
   * 获取缓存的用户信息
   */
  getCachedUserInfo(): UserInfo | null {
    return storage.getJSON(StorageKey.USER_INFO, null);
  },

  /**
   * 获取 Token
   */
  getToken(): string | null {
    return storage.get(StorageKey.ACCESS_TOKEN, null);
  },

  /**
   * 设置 Token
   */
  setToken(token: string): void {
    storage.set(StorageKey.ACCESS_TOKEN, token);
  },
};

export type { AuthService };
