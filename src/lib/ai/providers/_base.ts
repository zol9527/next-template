/**
 * AI Provider 基础 HTTP 客户端
 *
 * Description: 提供 fetch + 指数退避重试的 HTTP 客户端
 *   所有 AI Provider 共享此客户端进行 HTTP 请求
 */

// ==================== 类型定义 ====================

export interface HttpRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  signal?: AbortSignal
}

export interface HttpResponse {
  ok: boolean
  status: number
  headers: Headers
  text: () => Promise<string>
  json: () => Promise<unknown>
  body: ReadableStream<Uint8Array> | null
}

// ==================== 常量 ====================

/** 最大重试次数 */
const MAX_RETRIES = 3

/** 初始退避时间（毫秒） */
const INITIAL_BACKOFF_MS = 1000

/** 最大退避时间（毫秒） */
const MAX_BACKOFF_MS = 10000

// ==================== 核心函数 ====================

/**
 * Function: aiFetch
 *
 * Description: 带指数退避重试的 HTTP 请求
 *   429 和 5xx 自动重试（最多 3 次），4xx 直接返回让调用方处理
 *
 * Parameters:
 *   url(string): 请求 URL
 *   options(HttpRequestOptions): 请求选项
 *
 * Returns:
 *   response(HttpResponse): HTTP 响应
 */
export async function aiFetch(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse> {
  const { method = 'POST', headers = {}, body, signal } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 非首次请求时等待退避时间
    if (attempt > 0) {
      const backoff = Math.min(
        INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1),
        MAX_BACKOFF_MS
      )
      // 添加随机抖动（±20%），避免多个请求同时重试
      const jitter = Math.random() * backoff * 0.2
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter))
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal,
      })

      // 429 Too Many Requests — 重试
      if (response.status === 429 && attempt < MAX_RETRIES) {
        lastError = new Error(
          `Rate limited (429), attempt ${attempt + 1}/${MAX_RETRIES}`
        )
        continue
      }

      // 5xx Server Error — 重试
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        lastError = new Error(
          `Server error (${response.status}), attempt ${attempt + 1}/${MAX_RETRIES}`
        )
        continue
      }

      // 其他情况（2xx / 4xx / 最后一次重试）— 直接返回
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // 用户主动取消请求，立即抛出
      if (signal?.aborted) throw lastError
    }
  }

  throw lastError ?? new Error('Max retries exceeded')
}
