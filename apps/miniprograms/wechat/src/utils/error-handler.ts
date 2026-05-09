/**
 * Function: createErrorHandler
 *
 * Description: 统一错误处理模块，提供错误类定义、错误转换、用户友好提示等功能
 *
 * Returns:
 *   exports(object): 导出的错误类和处理函数
 */

import { ErrorMessageMap as BaseErrorMessageMap } from '../config/constants';

// V8 引擎的 captureStackTrace API 类型声明
interface V8ErrorConstructor {
  captureStackTrace?(target: Error, constructor?: Function): void;
}

/**
 * 错误码到消息的映射（基于统一配置扩展，添加前端特有错误码）
 */
const ERROR_CODE_MAP: Record<string, string> = {
  ...BaseErrorMessageMap,
  // 认证错误（前端扩展）
  '401': '登录已过期，请重新登录',
  AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录',
  AUTH_INVALID_TOKEN: '登录无效，请重新登录',
  AUTH_REQUIRED: '请先登录',
  AUTH_REFRESH_FAILED: 'Token 刷新失败，请重新登录',

  // 权限错误（前端扩展）
  '403': '没有权限执行此操作',
  PERMISSION_DENIED: '没有权限执行此操作',

  // 业务错误（前端扩展）
  '400': '请求参数错误',
  VALIDATION_ERROR: '参数验证失败',
  RATE_LIMITED: '请求过于频繁，请稍后重试',

  // 服务器错误（前端扩展）
  '500': '服务器错误，请稍后重试',
  '502': '服务暂时不可用，请稍后重试',
  '503': '服务维护中，请稍后重试',
  SERVER_ERROR: '服务器错误，请稍后重试',
  REQUEST_CANCELLED: '请求已取消',

  // 客户端错误
  CLIENT_ERROR: '客户端错误',
};

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  /** 信息级别 - 用户操作被阻止但不是错误 */
  INFO = 'info',
  /** 警告级别 - 可恢复的错误 */
  WARNING = 'warning',
  /** 错误级别 - 需要用户关注 */
  ERROR = 'error',
  /** 严重级别 - 系统级错误 */
  CRITICAL = 'critical',
}

/**
 * 错误处理选项
 */
export interface ErrorHandleOptions {
  /** 是否显示 Toast 提示，默认 true */
  showToast?: boolean;
  /** 是否重定向到登录页（仅认证错误），默认 false */
  redirectToLogin?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 错误上下文 */
  context?: Record<string, unknown>;
}

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly severity: ErrorSeverity;
  public readonly isHandled: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    options?: {
      context?: Record<string, unknown>;
      severity?: ErrorSeverity;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = options?.context;
    this.severity = options?.severity || ErrorSeverity.ERROR;
    this.isHandled = true;
    this.timestamp = Date.now();

    // 保留原始堆栈 (V8 引擎特定 API)
    const v8Error = Error as unknown as V8ErrorConstructor;
    if (v8Error.captureStackTrace) {
      v8Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为可序列化对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      severity: this.severity,
      timestamp: this.timestamp,
    };
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends AppError {
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code || 'NETWORK_ERROR', {
      context: options?.context,
      severity: ErrorSeverity.WARNING,
    });
    this.name = 'NetworkError';
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? true;
  }
}

/**
 * 业务错误类
 */
export class BusinessError extends AppError {
  public readonly httpStatus?: number;

  constructor(
    code: string,
    message: string,
    options?: {
      httpStatus?: number;
      context?: Record<string, unknown>;
      severity?: ErrorSeverity;
    }
  ) {
    super(message, code, {
      context: options?.context,
      severity: options?.severity || ErrorSeverity.WARNING,
    });
    this.name = 'BusinessError';
    this.httpStatus = options?.httpStatus;
  }
}

/**
 * 认证错误类
 */
export class AuthError extends AppError {
  public readonly shouldRedirect: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      shouldRedirect?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, options?.code || 'AUTH_REQUIRED', {
      context: options?.context,
      severity: ErrorSeverity.WARNING,
    });
    this.name = 'AuthError';
    this.shouldRedirect = options?.shouldRedirect ?? true;
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    options?: {
      fields?: Record<string, string[]>;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, 'VALIDATION_ERROR', {
      context: options?.context,
      severity: ErrorSeverity.INFO,
    });
    this.name = 'ValidationError';
    this.fields = options?.fields;
  }
}

/**
 * Function: getErrorMessage
 *
 * Description: 获取用户友好的错误消息
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *
 * Returns:
 *   message(string): 用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_CODE_MAP[error.code] || error.message;
  }

  if (error instanceof Error) {
    // 网络错误
    if (error.message.includes('Network') || error.message.includes('network')) {
      return ERROR_CODE_MAP['NETWORK_ERROR'];
    }
    // 超时错误
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return ERROR_CODE_MAP['TIMEOUT'];
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return ERROR_CODE_MAP['UNKNOWN_ERROR'];
}

/**
 * Function: getErrorCode
 *
 * Description: 从错误中提取错误码
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *
 * Returns:
 *   code(string): 错误码
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }
  if (error instanceof Error) {
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Function: isAuthError
 *
 * Description: 检查是否为认证错误
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *
 * Returns:
 *   result(boolean): 是否为认证错误
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AuthError) return true;
  if (error instanceof AppError) {
    return ['401', 'AUTH_TOKEN_EXPIRED', 'AUTH_INVALID_TOKEN', 'AUTH_REQUIRED', 'AUTH_REFRESH_FAILED'].includes(
      error.code
    );
  }
  return false;
}

/**
 * Function: isNetworkError
 *
 * Description: 检查是否为网络错误
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *
 * Returns:
 *   result(boolean): 是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof AppError) {
    return ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code);
  }
  return false;
}

/**
 * Function: isRetryableError
 *
 * Description: 检查错误是否可重试
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *
 * Returns:
 *   result(boolean): 是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) return error.isRetryable;
  if (error instanceof AppError) {
    return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', '502', '503'].includes(error.code);
  }
  return false;
}

/**
 * Function: handleError
 *
 * Description: 统一错误处理，显示提示并可选跳转登录页
 *
 * Parameters:
 *   error(unknown): 任意类型的错误
 *   options(ErrorHandleOptions): 处理选项
 *
 * Returns:
 *   appError(AppError): 转换后的应用错误
 */
export function handleError(error: unknown, options: ErrorHandleOptions = {}): AppError {
  const { showToast = true, redirectToLogin = false, customMessage } = options;

  // 转换为 AppError
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else {
    appError = new AppError(getErrorMessage(error), getErrorCode(error), { context: options.context });
  }

  // 显示 Toast 提示
  if (showToast && typeof uni !== 'undefined') {
    uni.showToast({
      title: customMessage || appError.message,
      icon: 'none',
      duration: 2000,
    });
  }

  // 跳转登录页
  if (redirectToLogin || (isAuthError(error) && (error as AuthError).shouldRedirect !== false)) {
    redirectToLoginPage();
  }

  return appError;
}

/**
 * Function: redirectToLoginPage
 *
 * Description: 跳转到登录页
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   void: 无返回值
 */
function redirectToLoginPage(): void {
  if (typeof uni !== 'undefined') {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage?.route || '';

    // 防止重复跳转：已在登录页则不再跳转
    if (currentRoute.includes('login')) {
      return;
    }

    // 跳转到登录页（使用 redirectTo 避免保留当前页在页面栈中）
    uni.redirectTo({ url: '/pages/login/login' });
  }
}

/**
 * Function: wrapAsync
 *
 * Description: 包装异步函数，自动捕获错误并处理
 *
 * Parameters:
 *   fn(Function): 异步函数
 *   options(ErrorHandleOptions): 错误处理选项
 *
 * Returns:
 *   wrappedFn(Function): 包装后的函数
 */
export function wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: ErrorHandleOptions
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
    try {
      return (await fn(...args)) as Awaited<ReturnType<T>>;
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  };
}

/**
 * Function: createErrorFromResponse
 *
 * Description: 从 HTTP 响应创建错误
 *
 * Parameters:
 *   statusCode(number): HTTP 状态码
 *   data(unknown): 响应数据
 *
 * Returns:
 *   error(AppError): 转换后的应用错误
 */
export function createErrorFromResponse(statusCode: number, data: unknown): AppError {
  const responseData = data as { error?: { code?: string; message?: string }; message?: string };

  if (statusCode === 401) {
    return new AuthError(responseData?.error?.message || ERROR_CODE_MAP['401'], {
      code: responseData?.error?.code || 'AUTH_REQUIRED',
    });
  }

  if (statusCode === 403) {
    return new BusinessError('FORBIDDEN', responseData?.error?.message || ERROR_CODE_MAP['403'], {
      httpStatus: statusCode,
    });
  }

  if (statusCode === 404) {
    return new BusinessError('NOT_FOUND', responseData?.error?.message || ERROR_CODE_MAP['NOT_FOUND'], {
      httpStatus: statusCode,
    });
  }

  if (statusCode === 429) {
    return new BusinessError('RATE_LIMITED', responseData?.error?.message || ERROR_CODE_MAP['RATE_LIMITED'], {
      httpStatus: statusCode,
    });
  }

  if (statusCode >= 500) {
    return new NetworkError(responseData?.error?.message || ERROR_CODE_MAP[String(statusCode)] || ERROR_CODE_MAP['SERVER_ERROR'], {
      statusCode,
      isRetryable: true,
    });
  }

  // 其他 4xx 错误
  return new BusinessError(
    responseData?.error?.code || 'CLIENT_ERROR',
    responseData?.error?.message || responseData?.message || ERROR_CODE_MAP['400'],
    { httpStatus: statusCode }
  );
}
