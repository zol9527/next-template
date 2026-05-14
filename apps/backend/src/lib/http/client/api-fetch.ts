/**
 * File: src/lib/http/client/api-fetch.ts
 * Description: 统一的客户端 API 请求工具函数。
 *              封装原生 fetch，自动处理错误响应并抛出结构化的 ClientApiError。
 *              确保所有 API 调用失败时 error.code 被正确保留，使 AuthRefreshHandler
 *              能识别 MFA_REQUIRED、UNAUTHORIZED 等特殊错误码。
 *
 * Why:
 *   Admin hooks 中广泛存在 `throw new Error('Failed to fetch: ...')` 的模式，
 *   导致 error.code 为 undefined，AuthRefreshHandler 无法区分 MFA_REQUIRED。
 *   通过统一 apiFetch，所有 hooks 自动获得正确的错误码传播。
 *
 * Usage:
 *   // 在 queryFn 中使用：
 *   queryFn: () => apiFetch('/api/v1/admin/users?page=1')
 *
 *   // 带请求体：
 *   mutationFn: (data) => apiFetch('/api/v1/admin/users', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   })
 */

import { ClientApiError } from '@/lib/errors/client-api-error'

/**
 * Type: ApiFetchOptions
 *
 * Description: apiFetch 的配置选项，继承自原生 RequestInit
 */
type ApiFetchOptions = Omit<RequestInit, 'credentials'> & {
  /** 是否包含凭证（默认 true） */
  credentials?: boolean
}

/**
 * Type: ApiFetchResult
 *
 * Description: apiFetch 的返回结果，包含解析后的 JSON 和原始 Response
 */
type ApiFetchResult<T = unknown> = {
  /** 解析后的 JSON 响应体 */
  json: T
  /** 原始 Response 对象 */
  response: Response
}

/**
 * Function: apiFetch
 *
 * Description: 统一的 API 请求函数，自动处理错误并抛出 ClientApiError。
 *
 * Parameters:
 *     url(string): 请求 URL
 *     options(ApiFetchOptions): 请求配置（默认 credentials: 'include'）
 *
 * Returns:
 *     Promise<ApiFetchResult<T>>: 包含解析后 JSON 和原始 Response 的结果
 *
 * Throws:
 *     ClientApiError: 当 HTTP 状态码非 2xx 或业务逻辑返回 success: false 时
 *
 * Example:
 *     // 在 useQuery 的 queryFn 中：
 *     const { json } = await apiFetch<UsersListResponse>('/api/v1/admin/users?page=1')
 *     return json.data
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<ApiFetchResult<T>> {
  const { credentials: includeCredentials = true, ...fetchOptions } = options

  const res = await fetch(url, {
    ...fetchOptions,
    credentials: includeCredentials ? 'include' : 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...fetchOptions.headers,
    },
  })

  // 尝试解析 JSON 响应体（即使 HTTP 状态码非 2xx，后端也会返回结构化错误）
  let json: unknown
  try {
    json = await res.json()
  } catch {
    // JSON 解析失败，用纯 HTTP 错误信息构造 ClientApiError
    throw new ClientApiError('INTERNAL_ERROR', res.statusText || `请求失败 (${res.status})`, res.status)
  }

  // HTTP 状态码非 2xx → 抛出 ClientApiError（保留后端返回的 error.code）
  if (!res.ok) {
    throw ClientApiError.fromResponse(res, json)
  }

  // HTTP 2xx 但业务逻辑失败（success: false）→ 同样抛出
  if (
    json &&
    typeof json === 'object' &&
    json !== null &&
    'success' in json &&
    (json as { success: boolean }).success === false &&
    'error' in json
  ) {
    const { code, message } = (json as { error: { code: string; message: string } }).error
    throw new ClientApiError(code, message, res.status)
  }

  return { json: json as T, response: res }
}

/**
 * Function: apiQueryFn
 *
 * Description: 创建标准化的 React Query queryFn。
 *              封装 apiFetch，返回 json.data，自动抛出 ClientApiError。
 *
 * Parameters:
 *     url(string | (() => string)): 请求 URL 或动态生成 URL 的函数
 *     options(ApiFetchOptions): 请求配置
 *
 * Returns:
 *     function: 可直接用作 useQuery 的 queryFn
 *
 * Example:
 *     useQuery({
 *       queryKey: ['admin', 'users', page],
 *       queryFn: apiQueryFn(() => `/api/v1/admin/users?page=${page}`),
 *     })
 */
export function apiQueryFn<TData = unknown>(
  url: string | (() => string),
  options?: ApiFetchOptions,
): () => Promise<TData> {
  return async () => {
    const resolvedUrl = typeof url === 'function' ? url() : url
    const { json } = await apiFetch<{ success: boolean; data: TData }>(resolvedUrl, options)
    return (json as { data: TData }).data
  }
}
