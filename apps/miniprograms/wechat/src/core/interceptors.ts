/**
 * HTTP 请求/响应拦截器
 * Description: 用于添加通用请求头和处理统一响应格式
 */

import { generateTraceId } from '../utils/trace-id';
import { logger } from '../utils/logger';
import { StorageKey } from '../config/constants';
import { BusinessError, NetworkError } from '../utils/error-handler';

/**
 * 请求配置扩展类型
 */
interface ExtendedRequestOptions {
  url: string;
  method?: string;
  data?: unknown;
  header?: Record<string, string>;
  _traceId?: string;
  _startTime?: number;
}

/**
 * 响应类型
 */
interface ResponseData {
  statusCode: number;
  data: unknown;
  header: Record<string, string>;
}

/**
 * 业务响应格式
 */
interface BusinessResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 错误类型
 */
interface RequestError {
  config?: ExtendedRequestOptions;
  errMsg?: string;
  message?: string;
}

/**
 * 拦截器选项
 */
interface InterceptorOptions {
  storageKey?: string;
  addTraceId?: boolean;
  addTimestamp?: boolean;
  enableLog?: boolean;
}

/**
 * Function: createRequestInterceptor
 *
 * Description: 创建请求拦截器
 *
 * Parameters:
 *   options(InterceptorOptions): 配置选项
 *
 * Returns:
 *   function: 请求拦截器函数
 */
export function createRequestInterceptor(options: InterceptorOptions = {}) {
  const {
    storageKey = StorageKey.ACCESS_TOKEN,
    addTraceId = true,
    addTimestamp = true,
  } = options;

  return (config: ExtendedRequestOptions): ExtendedRequestOptions => {
    // 初始化 header
    if (!config.header) {
      config.header = {};
    }

    // 添加认证 token
    const token = uni.getStorageSync(storageKey);
    if (token) {
      config.header = {
        ...config.header,
        Authorization: `Bearer ${token}`,
      };
    }

    // 添加 traceId 用于链路追踪
    if (addTraceId) {
      const traceId = generateTraceId();
      config.header = {
        ...config.header,
        'X-Trace-Id': traceId,
      };
      config._traceId = traceId;
    }

    // 添加请求时间戳
    if (addTimestamp) {
      config._startTime = Date.now();
    }

    return config;
  };
}

/**
 * Function: createResponseInterceptor
 *
 * Description: 创建响应拦截器
 *
 * Parameters:
 *   options(InterceptorOptions): 配置选项
 *
 * Returns:
 *   function: 响应拦截器函数
 */
export function createResponseInterceptor(options: InterceptorOptions = {}) {
  const { enableLog = true } = options;

  return (response: ResponseData, config: ExtendedRequestOptions): unknown => {
    const duration = config._startTime ? Date.now() - config._startTime : 0;

    // 记录请求日志
    if (enableLog) {
      const requestLogger = config._traceId
        ? logger.child({ traceId: config._traceId })
        : logger;

      requestLogger.info('请求完成', {
        url: config.url,
        method: config.method,
        statusCode: response.statusCode,
        duration,
      });
    }

    // 处理 HTTP 状态码
    if (response.statusCode >= 500) {
      throw new Error('服务器异常，请稍后再试');
    }

    if (response.statusCode >= 400) {
      // 尝试从响应中提取错误信息
      const errorData = response.data as BusinessResponse;
      if (errorData && errorData.error) {
        throw new BusinessError(
          errorData.error.code || 'UNKNOWN_ERROR',
          errorData.error.message || '请求失败'
        );
      }
      throw new Error(`HTTP ${response.statusCode}: 请求失败`);
    }

    // 处理业务响应格式 { success, data/error }
    const businessData = response.data as BusinessResponse;
    const { success, data, error } = businessData;

    if (!success) {
      throw new BusinessError(
        error?.code || 'UNKNOWN_ERROR',
        error?.message || '请求失败'
      );
    }

    return data;
  };
}

/**
 * Function: createErrorInterceptor
 *
 * Description: 创建错误拦截器
 *
 * Parameters:
 *   options(InterceptorOptions): 配置选项
 *
 * Returns:
 *   function: 错误拦截器函数
 */
export function createErrorInterceptor(options: InterceptorOptions = {}) {
  const { enableLog = true } = options;

  return (error: RequestError): never => {
    // 记录错误日志
    if (enableLog && error.config) {
      const errorLogger = error.config._traceId
        ? logger.child({ traceId: error.config._traceId })
        : logger;

      errorLogger.error('请求失败', error, {
        url: error.config.url,
        method: error.config.method,
      });
    }

    // 处理网络错误
    if (error.errMsg) {
      // 超时错误
      if (error.errMsg.includes('timeout')) {
        throw new NetworkError('请求超时');
      }

      // 其他网络错误
      if (error.errMsg.includes('fail')) {
        throw new NetworkError('网络连接失败');
      }
    }

    // 重新抛出其他错误
    throw error;
  };
}

/**
 * 默认请求拦截器
 */
export const requestInterceptor = createRequestInterceptor();

/**
 * 默认响应拦截器
 */
export const responseInterceptor = createResponseInterceptor();

/**
 * 默认错误拦截器
 */
export const errorInterceptor = createErrorInterceptor();
