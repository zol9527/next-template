/**
 * Unit: Refresh 客户端函数测试
 *
 * Description: 测试浏览器环境下的会话刷新功能（核心请求逻辑）
 * Note: 并发控制由 React 状态管理，不在此测试范围
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { refreshSessionImpl, resetRefreshLock } from '@/components/context/auth-context'

// 模拟 fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('Refresh 客户端函数测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
    resetRefreshLock()
  })

  /**
   * Function: refreshSessionImpl (成功场景)
   *
   * Description: 测试成功刷新会话
   *
   * Returns:
   *   ok(boolean): 刷新成功返回 true
   */
  it('应该在成功刷新会话时返回 true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
        },
      }),
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  /**
   * Function: refreshSessionImpl (API 返回失败)
   *
   * Description: 测试 API 返回失败响应时的处理
   *
   * Returns:
   *   ok(boolean): 刷新失败返回 false
   */
  it('应该在 API 返回失败响应时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        },
      }),
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (网络错误)
   *
   * Description: 测试网络请求失败时的处理
   *
   * Returns:
   *   ok(boolean): 网络错误返回 false
   */
  it('应该在网络请求失败时返回 false', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (无效 JSON)
   *
   * Description: 测试服务返回无效 JSON 时的处理
   *
   * Returns:
   *   ok(boolean): JSON 解析失败返回 false
   */
  it('应该在服务返回无效 JSON 时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (响应格式错误)
   *
   * Description: 测试服务返回不符合预期的响应格式时的处理
   *
   * Returns:
   *   ok(boolean): 格式验证失败返回 false
   */
  it('应该在响应格式不符合预期时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        // 缺少 success 字段
        data: {
          userId: 'user-123',
        },
      }),
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (空响应)
   *
   * Description: 测试服务返回空响应时的处理
   *
   * Returns:
   *   ok(boolean): 空响应返回 false
   */
  it('应该在服务返回空响应时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await refreshSessionImpl()

    // 空响应会导致 Zod 验证失败，返回 false
    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (部分成功响应)
   *
   * Description: 测试服务返回部分成功响应时的处理
   *
   * Returns:
   *   ok(boolean): 根据 success 字段返回
   */
  it('应该正确处理部分成功响应', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          // 只有 userId 是必需的
        },
      }),
    })

    const result = await refreshSessionImpl()

    // 如果响应格式正确，应该返回 true
    expect(result).toBe(true)
  })

  /**
   * Function: refreshSessionImpl (请求参数验证)
   *
   * Description: 测试验证请求参数的正确性
   */
  it('应该发送正确的请求参数', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userId: 'user-123',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          sessionId: 'session-id',
        },
      }),
    })

    await refreshSessionImpl()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  /**
   * Function: refreshSessionImpl (超时处理)
   *
   * Description: 测试请求超时时的处理
   *
   * Returns:
   *   ok(boolean): 超时返回 false
   */
  it('应该在请求超时时返回 false', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Request timeout'))

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (服务器错误)
   *
   * Description: 测试服务器返回 5xx 错误时的处理
   *
   * Returns:
   *   ok(boolean): 服务器错误返回 false
   */
  it('应该在服务器返回 500 错误时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      }),
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })

  /**
   * Function: refreshSessionImpl (多次独立调用)
   *
   * Description: 测试多次调用刷新函数的独立性
   */
  it('应该支持多次独立调用', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
      })

    const result1 = await refreshSessionImpl()
    const result2 = await refreshSessionImpl()

    expect(result1).toBe(true)
    expect(result2).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  /**
   * Function: refreshSessionImpl (成功响应包含所有字段)
   *
   * Description: 测试完整成功响应的处理
   */
  it('应该正确处理包含所有字段的完整响应', async () => {
    const mockResponse = {
      success: true,
      data: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(true)
  })

  /**
   * Function: refreshSessionImpl (响应数据类型错误)
   *
   * Description: 测试响应数据类型不正确时的处理
   */
  it('应该在响应数据类型不正确时返回 false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: 'true', // 应该是 boolean
        data: null,
      }),
    })

    const result = await refreshSessionImpl()

    expect(result).toBe(false)
  })
})
