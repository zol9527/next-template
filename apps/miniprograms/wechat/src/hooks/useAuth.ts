/**
 * Function: useAuth
 *
 * Description: 认证状态 Composable，提供登录/登出/用户信息等响应式状态和方法
 *
 * Returns:
 *  isLoggedIn(Ref): 是否已登录
 *  user(Ref): 用户信息
 *  userId(Ref): 用户ID
 *  loading(Ref): 加载状态
 *  login(function): 登录
 *  logout(function): 登出
 *  fetchUser(function): 获取用户信息
 */

import { computed, readonly } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../utils/logger';

interface LoginParams {
  identifier: string;
  password: string;
}

export function useAuth() {
  const store = useAuthStore();

  // 响应式状态
  const isLoggedIn = computed(() => store.isLoggedIn);
  const user = computed(() => store.userInfo);
  const userId = computed(() => store.userId);
  const username = computed(() => store.username);
  const avatar = computed(() => store.avatar);
  const roles = computed(() => store.roles);
  const permissions = computed(() => store.permissions);
  const loading = computed(() => store.loading);
  const hasDisplayProfile = computed(() => store.hasDisplayProfile);
  const hasPhone = computed(() => store.hasPhone);
  const displayName = computed(() => store.displayName);

  // 检查权限
  const hasPermission = (permission: string): boolean => {
    return store.permissions.includes(permission);
  };

  // 检查角色
  const hasRole = (roleName: string): boolean => {
    return store.roles.some(role => role.name === roleName);
  };

  // 登录
  async function login(params: LoginParams): Promise<void> {
    logger.info('登录请求', { identifier: params.identifier });
    await store.login(params.identifier, params.password);
  }

  // 微信登录 - 只提交 code
  async function loginWithWechat(code: string): Promise<void> {
    logger.info('微信登录请求');
    await store.loginWithWechat(code);
  }

  // 登出
  async function logout(showTip = true): Promise<void> {
    logger.info('登出请求');
    await store.logout(showTip);
  }

  // 获取用户信息
  async function fetchUser(): Promise<void> {
    await store.fetchUserInfo();
  }

  // 初始化（页面加载时调用）
  async function init(): Promise<void> {
    await store.initAuthState();
  }

  return {
    // 状态（只读）
    isLoggedIn: readonly(isLoggedIn),
    user: readonly(user),
    userId: readonly(userId),
    username: readonly(username),
    avatar: readonly(avatar),
    roles: readonly(roles),
    permissions: readonly(permissions),
    loading: readonly(loading),
    hasDisplayProfile: readonly(hasDisplayProfile),
    hasPhone: readonly(hasPhone),
    displayName: readonly(displayName),

    // 可变状态
    state: store.state,

    // 方法
    login,
    loginWithWechat,
    logout,
    fetchUser,
    init,
    hasPermission,
    hasRole,
  };
}
