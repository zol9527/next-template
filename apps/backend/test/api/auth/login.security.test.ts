// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/auth/login/route'
import * as AuthDeps from '@/app/api/v1/auth/auth-deps'
import * as RepoFactory from '@/repositories/factory'
import { TokenManager } from '@/lib/security/token-manager'
import { enforceRateLimit } from '@/lib/utils/rate-limit'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'

// Mock dependencies
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

vi.mock('@/lib/utils/rate-limit', () => ({
  enforceRateLimit: vi.fn(),
}))

// We can use the real implementation for extractClientIpSafe as it is a utility
// or mock it if needed. Let's mock it to control the IP easily.
vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

describe('API: /api/v1/auth/login [Security]', () => {
  const mockAuthService = {
    validateCredentials: vi.fn(),
    loginUser: vi.fn(),
  }

  const mockMfaRepository = {
    getUserMfaData: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(AuthDeps.createAuth).mockResolvedValue(mockAuthService as any)
    vi.mocked(RepoFactory.createMfaRepository).mockResolvedValue(mockMfaRepository as any)
    vi.mocked(TokenManager.signMfaToken).mockResolvedValue('mock-mfa-token')

    // Default mocks
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })
    vi.mocked(enforceRateLimit).mockResolvedValue({ allowed: true })

    mockAuthService.validateCredentials.mockResolvedValue({ userId: 'user-123' })
    mockMfaRepository.getUserMfaData.mockResolvedValue({ mfaEnabled: false })
    mockAuthService.loginUser.mockResolvedValue({
      userId: 'user-123',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
  })

  it('should allow login when both user and IP rate limits are respected', async () => {
    const body = { identifier: 'user1', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)

    expect(enforceRateLimit).toHaveBeenCalledTimes(1)
    expect(enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        rule: 'auth:login',
        ip: '127.0.0.1',
        identity: 'user1',
      }),
      expect.anything()
    )
  })

  it('should block login when IP rate limit is exceeded', async () => {
    // Mock checkRateLimit to fail ONLY for the IP check
    vi.mocked(enforceRateLimit).mockImplementation(async (params) => {
      if (params.rule === 'auth:login') {
        return { allowed: false, retryAfterSeconds: 60 }
      }
      return { allowed: true }
    })

    const body = { identifier: 'user1', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(429)
    const json = await response.json()
    expect(json.error.code).toBe('TOO_MANY_REQUESTS')
    expect(response.headers.get('Retry-After')).toBe('60')

    expect(mockAuthService.validateCredentials).not.toHaveBeenCalled()
  })

  it('should block login when User/IP rate limit is exceeded (standard check)', async () => {
    // Mock checkRateLimit to fail for the ip-identifier check (first check)
    vi.mocked(enforceRateLimit).mockImplementation(async (params) => {
      if (params.rule === 'auth:login') {
        return { allowed: false, retryAfterSeconds: 30 }
      }
      return { allowed: true }
    })

    const body = { identifier: 'user1', password: 'password123' }
    const req = new NextRequest('http://localhost/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(429)
    const json = await response.json()
    // Depending on withV1Route implementation, message might differ
    expect(json.error.code).toBe('TOO_MANY_REQUESTS')

    expect(enforceRateLimit).toHaveBeenCalledTimes(1)
    expect(enforceRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
        rule: 'auth:login',
        identity: 'user1',
        }),
        expect.anything()
    )
  })
})
