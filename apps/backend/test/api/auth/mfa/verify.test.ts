/**
 * File: test/api/auth/mfa/verify.test.ts
 * Description: MFA 验证 API 测试（登录第二步）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import { TokenManager } from '@/lib/security/token-manager'
import { MfaService } from '@/services/core/mfa.service'
import { MFA_PENDING_TOKEN_COOKIE } from '@/lib/constants/token'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'

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

// Mock 插件注册表
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

vi.mock('@/app/api/v1/auth/auth-deps', () => ({
  createAuth: vi.fn(),
}))

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return {
    ...actual,
    appendAuthCookies: vi.fn(),
  }
})

vi.mock('@/lib/security/token-manager', () => ({
  TokenManager: {
    verifyMfaToken: vi.fn(),
  }
}))

vi.mock('@/services/core/mfa.service', () => ({
  MfaService: {
    verifyMFA: vi.fn(),
  }
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/auth/mfa/verify/route')

// ==================== 测试套件 ====================

describe('API: POST /api/v1/auth/mfa/verify', () => {
  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
  } as unknown as MfaRepository

  const mockAuth = {
    issueSession: vi.fn(),
    loginWithMfa: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(AuthDeps.createAuth).mockResolvedValue(mockAuth as any)
    vi.mocked(MfaService.verifyMFA).mockResolvedValue(true)
    vi.mocked(TokenManager.verifyMfaToken).mockResolvedValue({ sub: '550e8400-e29b-41d4-a716-446655440000', type: 'mfa_pending' })
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })
  })

  it('should return 400 for invalid body', async () => {
    const body = { badField: 'xxx' } // 缺少必填的 token 字段
    const req = new NextRequest('http://localhost/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })

  it('should return 401 for missing mfa_pending_token cookie', async () => {
    const body = { token: '000000' }
    const req = new NextRequest('http://localhost/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify(body).length.toString(),
        'x-forwarded-for': '127.0.0.1',
      }
    })
    // No cookies set

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should return 401 for invalid mfa_pending_token', async () => {
    vi.mocked(TokenManager.verifyMfaToken).mockRejectedValue(new Error('Invalid token'))

    const body = { token: '000000' }
    const req = new NextRequest('http://localhost/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify(body).length.toString(),
        'x-forwarded-for': '127.0.0.1',
      }
    })
    req.cookies.set(MFA_PENDING_TOKEN_COOKIE, 'invalid-token')

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })

  it('should extract userId from mfa_pending_token cookie, not request body', async () => {
    // H-5 修复: userId 不再从请求体获取，仅从 mfa_pending_token cookie 中提取
    vi.mocked(TokenManager.verifyMfaToken).mockResolvedValue({ sub: '550e8400-e29b-41d4-a716-446655440000', type: 'mfa_pending' })
    vi.mocked(AuthDeps.createAuth).mockResolvedValue({
      loginWithMfa: vi.fn().mockResolvedValue({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-id',
      }),
    } as any)

    // 请求体不包含 userId，只包含 token
    const body = { token: '123456' }
    const req = new NextRequest('http://localhost/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify(body).length.toString(),
        'x-forwarded-for': '127.0.0.1',
      }
    })
    req.cookies.set(MFA_PENDING_TOKEN_COOKIE, 'valid-token')

    const response = await POST(req, { params: Promise.resolve({}) })

    // 应该成功，因为 userId 从 cookie 中的 token 获取
    expect(response.status).toBe(200)
    // 验证 MFA 使用的是从 cookie 中解析的 userId
    expect(MfaService.verifyMFA).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      '123456',
      expect.anything(),
      expect.anything(),
      '127.0.0.1',
      undefined,
    )
  })

  it('should return 200 for valid token and valid MFA', async () => {
    vi.mocked(AuthDeps.createAuth).mockResolvedValue({
      loginWithMfa: vi.fn().mockResolvedValue({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-id',
      }),
    } as any)

    const body = { token: '123456' }
    const req = new NextRequest('http://localhost/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify(body).length.toString(),
        'x-forwarded-for': '127.0.0.1',
      }
    })
    req.cookies.set(MFA_PENDING_TOKEN_COOKIE, 'valid-token')

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.userId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})
