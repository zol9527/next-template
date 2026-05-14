/**
 * 常量定义模块
 * Description: 包含错误码、API版本等与后端保持一致的常量
 */

/**
 * API 版本
 */
export const API_VERSION: string = 'v1';

/**
 * 错误码枚举（与后端保持一致）
 */
export const ErrorCode = {
  /** 输入参数无效 */
  INVALID_INPUT: 'INVALID_INPUT',
  /** 未授权访问（未登录） */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 禁止访问（权限不足） */
  FORBIDDEN: 'FORBIDDEN',
  /** 资源冲突 */
  CONFLICT: 'CONFLICT',
  /** 幂等性冲突（重复请求） */
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  /** 幂等性密钥已过期 */
  IDEMPOTENCY_KEY_EXPIRED: 'IDEMPOTENCY_KEY_EXPIRED',
  /** 资源不存在 */
  NOT_FOUND: 'NOT_FOUND',
  /** 无效凭证（用户名或密码错误） */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** 账户已被禁用 */
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  /** 账户已锁定 */
  LOCKED: 'LOCKED',
  /** 检测到会话重放攻击 */
  SESSION_REUSE_DETECTED: 'SESSION_REUSE_DETECTED',
  /** 请求过于频繁 */
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  /** 服务器内部错误 */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * 错误码类型
 */
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * 错误码到用户友好中文提示的映射
 */
export const ErrorMessageMap: Record<string, string> = {
  [ErrorCode.INVALID_INPUT]: '输入参数有误，请检查',
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.CONFLICT]: '操作冲突，请刷新后重试',
  [ErrorCode.IDEMPOTENCY_CONFLICT]: '请勿重复提交',
  [ErrorCode.IDEMPOTENCY_KEY_EXPIRED]: '请求已过期，请重试',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已被禁用，请联系客服',
  [ErrorCode.LOCKED]: '账户已锁定，请稍后再试',
  [ErrorCode.SESSION_REUSE_DETECTED]: '会话异常，请重新登录',
  [ErrorCode.TOO_MANY_REQUESTS]: '操作过于频繁，请稍后再试',
  [ErrorCode.INTERNAL_ERROR]: '服务器异常，请稍后再试',
  // 前端自定义错误
  NETWORK_ERROR: '网络连接失败，请检查网络',
  TIMEOUT: '请求超时，请重试',
  UNKNOWN_ERROR: '未知错误，请稍后再试',
};

/**
 * HTTP 状态码
 */
export const HttpStatus = {
  /** 成功响应 (200) */
  OK: 200,
  /** 资源创建成功 (201) */
  CREATED: 201,
  /** 请求参数错误 (400) */
  BAD_REQUEST: 400,
  /** 未授权访问 (401) */
  UNAUTHORIZED: 401,
  /** 禁止访问 (403) */
  FORBIDDEN: 403,
  /** 资源不存在 (404) */
  NOT_FOUND: 404,
  /** 资源冲突 (409) */
  CONFLICT: 409,
  /** 请求过于频繁 (429) */
  TOO_MANY_REQUESTS: 429,
  /** 服务器内部错误 (500) */
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 存储键名（用于本地存储）
 */
export const StorageKey = {
  /** 访问令牌（JWT Token） */
  ACCESS_TOKEN: 'access_token',
  /** 刷新令牌（Refresh Token） */
  REFRESH_TOKEN: 'refresh_token',
  /** 用户信息（JSON 字符串） */
  USER_INFO: 'user_info',
  /** 设备唯一标识 */
  DEVICE_ID: 'device_id',
  /** HTTP Cookies（用于维持会话） */
  COOKIES: 'cookies',
  /** 应用版本号（用于版本比对，决定是否清除缓存） */
  APP_VERSION: 'app_version',
} as const;

/**
 * 版本更新时需要保留的存储键白名单。
 *
 * 这些键对应的数据在跨版本更新时应保持不变（如登录凭证、设备标识），
 * 其余键会在版本号变化时被清除，避免旧数据结构与新代码不兼容。
 */
export const PRESERVE_KEYS_ON_UPDATE: readonly string[] = [
  StorageKey.ACCESS_TOKEN,
  StorageKey.REFRESH_TOKEN,
  StorageKey.USER_INFO,
  StorageKey.DEVICE_ID,
  StorageKey.COOKIES,
  StorageKey.APP_VERSION,
] as const;

/**
 * 存储键类型
 */
export type StorageKeyType = typeof StorageKey[keyof typeof StorageKey];

/**
 * 日志级别
 */
export const LogLevel = {
  /** 调试级别信息 */
  DEBUG: 'debug',
  /** 一般信息 */
  INFO: 'info',
  /** 警告信息 */
  WARN: 'warn',
  /** 错误信息 */
  ERROR: 'error',
} as const;

/**
 * 日志级别类型
 */
export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/**
 * 敏感字段列表（用于日志脱敏）
 */
export const SENSITIVE_KEYS: string[] = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accessToken',
  'refreshToken',
  'sessionId',
  'phone',
  'mobile',
  'idCard',
  'creditCard',
  'bankCard',
  'wechatpay-signature',
  'wechatpay-serial',
  'wechatpay-timestamp',
  'wechatpay-nonce',
  'paySign',
];

/**
 * 用户角色（与后端保持一致）
 */
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

/**
 * 用户角色类型
 */
export type UserRoleType = typeof UserRole[keyof typeof UserRole];

/**
 * 订单状态（与后端保持一致）
 */
export const OrderStatus = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  CLOSED: 'closed',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  COMPLETED: 'completed',
} as const;

/**
 * 订单状态类型
 */
export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * 请求配置默认值
 */
export const RequestConfig = {
  TIMEOUT: 30000, // 30秒
  RETRY_TIMES: 3, // 重试3次
  RETRY_DELAY: 1000, // 重试延迟1秒
} as const;

/**
 * API 路径配置（便于联调期间切换）
 */
export const ApiPaths = {
  /** 微信登录（对应后端 route: /api/v1/auth/wechat） */
  WECHAT_LOGIN: '/auth/wechat',
  /** 微信资料补全 */
  WECHAT_PROFILE: '/user/profile/wechat',
  /** 微信手机号绑定 */
  WECHAT_PHONE_BIND: '/user/phone/wechat',
  /** 获取当前用户信息 */
  USER_ME: '/user/me',
} as const;
