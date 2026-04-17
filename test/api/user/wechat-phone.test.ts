import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/user/phone/wechat/route'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import * as ApiAuthDeps from '@/app/api/v1/_shared/use-api-auth'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { ApiAuthContext } from '@/app/api/v1/_shared/use-api-auth'
import { ConflictError, UnauthorizedError } from '@/lib/errors/app-error'

vi.mock('@/app/api/v1/auth/auth-deps', () => ({
  createAuth: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

describe('API: POST /api/v1/user/phone/wechat', () => {
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

  const mockBindWechatPhone = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(ApiAuthDeps.useApiAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })
    vi.mocked(AuthDeps.createAuth).mockResolvedValue({
      bindWechatPhone: mockBindWechatPhone,
    } as any)
  })

  it('应该在已登录状态下绑定微信手机号', async () => {
    mockBindWechatPhone.mockResolvedValue({ phone: '138****5678' })

    const req = new NextRequest('http://localhost/api/v1/user/phone/wechat', {
      method: 'POST',
      body: JSON.stringify({ code: 'wx-phone-code' }),
      headers: {
        cookie: 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
        'content-type': 'application/json',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    expect(mockBindWechatPhone).toHaveBeenCalledWith({
      userId: 'test-user-id',
      code: 'wx-phone-code',
    })

    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        message: '手机号绑定成功',
        phone: '138****5678',
      },
    })
  })

  it('应该在手机号冲突时返回 409', async () => {
    mockBindWechatPhone.mockRejectedValue(new ConflictError('该手机号已绑定其他账号'))

    const req = new NextRequest('http://localhost/api/v1/user/phone/wechat', {
      method: 'POST',
      body: JSON.stringify({ code: 'wx-phone-code' }),
      headers: {
        cookie: 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
        'content-type': 'application/json',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('CONFLICT')
  })

  it('应该在未登录时返回 401', async () => {
    vi.mocked(ApiAuthDeps.useApiAuth).mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/phone/wechat', {
      method: 'POST',
      body: JSON.stringify({ code: 'wx-phone-code' }),
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })
})
