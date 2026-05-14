<template>
  <view class="app-container">
    <ErrorBoundary>
      <slot />
      <PrivacyPopup />
    </ErrorBoundary>
  </view>
</template>

<script lang="ts">
import { useAuthStore } from './stores'
import config from './config'
import { logger } from './utils/logger'
import { checkMiniProgramUpdate } from './utils/update-manager'
import { storage } from './utils/storage'
import { StorageKey } from './config/constants'
import { APP_VERSION } from './config/version'
import ErrorBoundary from './components/error-boundary.vue'
import PrivacyPopup from './components/PrivacyPopup.vue'

const LOGIN_PAGE = '/pages/login/login'
const HOME_PAGE = '/pages/index/index'
const PROFILE_COMPLETE_PAGE = '/subpackages/profile/complete'

type AuthStore = ReturnType<typeof useAuthStore>

/**
 * Function: getCurrentRoutePath
 *
 * Description: 获取当前页面路径，并统一补齐开头的斜杠，便于和 uni 跳转
 * URL 保持一致。冷启动早期页面栈可能为空，此时返回空字符串。
 *
 * Returns:
 *   routePath(string): 当前页面路径
 */
function getCurrentRoutePath(): string {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]

  return currentPage?.route ? `/${currentPage.route}` : ''
}

/**
 * Function: isAgreementRoute
 *
 * Description: 判断当前页面是否为用户协议或隐私政策页面。协议页需要允许
 * 未登录访问，否则用户无法在登录前阅读协议内容。
 *
 * Parameters:
 *   routePath(string): 当前页面路径
 *
 * Returns:
 *   isAgreement(boolean): 是否为协议相关页面
 */
function isAgreementRoute(routePath: string): boolean {
  return routePath.startsWith('/subpackages/agreements/')
}

/**
 * Function: enforceStartupAuth
 *
 * Description: 执行冷启动登录守卫。默认要求用户先登录；登录成功后如果
 * 用户资料不完整，则进入“完善个人信息”页。调试时可通过
 * config.env.skipStartupLogin 跳过这段首页登录拦截。
 *
 * Parameters:
 *   authStore(AuthStore): 认证状态 Store
 */
function enforceStartupAuth(authStore: AuthStore): void {
  if (!config.env.requireAuth || config.env.skipStartupLogin) {
    logger.info('冷启动登录守卫已跳过', {
      requireAuth: config.env.requireAuth,
      skipStartupLogin: config.env.skipStartupLogin,
    })
    return
  }

  const currentRoute = getCurrentRoutePath()

  if (!currentRoute) {
    setTimeout(() => enforceStartupAuth(authStore), 0)
    return
  }

  if (!authStore.isLoggedIn.value) {
    if (currentRoute !== LOGIN_PAGE && !isAgreementRoute(currentRoute)) {
      logger.info('未登录用户进入应用，跳转登录页', { currentRoute })
      uni.reLaunch({ url: LOGIN_PAGE })
    }
    return
  }

  const needsProfileCompletion = authStore.shouldCompleteProfile.value

  if (needsProfileCompletion) {
    if (currentRoute !== PROFILE_COMPLETE_PAGE && !isAgreementRoute(currentRoute)) {
      logger.info('用户资料未完善，跳转资料完善页', { currentRoute })
      uni.redirectTo({ url: PROFILE_COMPLETE_PAGE })
    }
    return
  }

  if (currentRoute === LOGIN_PAGE) {
    logger.info('已登录用户停留在登录页，跳转首页')
    uni.switchTab({ url: HOME_PAGE })
  }
}

export default {
  components: {
    ErrorBoundary,
    PrivacyPopup,
  },
  async onLaunch() {
    const authStore = useAuthStore()
    logger.info('App 启动', { version: APP_VERSION })

    // 版本比对：版本号变化时清除非关键缓存，防止旧数据结构与新代码不兼容
    const cachedVersion = storage.get(StorageKey.APP_VERSION) as string | null
    if (cachedVersion && cachedVersion !== APP_VERSION) {
      logger.info('检测到版本更新，清除非关键缓存', { from: cachedVersion, to: APP_VERSION })
      storage.clearNonCritical()
    }
    storage.set(StorageKey.APP_VERSION, APP_VERSION)

    // 注意：uni-app 的 onLaunch 不等待 async 函数完成，框架可能在 initAuthState 完成前就开始创建页面。
    // 因此：
    // 1. initAuthState 中的 token 验证是异步的，但 store 状态从 storage 同步恢复（createStorageStore 在创建时即读取 storage）
    // 2. enforceStartupAuth 放在 initAuthState 之后执行，确保异步验证完成后再做路由守卫判断
    // 3. 首页 onMounted 中也调用了 auth.init() 作为兜底
    try {
      await authStore.initAuthState()
    } catch (error) {
      logger.warn('认证状态初始化失败，已降级为未登录状态', { error: String(error) })
      authStore.logout(false)
    } finally {
      enforceStartupAuth(authStore)
    }

    // 检查小程序版本更新（异步，不阻塞启动）
    checkMiniProgramUpdate()

    // 已登录用户的资料在 initAuthState 中已经恢复，这里不再重复请求，避免冷启动多打一次 /user/me。
  },
  onShow() {
    logger.debug('App Show Skipped')
  },
  onHide() {
    logger.debug('App Hide Skipped')
  },
}
</script>

<style lang="scss">
/* 全局样式 */

/* 重置样式 */
page {
  background-color: $uni-bg-color;
  font-size: $uni-font-size-base;
  color: $uni-text-color;
  line-height: 1.6;
}

/* 通用类 */
.container {
  padding: $uni-spacing-row-base;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

/* 文本省略 */
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
