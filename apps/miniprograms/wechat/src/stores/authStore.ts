/**
 * Function: useAuthStore
 *
 * Description: 认证状态管理 Store，支持开发环境自动登录和生产环境微信登录
 *
 * Returns:
 *   state(Ref): 原始状态
 *   isLoggedIn(ComputedRef): 是否已登录
 *   loading(ComputedRef): 加载状态
 *   userInfo(ComputedRef): 用户信息
 *   login(function): 密码登录
 *   loginWithWechat(function): 微信登录
 *   autoLogin(function): 自动登录（根据环境选择方式）
 *   logout(function): 退出登录
 *   initAuthState(function): 初始化认证状态
 */
import { computed } from 'vue';
import { createStorageStore } from './createStorageStore';
import { logger } from '../utils/logger';
import { showSuccess } from '../utils/toast';
import { authService, getAuthMode } from '../services/api/auth.service';
import { storage } from '../utils/storage';
import { StorageKey } from '../config/constants';
import type { UserInfo } from '../services/types';

// 存储键名
const STORAGE_KEY = 'edu_auth';

/**
 * 用户跳过资料完善记录的存储键
 * 存储格式：string[]（用户 ID 列表）
 * 该数据独立于认证状态，退出登录不会清除
 */
const PROFILE_SKIP_STORAGE_KEY = 'profile_skipped_user_ids';

interface AuthState {
  token: string;
  userInfo: FrontendUserInfo | null;
  isLoggedIn: boolean;
  loading: boolean;
}

interface FrontendUserInfo extends UserInfo {
  nickname?: string;
  username?: string;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}

function mergeFrontendUserInfo(
  base: UserInfo,
  options?: {
    profile?: { nickname?: string; avatarUrl?: string };
    previous?: FrontendUserInfo | null;
  }
): FrontendUserInfo {
  const rawUser = base.user;
  const profile = options?.profile;
  const previous = options?.previous;

  return {
    ...base,
    nickname: rawUser?.nickname || profile?.nickname || previous?.nickname,
    username: rawUser?.username || previous?.username || undefined,
    avatarUrl: profile?.avatarUrl || rawUser?.avatarUrl || previous?.avatarUrl || null,
    email: rawUser?.email || previous?.email || null,
    phone: rawUser?.phone || previous?.phone || null,
  };
}

const defaultState: AuthState = {
  token: '',
  userInfo: null,
  isLoggedIn: false,
  loading: false,
};

// 创建 Store
const store = createStorageStore('auth', {
  defaultState,
  storageKey: STORAGE_KEY,
  persist: true,
});

// 计算属性
const userId = computed(() => store.state.value.userInfo?.user?.id || null);
const username = computed(() => store.state.value.userInfo?.user?.username || '');
const avatar = computed(() => store.state.value.userInfo?.avatarUrl || store.state.value.userInfo?.user?.avatarUrl || null);
const roles = computed(() => store.state.value.userInfo?.roles || []);
const permissions = computed(() => store.state.value.userInfo?.permissions || []);
const isLoggedIn = computed(() => store.state.value.isLoggedIn);
const loading = computed(() => store.state.value.loading);
const userInfo = computed(() => store.state.value.userInfo);

// 文档要求的派生状态
const hasDisplayProfile = computed(() => {
  const info = store.state.value.userInfo;
  return Boolean(info?.nickname && info?.avatarUrl);
});
const hasPhone = computed(() => Boolean(store.state.value.userInfo?.phone));
const displayName = computed(() => {
  const info = store.state.value.userInfo;
  return info?.nickname || info?.username || '微信用户';
});

/**
 * 当前用户是否曾跳过资料完善
 * 通过检查独立存储的用户 ID 列表来判断，不受退出登录影响
 */
const hasSkippedProfile = computed(() => {
  const uid = store.state.value.userInfo?.user?.id;
  if (!uid) return false;
  const skippedIds: string[] = storage.getJSON(PROFILE_SKIP_STORAGE_KEY, []);
  return skippedIds.includes(String(uid));
});

/**
 * 当前用户是否需要完善资料
 * 条件：资料不完整（缺少昵称/头像 或 手机号） 且 未跳过过资料完善
 */
const shouldCompleteProfile = computed(() => {
  const profileIncomplete = !hasDisplayProfile.value || !hasPhone.value;
  return profileIncomplete && !hasSkippedProfile.value;
});

export function useAuthStore() {
  const { state, setState, action } = store;

  // 登录
  const login = action(async (identifier: string, password: string) => {
    setState({ loading: true });

    try {
      const result = await authService.loginWithPassword(identifier, password);
      const userInfo = mergeFrontendUserInfo(await authService.getCurrentUser(), {
        previous: state.value.userInfo,
      });

      setState({
        token: authService.getToken() || '',
        userInfo,
        isLoggedIn: true,
        loading: false,
      });

      showSuccess('登录成功');
      logger.info('登录成功', { userId: userId.value });

      return result;
    } catch (error) {
      setState({ loading: false });
      logger.error('登录失败', error);
      throw error;
    }
  });

  // 微信登录 - 只提交 code
  const loginWithWechat = action(async (code: string) => {
    setState({ loading: true });

    try {
      const result = await authService.loginWithWechat(code);
      const userInfo = mergeFrontendUserInfo(await authService.getCurrentUser(), {
        previous: state.value.userInfo,
      });

      setState({
        token: authService.getToken() || '',
        userInfo,
        isLoggedIn: true,
        loading: false,
      });

      showSuccess('登录成功');
      logger.info('微信登录成功', { userId: userId.value });

      return result;
    } catch (error) {
      setState({ loading: false });
      logger.error('微信登录失败', error);
      throw error;
    }
  });

  // 获取用户信息
  const fetchUserInfo = action(async () => {
    if (!state.value.isLoggedIn) {
      return null;
    }

    try {
      const userInfo = mergeFrontendUserInfo(await authService.getCurrentUser(), {
        previous: state.value.userInfo,
      });
      setState({ userInfo });
      return userInfo;
    } catch (error) {
      logger.error('获取用户信息失败', error);
      logout(false);
      throw error;
    }
  });

  // 退出登录
  const logout = action(async (showTip = true) => {
    try {
      await authService.logout();
    } catch (error) {
      logger.error('退出登录请求失败', error);
    } finally {
      setState({
        token: '',
        userInfo: null,
        isLoggedIn: false,
      });

      if (showTip) {
        showSuccess('已退出登录');
      }

      logger.info('退出登录成功');
    }
  });

  /**
   * 自动登录
   * - 开发环境（password 模式）：提示用户手动输入账号密码登录，不再使用硬编码凭据
   * - 生产环境：使用微信登录
   */
  const autoLogin = action(async () => {
    const mode = getAuthMode();
    logger.info(`🔑 开始自动登录，模式: ${mode}`);

    try {
      if (mode === 'password') {
        // 开发环境：不自动登录，提示用户在登录页面手动输入账号密码
        logger.warn('⚠️ 开发环境（password 模式）不支持自动登录，请手动输入账号密码');
        return;
      } else {
        // 生产环境：微信登录
        await authService.login();
        const userInfo = mergeFrontendUserInfo(await authService.getCurrentUser(), {
          previous: state.value.userInfo,
        });
        setState({
          token: authService.getToken() || '',
          userInfo,
          isLoggedIn: true,
          loading: false,
        });
        logger.info('✅ 微信自动登录成功', { userId: userId.value });
      }
    } catch (error) {
      logger.warn('⚠️ 自动登录失败，请手动登录', { error: String(error), mode });
      throw error;
    }
  });

  // 初始化登录状态
  const initAuthState = action(async () => {
    // 首先检查是否有已存储的 access token
    const existingToken = authService.getToken();

    if (existingToken) {
      logger.debug('发现已存储的 token，尝试恢复登录状态...');
      try {
        // 验证 token 有效性并获取用户信息
          const userInfo = mergeFrontendUserInfo(await authService.getCurrentUser(), {
            previous: state.value.userInfo,
          });
        setState({
          token: existingToken,
          userInfo,
          isLoggedIn: true,
          loading: false,
        });
        logger.info('✅ 已恢复登录状态', { userId: userId.value });
        return;
      } catch (error) {
        logger.warn('⚠️ token 已过期或无效，清除登录状态', { error: String(error) });
        // Token 无效时只清除本地状态，不调用后端 logout 接口
        // 因为 token 已过期，后端调用会再次触发 401，导致循环跳转
        storage.remove(StorageKey.ACCESS_TOKEN);
        storage.remove(StorageKey.REFRESH_TOKEN);
        storage.remove(StorageKey.USER_INFO);
        storage.remove(StorageKey.COOKIES);
        setState({
          token: '',
          userInfo: null,
          isLoggedIn: false,
          loading: false,
        });
      }
    }

    // 如果已有登录状态但没有 token（兼容旧逻辑）
    if (state.value.isLoggedIn && state.value.token) {
      logger.debug('从 Store 状态恢复登录', { userId: userId.value });
      return;
    }

    // ❌ 注释掉自动登录，改为手动触发微信登录
    // // 尝试自动登录（开发环境密码登录，生产环境微信登录）
    // try {
    //   await autoLogin();
    // } catch (error) {
    //   // 自动登录失败不阻塞应用，用户可手动登录
    //   logger.debug('自动登录跳过或失败', { error: String(error) });
    // }

    logger.debug('等待用户手动登录');
  });

  // 检查角色
  const hasRole = (roleName: string): boolean => {
    return roles.value.some((role: { name: string }) => role.name === roleName);
  };

  // 检查权限
  const hasPermission = (permission: string): boolean => {
    return permissions.value.includes(permission);
  };

  /**
   * 记录当前用户已跳过资料完善
   * 将用户 ID 写入独立存储，退出登录不会清除
   */
  const skipProfileCompletion = action(() => {
    const uid = store.state.value.userInfo?.user?.id;
    if (!uid) {
      logger.warn('无法记录跳过状态：缺少用户 ID');
      return;
    }
    const uidStr = String(uid);
    const skippedIds: string[] = storage.getJSON(PROFILE_SKIP_STORAGE_KEY, []);
    if (!skippedIds.includes(uidStr)) {
      skippedIds.push(uidStr);
      storage.setJSON(PROFILE_SKIP_STORAGE_KEY, skippedIds);
      logger.info('已记录用户跳过资料完善', { userId: uidStr });
    }
  });

  return {
    // 状态（原始 Ref，用于高级场景）
    state,

    // 计算属性（响应式，可直接在模板中使用 .value 或不加 .value）
    isLoggedIn,
    loading,
    userInfo,
    userId,
    username,
    avatar,
    roles,
    permissions,
    hasDisplayProfile,
    hasPhone,
    hasSkippedProfile,
    shouldCompleteProfile,
    displayName,

    // Actions
    login,
    loginWithWechat,
    autoLogin,
    fetchUserInfo,
    logout,
    initAuthState,
    skipProfileCompletion,

    // 辅助方法
    hasRole,
    hasPermission,
  };
}

export type { AuthState };
