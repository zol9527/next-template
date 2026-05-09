/**
 * 统一配置入口
 * Description: 聚合所有配置模块，提供统一的配置访问入口
 */

import { envConfig } from './env';
import * as constants from './constants';

// 重新导出常用常量和类型，便于直接导入
export {
  API_VERSION,
  ErrorCode,
  ErrorMessageMap,
  HttpStatus,
  StorageKey,
  LogLevel,
  SENSITIVE_KEYS,
  UserRole,
  OrderStatus,
  RequestConfig,
} from './constants';
export type {
  ErrorCodeType,
  StorageKeyType,
  LogLevelType,
  UserRoleType,
  OrderStatusType,
} from './constants';

// 重新导出环境配置函数
export { getEnv } from './env';

// 重新导出 API 响应相关
export {
  ResponseCode,
  SuccessResponse,
  FailResponse,
  createSuccessResponse,
  createFailResponse,
  isSuccess,
  getResponseData,
  parseResponse,
  extractErrorMessage,
} from './api-response';
export type { ApiResponse } from './api-response';

/**
 * 统一配置对象
 */
export const config = {
  /**
   * 环境配置
   */
  env: envConfig,

  /**
   * 常量定义
   */
  constants,

  /**
   * API 相关配置
   */
  api: {
    /**
     * API 基础地址
     */
    baseURL: envConfig.apiBaseURL,

    /**
     * API 版本
     */
    version: constants.API_VERSION,

    /**
     * 请求超时时间（毫秒）
     */
    timeout: envConfig.requestTimeout,

    /**
     * 请求重试次数
     */
    retryTimes: envConfig.requestRetryTimes,

    /**
     * 请求重试延迟（毫秒）
     */
    retryDelay: envConfig.requestRetryDelay,
  },

  /**
   * 存储相关配置
   */
  storage: {
    /**
     * Access Token 存储键
     */
    ACCESS_TOKEN: constants.StorageKey.ACCESS_TOKEN,

    /**
     * Refresh Token 存储键
     */
    REFRESH_TOKEN: constants.StorageKey.REFRESH_TOKEN,

    /**
     * 用户信息存储键
     */
    USER_INFO: constants.StorageKey.USER_INFO,

    /**
     * 设备 ID 存储键
     */
    DEVICE_ID: constants.StorageKey.DEVICE_ID,
  },

  /**
   * 日志相关配置
   */
  log: {
    /**
     * 日志级别
     */
    level: envConfig.logLevel,

    /**
     * 是否启用远程日志上报
     */
    enableRemote: envConfig.logEnableRemote,

    /**
     * 日志远程上报地址（可选）
     */
    remoteUrl: envConfig.apiBaseURL + '/internal/logs',
  },

  /**
   * 业务相关配置
   */
  business: {
    /**
     * 最大上传文件大小（10MB）
     */
    MAX_UPLOAD_SIZE: 10 * 1024 * 1024,

    /**
     * Token 刷新阈值（15分钟）
     */
    TOKEN_REFRESH_THRESHOLD: 15 * 60 * 1000,
  },
} as const;

/**
 * 向后兼容：导出 envConfig
 */
export const envConfigLegacy = envConfig;

export default config;
