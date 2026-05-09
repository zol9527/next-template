// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import * as RepoFactory from '@/repositories/factory'
import { TokenManager } from '@/lib/security/token-manager'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { AuthService } from '@/services/core/auth.service'
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

vi.mock('@/app/api/v1/auth/auth-deps', () => ({
  createAuth: vi.fn(),
}))

vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

vi.mock('@/lib/security/token-manager', () => ({
  TokenManager: {
    signMfaToken: vi.fn(),
  }
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/auth/login/route')

// ==================== 测试套件 ====================

describe('API: /api/v1/auth/login', () => {
  const mockValidateCredentials = vi.fn()
  const mockLoginUser = vi.fn()
  const mockAuthService = {
    validateCredentials: mockValidateCredentials,
    loginUser: mockLoginUser,
  } as unknown as AuthService

  const mockGetUserMfaData = vi.fn()
  const mockMfaRepository = {
    getUserMfaData: mockGetUserMfaData,
  } as unknown as MfaRepository

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(AuthDeps.createAuth).mockResolvedValue(mockAuthService)
    vi.mocked(RepoFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(TokenManager.signMfaToken).mockResolvedValue('mock-mfa-token')
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })
  })

  it('should return 200 and set cookies on success', async () => {
    mockGetUserMfaData.mockResolvedValue({ mfaEnabled: false })
    mockValidateCredentials.mockResolvedValue({ userId: 'test-user-id' })
    mockLoginUser.mockResolvedValue({
      userId: 'test-user-id',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    })

    const body = { identifier: 'testuser', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-length': JSON.stringify(body).length.toString(),
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: {
        userId: 'test-user-id',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      },
    })

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('access_token=test-access-token')
    expect(setCookie).toContain('refresh_token=test-refresh-token')
  })

  it('should return 200 with mfa_pending_token cookie when MFA is enabled', async () => {
    mockValidateCredentials.mockResolvedValue({ userId: 'test-user-id' })
    // mfaSetupAt 必须存在，否则会返回 403 MFA_SETUP_INCOMPLETE
    mockGetUserMfaData.mockResolvedValue({ mfaEnabled: true, mfaSetupAt: new Date() })

    const body = { identifier: 'testuser', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-length': JSON.stringify(body).length.toString(),
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.requiresMfa).toBe(true)

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('mfa_pending_token=mock-mfa-token')
  })

  it('should return 400 for invalid body', async () => {
     const body = { identifier: 'testuser' } // missing password
     const req = new NextRequest('http://localhost/api/v1/auth/login', {
       method: 'POST',
       body: JSON.stringify(body),
       headers: {
         'content-length': JSON.stringify(body).length.toString(),
       },
     })
 
     const response = await POST(req, { params: Promise.resolve({}) })
 
     expect(response.status).toBe(400)
   })

  it('should return 500 on service error', async () => {
    mockValidateCredentials.mockRejectedValue(new Error('Unexpected error'))

    const body = { identifier: 'testuser', password: 'wrongpassword' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-length': JSON.stringify(body).length.toString(),
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error.message).toBe('Internal error')
  })
})
