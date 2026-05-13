/**
 * 认证模式类型
 * - password: 密码登录（开发调试用）
 * - wechat: 微信登录（生产环境）
 */
export type AuthMode = 'password' | 'wechat';

/**
 * 环境类型
 * - development: 开发环境（微信开发者工具），使用密码登录
 * - trial: 体验版（体验环境），使用微信登录
 * - production: 正式版（生产环境），使用微信登录
 */
type EnvType = 'development' | 'trial' | 'production';

/**
 * Function: getEnv
 *
 * Description: 获取当前环境标识（自动识别）
 * 通过微信小程序的 envVersion 判断：
 * - develop: 开发环境（微信开发者工具）
 * - trial: 体验环境（体验版）
 * - release: 生产环境（正式版）
 *
 * Returns:
 *   EnvType: 环境类型
 */
export function getEnv(): EnvType {
  // 手动覆盖常量（调试时取消注释即可临时切换环境）
  // const OVERRIDE_ENV: EnvType | null = 'development';

  try {
    // 使用微信小程序官方 API 获取真实环境标识
    // 返回值: 'develop' | 'trial' | 'release'
    const accountInfo = uni.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;

    switch (envVersion) {
      case 'develop':
        return 'development'; // 开发版（微信开发者工具）
      case 'trial':
        return 'trial'; // 体验版
      case 'release':
        return 'production'; // 正式版
      default:
        return 'development';
    }
  } catch {
    // fallback: getAccountInfoSync 在非小程序平台（如 HBuilderX 浏览器预览）不可用
    // 默认返回开发环境
    return 'development';
  }
}

/**
 * Function: getAuthMode
 *
 * Description: 获取当前认证模式（自动判断）
 * 开发环境使用密码登录，体验版和正式版使用微信登录
 *
 * Returns:
 *   AuthMode: 认证模式
 */
function getAuthMode(): AuthMode {
  const env = getEnv();
  // development 使用密码登录，trial 和 production 使用微信登录
  return env === 'development' ? 'password' : 'wechat';
}

/**
 * API 基础地址默认值
 *
 * 优先级：
 *   1. Vite 环境变量 VITE_API_BASE_URL（在 .env.development / .env.production 中配置）
 *   2. 根据 getEnv() 自动选择默认值
 *
 * 修改方式：
 *   - 改 .env.development → 影响开发编译（make dev / make watch）
 *   - 改 .env.production  → 影响生产构建（make build）
 *   - 修改后需重新编译才能生效
 */
const DEV_API_BASE_URL = 'http://localhost:3000/api/v1';
const PROD_API_BASE_URL = 'https://www.shuoboda.cn/api/v1';

/**
 * Function: getApiBaseURL
 *
 * Description: 获取 API 基础地址
 * 优先读取 Vite 编译时注入的 VITE_API_BASE_URL 环境变量，
 * 如未配置则根据当前运行环境自动选择默认地址
 *
 * Returns:
 *   string: API 基础地址
 */
function getApiBaseURL(): string {
  // Vite 编译时静态替换 import.meta.env.VITE_API_BASE_URL
  // 不需要运行时 import.meta 检查（小程序环境不支持）
  const envUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl;
  }

  // 未配置 .env 时，根据运行环境自动选择
  const env = getEnv();
  return env === 'development' ? DEV_API_BASE_URL : PROD_API_BASE_URL;
}

/**
 * 环境配置对象
 */
export const envConfig = {
  /**
   * 是否为开发环境（用于需要区分 development 的逻辑）
   */
  isDev: getEnv() === 'development',

  /**
   * 是否使用微信登录（trial 和 production 使用微信登录）
   */
  isWechatAuth: getEnv() !== 'development',

  /**
   * 环境标识
   */
  env: getEnv(),

  /**
   * 认证模式
   * - password: 密码登录，方便调试
   * - wechat: 微信登录
   */
  authMode: getAuthMode(),

  /**
   * 是否需要登录认证
   *
   * 小程序冷启动时会先进入 pages.json 的首个页面。这里默认开启登录守卫，
   * 让未登录用户先进入登录页，再根据用户资料状态进入"完善个人信息"页。
   */
  requireAuth: true,

  /**
   * 是否跳过冷启动登录守卫（仅用于本地调试）
   *
   * 调试首页、商城、订单等页面时可临时改为 true，应用会保留 pages.json
   * 的默认首页入口，不再强制跳转登录页。提交或发布前应保持 false。
   */
  skipStartupLogin: false,

  /**
   * API 基础地址
   *
   * 修改方式：
   *   - 开发环境: 编辑 .env.development 中的 VITE_API_BASE_URL
   *   - 生产环境: 编辑 .env.production 中的 VITE_API_BASE_URL
   *   - 修改后需重新编译才能生效
   */
  apiBaseURL: getApiBaseURL(),

  /**
   * 日志级别
   */
  logLevel: getEnv() === 'development' ? 'debug' : 'info',

  /**
   * 是否启用远程日志上报
   */
  logEnableRemote: false,

  /**
   * 请求超时时间（毫秒）
   */
  requestTimeout: 30000,

  /**
   * 请求重试次数
   */
  requestRetryTimes: 3,

  /**
   * 请求重试延迟（毫秒）
   */
  requestRetryDelay: 1000,
} as const;

export default envConfig;
