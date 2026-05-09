/**
 * HTTP 客户端 - TypeScript 重写版
 * 
 * 401 Token 刷新重试机制：
 *   当 uni.request 返回 401 时，sendRequest 会 reject 一个 RequestError
 *   request() 方法捕获后触发 Token 刷新，刷新成功则用新 Token 重发原始请求
 *   - 刷新锁：同一时刻只允许一个刷新请求，后续 401 排队等待
 *   - 最大重试次数：1 次（避免无限循环）
 *   - 刷新失败：清除认证信息并跳转登录页
 */

import { logger } from '../utils/logger';
import { AppError, BusinessError } from '../utils/error-handler';
import { generateTraceId } from '../utils/trace-id';
import { StorageKey } from '../config/constants';
import { storage } from '../utils/storage';

// 请求配置
interface RequestOptions {
  url: string;
  method?: UniApp.RequestOptions['method'];
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  /** 内部标志：是否为 Token 刷新后的重试请求（防止无限重试） */
  _isRetry?: boolean;
}

// 请求拦截器
type RequestInterceptor = (config: RequestOptions) => RequestOptions | Promise<RequestOptions>;

// 响应拦截器 - 返回响应包装器
type ResponseInterceptor = (response: ResponseWrapper) => ResponseWrapper | Promise<ResponseWrapper>;

// 错误拦截器
type ErrorInterceptor = (error: RequestError) => unknown | Promise<unknown>;

// 响应包装
interface ResponseWrapper<T = unknown> {
  data: T;
  statusCode: number;
  header: Record<string, string>;
  traceId: string;
}

// 请求错误类
export class RequestError extends Error {
  code: string;
  config: RequestOptions;
  response?: {
    statusCode: number;
    data: unknown;
  };
  isRetryable: boolean;

  constructor(message: string, code: string, config: RequestOptions) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.config = config;
    this.isRetryable = false;
  }
}

// 拦截器管理器
class InterceptorManager<T> {
  private interceptors: Array<(config: T) => T | Promise<T>> = [];

  use(interceptor: (config: T) => T | Promise<T>): number {
    this.interceptors.push(interceptor);
    return this.interceptors.length - 1;
  }

  async apply(config: T): Promise<T> {
    let result = config;
    for (const interceptor of this.interceptors) {
      result = await interceptor(result);
      if (result === null) {
        throw new Error('Interceptor cancelled the request');
      }
    }
    return result;
  }

  eject(index: number): void {
    this.interceptors[index] = null as never;
  }
}

// Uni-app 请求响应类型
type UniRequestResponse = UniApp.RequestSuccessCallbackResult;

// Uni-app 请求配置类型 (本地定义，与全局类型匹配)
interface LocalUniRequestOptions {
  url: string;
  method?: UniApp.RequestOptions['method'];
  data?: UniApp.RequestOptions['data'];
  header?: UniApp.RequestOptions['header'];
  timeout?: UniApp.RequestOptions['timeout'];
  success?: (res: UniRequestResponse) => void;
  fail?: (err: UniApp.GeneralCallbackResult) => void;
}

// ─── Token 刷新状态（模块级单例） ────────────────────────────
let isRefreshingToken = false;
let pendingRefreshResolvers: Array<(token: string) => void> = [];

// ─── 防止 clearAuthAndRedirect 重复执行 ──────────────────────
let hasRedirectedToLogin = false;

// ─── Token 主动过期检查 ────────────────────────────────────────

/**
 * Access token 提前刷新的时间窗口（秒）
 * 当 token 距离过期不足此时间时，主动触发刷新，避免请求已经发出后才收到 401
 */
const TOKEN_REFRESH_BUFFER_SECONDS = 60; // 提前 1 分钟刷新

/**
 * 解码 JWT payload（不验证签名，仅用于读取 exp 等字段）
 * 小程序端不需要验证签名——签名由后端验证，这里只是读取过期时间做主动刷新判断
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url 解码
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * 判断 access token 是否即将过期（或已过期）
 * 返回 true 表示需要主动刷新
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // 无法解析过期时间，不主动刷新（等 401 再刷新）
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - now;
  return remainingSeconds < TOKEN_REFRESH_BUFFER_SECONDS;
}

// HttpClient 类
export class HttpClient {
  private baseURL: string = '';
  private timeout: number = 15000;
  private retryCount: number = 0;
  private retryDelay: number = 1000;

  private requestInterceptors = new InterceptorManager<RequestOptions>();
  private responseInterceptors = new InterceptorManager<ResponseWrapper>();
  private errorInterceptors: Array<(error: RequestError) => unknown> = [];

  constructor(config?: { baseURL?: string; timeout?: number; retry?: number; retryDelay?: number }) {
    this.baseURL = config?.baseURL || '';
    this.timeout = config?.timeout || 15000;
    this.retryCount = config?.retry || 0;
    this.retryDelay = config?.retryDelay || 1000;
  }

  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  setRetry(retry: number, retryDelay = this.retryDelay): void {
    this.retryCount = retry;
    this.retryDelay = retryDelay;
  }

  // 添加请求拦截器
  requestInterceptor(interceptor: RequestInterceptor): number {
    return this.requestInterceptors.use(interceptor);
  }

  // 添加响应拦截器
  responseInterceptor(interceptor: ResponseInterceptor): number {
    return this.responseInterceptors.use(interceptor);
  }

  // 添加错误拦截器
  errorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // 发送请求（含主动过期检查 + 401 Token 刷新重试）
  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const { url, retry = this.retryCount } = options;
    let lastError: RequestError | null = null;

    const fullURL = this.baseURL ? `${this.baseURL}${url}` : url;
    const traceId = generateTraceId();

    // ── 主动检查 token 是否即将过期，提前刷新避免 401 ──
    // 跳过刷新请求本身和重试请求，避免无限循环
    if (!options._isRetry && !url.includes('/auth/refresh')) {
      const currentToken = storage.get(StorageKey.ACCESS_TOKEN) as string;
      if (currentToken && isTokenExpiringSoon(currentToken)) {
        logger.info('Access token 即将过期，主动刷新', { url: fullURL });
        try {
          const newToken = await this.ensureTokenRefreshed();
          // 更新请求头中的 token
          options = {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };
        } catch (refreshError) {
          // 主动刷新失败不阻断请求，让请求继续发出，等 401 再处理
          logger.warn('主动刷新 token 失败，继续发送请求', refreshError as Record<string, unknown>);
        }
      }
    }

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const config = await this.requestInterceptors.apply({
          ...options,
          url: fullURL,
          headers: {
            'X-Trace-Id': traceId,
            ...options.headers,
          },
        });

        const response = await this.sendRequest<T>(config, attempt);

        const processedResponse = await this.responseInterceptors.apply(response as ResponseWrapper);

        // 处理业务响应格式 { success, data/error }
        const maybeBusinessData = processedResponse.data as { success?: boolean; data?: unknown; error?: { code?: string; message?: string } };
        if (maybeBusinessData && typeof maybeBusinessData === 'object' && 'success' in maybeBusinessData) {
          if (!maybeBusinessData.success) {
            throw new BusinessError(
              maybeBusinessData.error?.code || 'UNKNOWN_ERROR',
              maybeBusinessData.error?.message || '请求失败'
            );
          }
          return (maybeBusinessData.data !== undefined ? maybeBusinessData.data : null) as T;
        }

        logger.info('HTTP 请求成功', {
          url: fullURL,
          method: config.method,
          traceId,
          statusCode: response.statusCode,
        });

        return processedResponse.data as T;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        lastError = error as RequestError;

        // ── 401 自动刷新 Token 并重试（最多 1 次） ──
        if (lastError.response?.statusCode === 401 && !options._isRetry) {
          logger.info('检测到 401，尝试刷新 Token 并重试请求');

          try {
            const newToken = await this.ensureTokenRefreshed();
            // 用新 Token 重发原始请求
            const retryOptions: RequestOptions & { _isRetry?: boolean } = {
              ...options,
              _isRetry: true,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            return await this.request<T>(retryOptions);
          } catch (refreshError) {
            logger.error('Token 刷新后重试失败', refreshError);
            this.clearAuthAndRedirect();
            throw lastError;
          }
        }

        logger.warn('HTTP 请求失败', {
          url: fullURL,
          method: options.method,
          attempt: attempt + 1,
          maxAttempts: retry + 1,
          error: lastError.message,
        });

        if (attempt < retry) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    if (lastError) {
      return this.handleError(lastError);
    }

    throw new Error('Unknown request error');
  }

  /**
   * 确保 Token 已刷新：如果已有刷新在进行中则排队等待，否则发起新刷新
   * 返回新的 accessToken
   *
   * 刷新 token 通过请求体传递（主要方式），同时也在 Authorization header 中携带（备选）
   * 后端 refresh 端点支持的 token 来源优先级：请求体 > Authorization 头 > Cookie
   */
  private async ensureTokenRefreshed(): Promise<string> {
    // 如果正在刷新，排队等待结果
    if (isRefreshingToken) {
      return new Promise<string>((resolve, reject) => {
        pendingRefreshResolvers.push((token: string) => {
          if (token) {
            resolve(token);
          } else {
            reject(new Error('Token 刷新失败'));
          }
        });
      });
    }

    // 发起刷新
    isRefreshingToken = true;
    const currentRefreshToken = storage.get(StorageKey.REFRESH_TOKEN) as string;

    if (!currentRefreshToken) {
      isRefreshingToken = false;
      throw new Error('无 refresh token，无法刷新');
    }

    try {
      // 直接调用 uni.request 绕过自身（避免循环）
      const baseURL = this.baseURL;
      const refreshURL = `${baseURL}/auth/refresh`;

      const result = await new Promise<{ accessToken: string; refreshToken?: string }>((resolve, reject) => {
        uni.request({
          url: refreshURL,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            // 同时在 Authorization header 中携带 refresh token（备选方式）
            Authorization: `Bearer ${currentRefreshToken}`,
          },
          // 通过请求体传递 refresh token（主要方式）
          data: {
            refreshToken: currentRefreshToken,
          },
          success: (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              const data = res.data as { success?: boolean; data?: { accessToken: string; refreshToken?: string; userId?: string } };
              if (data?.success && data?.data?.accessToken) {
                resolve(data.data);
              } else {
                reject(new Error(`刷新响应格式异常: ${JSON.stringify(data)}`));
              }
            } else {
              reject(new Error(`刷新请求返回 ${res.statusCode}`));
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '刷新请求网络失败'));
          },
        });
      });

      // 保存新 Token
      storage.set(StorageKey.ACCESS_TOKEN, result.accessToken);
      if (result.refreshToken) {
        storage.set(StorageKey.REFRESH_TOKEN, result.refreshToken);
      }

      logger.info('Token 刷新成功，通知等待队列', {
        queueSize: pendingRefreshResolvers.length,
      });

      // 通知所有排队等待的请求
      pendingRefreshResolvers.forEach((cb) => cb(result.accessToken));
      pendingRefreshResolvers = [];

      return result.accessToken;
    } catch (error) {
      logger.error('Token 刷新失败', error);

      // 通知队列中的等待者刷新失败
      pendingRefreshResolvers.forEach((cb) => cb(''));
      pendingRefreshResolvers = [];

      throw error;
    } finally {
      isRefreshingToken = false;
    }
  }

  // 清除认证信息并跳转登录页（附带提示）
  private clearAuthAndRedirect(): void {
    // 防止多个并发 401 重复触发跳转
    if (hasRedirectedToLogin) return;
    hasRedirectedToLogin = true;

    storage.remove(StorageKey.ACCESS_TOKEN);
    storage.remove(StorageKey.REFRESH_TOKEN);
    storage.remove(StorageKey.USER_INFO);

    // 防止重复跳转：如果已经在登录页则不再跳转
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route || '';
    if (currentRoute.includes('login')) {
      logger.warn('已在登录页，跳过跳转');
      return;
    }

    logger.warn('认证信息已清除，跳转登录页');
    // 先提示再跳转，给用户一个明确的反馈
    uni.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none',
      duration: 1500,
    });
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/login/login',
        complete: () => {
          // 跳转完成后重置标志，以便用户重新登录后可再次触发
          hasRedirectedToLogin = false;
        },
      });
    }, 1500);
  }

  private async sendRequest<T>(config: RequestOptions, _attempt: number): Promise<ResponseWrapper<T>> {
    return new Promise((resolve, reject) => {
      const effectiveTimeout = config.timeout ?? this.timeout;
      const timer = setTimeout(() => {
        reject(new RequestError('Request timeout', 'TIMEOUT', config));
      }, effectiveTimeout);

      // 构建请求参数
      const requestData: LocalUniRequestOptions = {
        url: config.url,
        method: config.method || 'GET',
        success: (res: UniRequestResponse) => {
          clearTimeout(timer);

          const wrapper: ResponseWrapper<T> = {
            data: res.data as T,
            statusCode: res.statusCode,
            header: res.header || {},
            traceId: res.header?.['X-Trace-Id'] || '',
          };

          // 处理 HTTP 状态码
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(wrapper);
          } else {
            const error = new RequestError(
              `HTTP Error: ${res.statusCode}`,
              'HTTP_ERROR',
              config
            ) as RequestError;
            error.response = {
              statusCode: res.statusCode,
              data: res.data,
            };
            error.isRetryable = res.statusCode >= 500;
            reject(error);
          }
        },
        fail: (err: { errMsg: string }) => {
          clearTimeout(timer);
          const error = new RequestError(
            err.errMsg || 'Network error',
            'NETWORK_ERROR',
            config
          ) as RequestError;
          error.isRetryable = true;
          reject(error);
        },
      };

      // 添加数据和参数
      if (config.data) {
        requestData.data = config.data;
      }
      if (config.params) {
        const prefix = config.url.includes('?') ? '&' : '?';
        // 微信小程序不支持 URLSearchParams，手动构建查询字符串
        const queryString = Object.entries(config.params as Record<string, unknown>)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
        if (queryString) {
          requestData.url += prefix + queryString;
        }
      }
      if (config.headers) {
        requestData.header = config.headers;
      }
      requestData.timeout = effectiveTimeout;

      // 发送请求
      uni.request(requestData);
    });
  }

  private async handleError(error: RequestError): Promise<never> {
    // 调用错误拦截器链
    for (const interceptor of this.errorInterceptors) {
      const result = await interceptor(error);
      // 如果拦截器返回了值，表示错误已被处理
      if (result !== undefined) {
        return result as never;
      }
    }

    // 如果没有拦截器处理，抛出错误
    throw error;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 便捷方法
  get<T = unknown>(url: string, params?: Record<string, unknown>, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'GET', params, ...options });
  }

  post<T = unknown>(url: string, data?: Record<string, unknown>, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'POST', data, ...options });
  }

  put<T = unknown>(url: string, data?: Record<string, unknown>, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data, ...options });
  }

  delete<T = unknown>(url: string, params?: Record<string, unknown>, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'DELETE', params, ...options });
  }
}

// 导出单例实例供全局使用
export const httpClient = new HttpClient();

export type { RequestOptions, ResponseWrapper };
