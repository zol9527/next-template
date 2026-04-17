import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/user/profile/wechat/route'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import * as ApiAuthDeps from '@/app/api/v1/_shared/use-api-auth'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { UnauthorizedError } from '@/lib/errors/app-error'

vi.mock('@/app/api/v1/auth/auth-deps', () => ({
  createAuth: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

describe('API: POST /api/v1/user/profile/wechat', () => {
  const mockAuthContext: ApiAuthContext = {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    roles: ['user'],
    hasRole: vi.fn(),
    assertPermission: vi.fn(),
    assertRole: vi.fn(),
    access: {
      has: vi.fn().mockReturnValue(true),
      assert: vi.fn(),
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canExecute: vi.fn().mockReturnValue(true),
      grants: [],
      scopesFor: vi.fn().mockReturnValue([]),
      hasAny: vi.fn().mockReturnValue(true),
      hasAll: vi.fn().mockReturnValue(true),
    },
    getMe: vi.fn(),
  }

  const mockCompleteWechatProfile = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(ApiAuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })
    vi.mocked(AuthDeps.createAuth).mockResolvedValue({
      completeWechatProfile: mockCompleteWechatProfile,
    } as any)
  })

  it('应该在已登录状态下完成微信资料补全', async () => {
    const req = new NextRequest('http://localhost/api/v1/user/profile/wechat', {
      method: 'POST',
      body: JSON.stringify({
        nickname: '张三',
        avatarUrl: 'https://example.com/avatar.png',
      }),
      headers: {
        cookie: 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
        'content-type': 'application/json',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    expect(mockCompleteWechatProfile).toHaveBeenCalledWith({
      userId: 'test-user-id',
      nickname: '张三',
      avatarUrl: 'https://example.com/avatar.png',
    })

    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        message: '资料补全成功',
      },
    })
  })

  it('应该在未登录时返回 401', async () => {
    vi.mocked(ApiAuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/profile/wechat', {
      method: 'POST',
      body: JSON.stringify({
        nickname: '张三',
        avatarUrl: 'https://example.com/avatar.png',
      }),
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('应该在请求体缺失时返回 400', async () => {
    const req = new NextRequest('http://localhost/api/v1/user/profile/wechat', {
      method: 'POST',
      headers: {
        cookie: 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('INVALID_INPUT')
  })
})
