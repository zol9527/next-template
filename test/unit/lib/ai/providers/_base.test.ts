/**
 * File: test/unit/lib/ai/providers/_base.test.ts
 * Description: aiFetch 重试和错误处理单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aiFetch } from '@/lib/ai/providers/_base'

const mockFetch = vi.fn<typeof globalThis.fetch>()
const originalFetch = globalThis.fetch

function createMockResponse(
  status: number,
  body: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify(body), { status })
}

function createNetworkError(code: string, message: string): TypeError & { code: string } {
  const error = new TypeError(message) as TypeError & { code: string }
  error.code = code
  return error
}

describe('Unit: aiFetch', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    mockFetch.mockClear()
  })

  describe('正常请求', () => {
    it('请求成功时直接返回 response', async () => {
      const expectedResponse = createMockResponse(200, { result: 'ok' })
      mockFetch.mockResolvedValueOnce(expectedResponse)

      const response = await aiFetch('https://api.example.com/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      })

      expect(response).toBe(expectedResponse)
      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('GET 请求成功返回', async () => {
      const expectedResponse = createMockResponse(200, { models: [] })
      mockFetch.mockResolvedValueOnce(expectedResponse)

      const response = await aiFetch('https://api.example.com/v1/models', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('5xx 错误重试', () => {
    it('5xx 错误时自动重试，最终成功返回', async () => {
      vi.useFakeTimers()
      const errorResponse = createMockResponse(500, { error: 'internal' })
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(15000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })

    it('连续 5xx 达到最大重试次数后返回最后一次 response', async () => {
      vi.useFakeTimers()
      const errorResponse = createMockResponse(503, { error: 'unavailable' })

      mockFetch.mockResolvedValue(errorResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(30000)
      const response = await promise

      expect(response.status).toBe(503)
      expect(mockFetch).toHaveBeenCalledTimes(4)
      vi.useRealTimers()
    })

    it('502 Bad Gateway 自动重试', async () => {
      vi.useFakeTimers()
      const badGateway = createMockResponse(502, { error: 'bad gateway' })
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockResolvedValueOnce(badGateway)
        .mockResolvedValueOnce(successResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(5000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })
  })

  describe('429 Rate Limit 重试', () => {
    it('429 错误时自动重试', async () => {
      vi.useFakeTimers()
      const rateLimitedResponse = createMockResponse(429, { error: 'rate limited' })
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockResolvedValueOnce(rateLimitedResponse)
        .mockResolvedValueOnce(successResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(5000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    it('连续 429 达到最大重试次数后返回 response（不抛错）', async () => {
      vi.useFakeTimers()
      const rateLimitedResponse = createMockResponse(429, { error: 'rate limited' })

      mockFetch.mockResolvedValue(rateLimitedResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(30000)
      const response = await promise

      // attempt 0-2: 429 → continue（重试）, attempt 3 (MAX_RETRIES): 429 → return response
      expect(response.status).toBe(429)
      expect(mockFetch).toHaveBeenCalledTimes(4)
      vi.useRealTimers()
    })
  })

  describe('4xx 错误不重试', () => {
    it('400 Bad Request 直接返回，不重试', async () => {
      const badRequestResponse = createMockResponse(400, { error: 'bad request' })
      mockFetch.mockResolvedValueOnce(badRequestResponse)

      const response = await aiFetch('https://api.example.com/v1/chat')

      expect(response.status).toBe(400)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('401 Unauthorized 直接返回，不重试', async () => {
      const unauthorizedResponse = createMockResponse(401, { error: 'unauthorized' })
      mockFetch.mockResolvedValueOnce(unauthorizedResponse)

      const response = await aiFetch('https://api.example.com/v1/chat')

      expect(response.status).toBe(401)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('403 Forbidden 直接返回，不重试', async () => {
      const forbiddenResponse = createMockResponse(403, { error: 'forbidden' })
      mockFetch.mockResolvedValueOnce(forbiddenResponse)

      const response = await aiFetch('https://api.example.com/v1/chat')

      expect(response.status).toBe(403)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('404 Not Found 直接返回，不重试', async () => {
      const notFoundResponse = createMockResponse(404, { error: 'not found' })
      mockFetch.mockResolvedValueOnce(notFoundResponse)

      const response = await aiFetch('https://api.example.com/v1/chat')

      expect(response.status).toBe(404)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('网络错误重试', () => {
    it('ECONNRESET 错误时自动重试', async () => {
      vi.useFakeTimers()
      const connResetError = createNetworkError('ECONNRESET', 'connection reset by peer')
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockRejectedValueOnce(connResetError)
        .mockResolvedValueOnce(successResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(5000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    it('ETIMEDOUT 错误时自动重试', async () => {
      vi.useFakeTimers()
      const timeoutError = createNetworkError('ETIMEDOUT', 'connection timed out')
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse)

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(5000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    it('所有重试失败后抛出最后一个错误', async () => {
      vi.useFakeTimers()
      const networkError = createNetworkError('ECONNRESET', 'connection reset')

      mockFetch.mockRejectedValue(networkError)

      const promise = aiFetch('https://api.example.com/v1/chat')
      // 防止 unhandled rejection 警告
      promise.catch(() => {})
      await vi.advanceTimersByTimeAsync(30000)

      await expect(promise).rejects.toThrow('connection reset')
      expect(mockFetch).toHaveBeenCalledTimes(4)
      vi.useRealTimers()
    })

    it('非 Error 类型的异常被包装为 Error', async () => {
      vi.useFakeTimers()
      mockFetch.mockRejectedValue('unknown error string')

      const promise = aiFetch('https://api.example.com/v1/chat')
      promise.catch(() => {})
      await vi.advanceTimersByTimeAsync(30000)

      await expect(promise).rejects.toThrow('unknown error string')
      vi.useRealTimers()
    })
  })

  describe('请求超时和取消', () => {
    it('signal 已取消时立即抛出错误', async () => {
      const controller = new AbortController()
      controller.abort()

      const abortError = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(
        aiFetch('https://api.example.com/v1/chat', { signal: controller.signal }),
      ).rejects.toThrow(/aborted/i)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('signal 取消时不进行重试', async () => {
      const controller = new AbortController()

      mockFetch.mockImplementationOnce(async () => {
        controller.abort()
        throw new DOMException('The operation was aborted', 'AbortError')
      })

      await expect(
        aiFetch('https://api.example.com/v1/chat', { signal: controller.signal }),
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('指数退避', () => {
    it('重试间隔使用指数退避（验证调用间隔递增）', async () => {
      vi.useFakeTimers()
      const callTimes: number[] = []

      const errorResponse = createMockResponse(500, { error: 'internal' })
      const successResponse = createMockResponse(200, { result: 'ok' })

      mockFetch
        .mockImplementationOnce(async () => {
          callTimes.push(Date.now())
          return errorResponse
        })
        .mockImplementationOnce(async () => {
          callTimes.push(Date.now())
          return errorResponse
        })
        .mockImplementationOnce(async () => {
          callTimes.push(Date.now())
          return successResponse
        })

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(30000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(callTimes.length).toBe(3)

      // attempt 1: backoff ≈ 1000ms (+ jitter), attempt 2: backoff ≈ 2000ms (+ jitter)
      // 第二次间隔应大于第一次间隔（指数退避）
      const gap1 = callTimes[1] - callTimes[0]
      const gap2 = callTimes[2] - callTimes[1]
      expect(gap2).toBeGreaterThan(gap1 * 0.8)

      vi.useRealTimers()
    })

    it('退避时间不超过 MAX_BACKOFF_MS（10000ms）', async () => {
      vi.useFakeTimers()
      const callTimes: number[] = []

      const errorResponse = createMockResponse(500, { error: 'internal' })
      const successResponse = createMockResponse(200, { result: 'ok' })

      // 需要 4 次重试来触发最大退避（attempt 3: 2^2 * 1000 = 4000, 仍然 < 10000）
      mockFetch
        .mockImplementationOnce(async () => { callTimes.push(Date.now()); return errorResponse })
        .mockImplementationOnce(async () => { callTimes.push(Date.now()); return errorResponse })
        .mockImplementationOnce(async () => { callTimes.push(Date.now()); return errorResponse })
        .mockImplementationOnce(async () => { callTimes.push(Date.now()); return successResponse })

      const promise = aiFetch('https://api.example.com/v1/chat')
      await vi.advanceTimersByTimeAsync(60000)
      await promise

      // 所有退避间隔不应超过 MAX_BACKOFF_MS + jitter
      for (let i = 1; i < callTimes.length; i++) {
        const gap = callTimes[i] - callTimes[i - 1]
        // backoff + jitter(20%) ≤ 10000 * 1.2 = 12000
        expect(gap).toBeLessThanOrEqual(12000)
      }

      vi.useRealTimers()
    })
  })

  describe('请求参数传递', () => {
    it('正确传递 method, headers, body 到 fetch', async () => {
      const successResponse = createMockResponse(200, {})
      mockFetch.mockResolvedValueOnce(successResponse)

      await aiFetch('https://api.example.com/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
        body: JSON.stringify({ model: 'test', messages: [] }),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          },
          body: JSON.stringify({ model: 'test', messages: [] }),
        }),
      )
    })

    it('默认使用 POST 方法', async () => {
      const successResponse = createMockResponse(200, {})
      mockFetch.mockResolvedValueOnce(successResponse)

      await aiFetch('https://api.example.com/v1/chat')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('正确传递 signal 到 fetch', async () => {
      const controller = new AbortController()
      const successResponse = createMockResponse(200, {})
      mockFetch.mockResolvedValueOnce(successResponse)

      await aiFetch('https://api.example.com/v1/chat', {
        signal: controller.signal,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      )
    })
  })
})
