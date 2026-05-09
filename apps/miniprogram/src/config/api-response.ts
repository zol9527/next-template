/**
 * API 响应格式模块
 * Description: 前后端协定的标准响应结构
 */

/**
 * API 响应状态码
 */
export const ResponseCode = {
  SUCCESS: 0,
  FAIL: 1,
} as const;

/**
 * 错误信息类型
 */
interface ApiError {
  code: string;
  message: string;
}

/**
 * API 响应格式类型定义
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError | null;
}

/**
 * 成功的 API 响应格式
 */
export const SuccessResponse: ApiResponse<null> = {
  success: true,
  data: null,
  error: null,
};

/**
 * 失败的 API 响应格式
 */
export const FailResponse: ApiResponse<null> = {
  success: false,
  data: null,
  error: {
    code: 'UNKNOWN_ERROR',
    message: '未知错误',
  },
};

/**
 * Function: createSuccessResponse
 *
 * Description: 创建成功响应
 *
 * Parameters:
 *   data(T): 响应数据
 *
 * Returns:
 *   ApiResponse<T>: 成功响应对象
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

/**
 * Function: createFailResponse
 *
 * Description: 创建失败响应
 *
 * Parameters:
 *   code(string): 错误码
 *   message(string): 错误信息
 *
 * Returns:
 *   ApiResponse<null>: 失败响应对象
 */
export function createFailResponse(code: string, message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  };
}

/**
 * Function: isSuccess
 *
 * Description: 判断响应是否成功
 *
 * Parameters:
 *   response(ApiResponse | unknown): API 响应对象
 *
 * Returns:
 *   boolean: 是否成功
 */
export function isSuccess(response: ApiResponse | unknown): response is ApiResponse {
  return typeof response === 'object' && response !== null && (response as ApiResponse).success === true;
}

/**
 * Function: getResponseData
 *
 * Description: 安全获取响应数据
 *
 * Parameters:
 *   response(ApiResponse): API 响应对象
 *   defaultValue(T): 默认值
 *
 * Returns:
 *   T | null: 响应数据或默认值
 */
export function getResponseData<T>(response: ApiResponse<T>, defaultValue: T | null = null): T | null {
  if (isSuccess(response)) {
    return (response.data ?? defaultValue) as T | null;
  }
  return defaultValue;
}

/**
 * Function: parseResponse
 *
 * Description: 解析 API 响应
 *
 * Parameters:
 *   response(unknown): API 响应对象
 *
 * Returns:
 *   ApiResponse<unknown>: 解析后的结果
 */
export function parseResponse(response: unknown): ApiResponse<unknown> {
  if (!response || typeof response !== 'object') {
    return {
      success: false,
      data: null,
      error: {
        code: 'INVALID_RESPONSE',
        message: '无效的响应格式',
      },
    };
  }

  const resp = response as ApiResponse<unknown>;
  const { success, data, error } = resp;

  if (success) {
    return { success: true, data, error: null };
  }

  return {
    success: false,
    data: null,
    error: error || {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
    },
  };
}

/**
 * Function: extractErrorMessage
 *
 * Description: 提取错误信息
 *
 * Parameters:
 *   response(ApiResponse | unknown): API 响应对象
 *
 * Returns:
 *   string: 错误信息
 */
export function extractErrorMessage(response: ApiResponse | unknown): string {
  if (typeof response === 'object' && response !== null) {
    const error = (response as ApiResponse).error;
    if (error?.message) {
      return error.message;
    }
  }
  return '操作失败';
}
