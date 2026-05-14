/**
 * File: src/lib/errors/client-api-error.ts
 * Description: 客户端 API 错误类，用于统一前端 fetch 调用抛出的错误格式。
 *              确保错误带有 `code` 属性，使 React Query 错误处理（如 AuthRefreshHandler）
 *              能够根据 error.code 区分 MFA_REQUIRED、UNAUTHORIZED、FORBIDDEN 等场景。
 *
 * Why:
 *   之前 admin hooks 的 queryFn 在 fetch 返回非 200 时直接 `throw new Error(...)`，
 *   导致 error.code 为 undefined，AuthRefreshHandler 无法识别 MFA_REQUIRED 等特殊错误码，
 *   用户看到的是：数据加载不出来 + 没有 toast + 没有引导跳转。
 *
 * Usage:
 *   // 在 queryFn / mutationFn 中使用：
 *   if (!res.ok) {
 *     throw ClientApiError.fromResponse(res, json)
 *   }
 *   if (!json.success) {
 *     throw new ClientApiError(json.error.code, json.error.message)
 *   }
 */

/**
 * Type: ApiFailureResponseBody
 *
 * Description: API 失败响应的 JSON 结构（与后端 ApiFailureResponse 对应）
 */
type ApiFailureResponseBody = {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * Class: ClientApiError
 *
 * Description: 客户端 API 错误，携带后端返回的 errorCode 和 HTTP status
 *
 * Properties:
 *     code(string): 后端错误码（如 'MFA_REQUIRED', 'UNAUTHORIZED'）
 *     message(string): 错误消息
 *     status(number): HTTP 状态码
 */
export class ClientApiError extends Error {
  /** 后端错误码 */
  public readonly code: string
  /** HTTP 状态码 */
  public readonly status: number

  constructor(code: string, message: string, status: number = 0) {
    super(message)
    this.name = 'ClientApiError'
    this.code = code
    this.status = status
  }

  /**
   * Function: fromResponse
   *
   * Description: 从 fetch Response 和已解析的 JSON 创建 ClientApiError。
   *              优先使用 JSON 中的 error.code/message，回退到 HTTP statusText。
   *
   * Parameters:
   *     res(Response): fetch Response 对象
   *     json(unknown): 已解析的 JSON 响应体（可能包含 error.code/message）
   *
   * Returns:
   *     ClientApiError: 带有 code 和 status 的错误实例
   *
   * Example:
   *     const res = await fetch('/api/v1/admin/users')
   *     const json = await res.json()
   *     if (!res.ok) throw ClientApiError.fromResponse(res, json)
   */
  static fromResponse(res: Response, json?: unknown): ClientApiError {
    const status = res.status

    // 尝试从 JSON 响应体中提取结构化错误信息
    if (
      json &&
      typeof json === 'object' &&
      json !== null &&
      'error' in json &&
      typeof (json as ApiFailureResponseBody).error?.code === 'string'
    ) {
      const { code, message } = (json as ApiFailureResponseBody).error
      return new ClientApiError(code, message, status)
    }

    // 回退：使用 HTTP 状态码构造通用错误
    const fallbackCode = statusToCode(status)
    const fallbackMessage = res.statusText || `请求失败 (${status})`
    return new ClientApiError(fallbackCode, fallbackMessage, status)
  }

  /**
   * Function: isMfaRequired
   *
   * Description: 判断当前错误是否为 MFA_REQUIRED
   *
   * Returns:
   *     boolean: 是否为 MFA 必需错误
   */
  isMfaRequired(): boolean {
    return this.code === 'MFA_REQUIRED'
  }
}

/**
 * Function: statusToCode
 *
 * Description: 将 HTTP 状态码映射为通用的错误码
 *
 * Parameters:
 *     status(number): HTTP 状态码
 *
 * Returns:
 *     string: 错误码
 */
function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'INVALID_INPUT'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'TOO_MANY_REQUESTS'
    case 503:
      return 'MAINTENANCE_MODE'
    default:
      return 'INTERNAL_ERROR'
  }
}

/**
 * Function: throwApiError
 *
 * Description: 便捷函数 —— 检查 fetch 响应，不成功则抛出 ClientApiError。
 *              适用于 queryFn / mutationFn 中的标准错误处理。
 *
 * Parameters:
 *     res(Response): fetch Response 对象
 *     json(unknown): 已解析的 JSON 响应体
 *
 * Throws:
 *     ClientApiError: 当响应不成功时
 *
 * Example:
 *     const res = await fetch('/api/v1/admin/users')
 *     const json = await res.json()
 *     throwApiError(res, json)  // 如果 !res.ok 或 !json.success 则抛出
 *     // 此后可安全使用 json.data
 */
export function throwApiError(res: Response, json: unknown): void {
  if (!res.ok) {
    throw ClientApiError.fromResponse(res, json)
  }

  // 响应 ok 但业务逻辑失败
  if (
    json &&
    typeof json === 'object' &&
    json !== null &&
    'success' in json &&
    (json as { success: boolean }).success === false &&
    'error' in json
  ) {
    const { code, message } = (json as ApiFailureResponseBody).error
    throw new ClientApiError(code, message, res.status)
  }
}
