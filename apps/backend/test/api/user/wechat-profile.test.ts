import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { UnauthorizedError } from '@/lib/errors/app-error'

// ==================== Mocks ====================

// Mock logger 避免文件系统写入
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext 提供有效的上下文
vi.mock('@/types/service/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createServiceContext: vi.fn(() => ({
      traceId: 'test-trace-id',
      logger: mockLogger,
      userAgent: null,
      clientIp: null,
    })),
  }
})

// Mock 认证模块（使用 vi.hoisted 配合 withV1Route 的动态 import）
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// Mock 插件注册表（关键：wechat 路由有 pluginGuard: 'wechat'）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

vi.mock('@/app/api/v1/auth/auth-deps', () => ({
  createAuth: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/user/profile/wechat/route')

// ==================== 测试辅助 ====================

function createMockAuth(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    roles: ['user'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
    ...overrides,
  }
}

// ==================== 测试套件 ====================

describe('API: POST /api/v1/user/profile/wechat', () => {
  const mockCompleteWechatProfile = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    mockUseApiAuth.mockResolvedValue(createMockAuth())
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
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

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
