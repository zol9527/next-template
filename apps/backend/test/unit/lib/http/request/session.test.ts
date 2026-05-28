import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env 模块，避免加载真实环境变量
vi.mock('@/config', () => ({
  env: {
    INTERNAL_BASE_URL: 'http://localhost:3000',
  },
}))

describe('tryRefreshSessionByCookie', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('应使用 INTERNAL_BASE_URL 构造刷新 URL，而非请求头', async () => {
    const capturedUrls: string[] = []
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      capturedUrls.push(url.toString())
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'set-cookie': ['access_token=new; Path=/'] },
      })
    })

    const { tryRefreshSessionByCookie } = await import('@/lib/http/request/session')

    const mockReq = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: 'some-refresh-token' }),
      },
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'cookie') return 'refresh_token=some-refresh-token'
          if (name === 'host') return 'evil.com'
          if (name === 'x-forwarded-proto') return 'https'
          if (name === 'user-agent') return 'test'
          return null
        }),
      },
      nextUrl: {
        protocol: 'http:',
        host: 'localhost:3000',
      },
    } as any

    await tryRefreshSessionByCookie(mockReq, 'trace-123')

    expect(capturedUrls.length).toBeGreaterThan(0)
    expect(capturedUrls[0]).toContain('localhost:3000')
    expect(capturedUrls[0]).not.toContain('evil.com')
  })

  it('当无 refresh token 时应返回 null', async () => {
    const { tryRefreshSessionByCookie } = await import('@/lib/http/request/session')

    const mockReq = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
      nextUrl: {},
    } as any

    const result = await tryRefreshSessionByCookie(mockReq, 'trace-123')
    expect(result).toBeNull()
  })
})
