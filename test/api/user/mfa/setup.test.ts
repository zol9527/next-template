/**
 * File: test/api/user/mfa/setup.test.ts
 * Description: MFA 设置 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as MfaFactory from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
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

// Mock 插件注册表
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

vi.mock('@/repositories/factory', () => ({
  createMfaRepository: vi.fn(),
}))

vi.mock('@/lib/http/ip-extractor', () => ({
  extractClientIpSafe: vi.fn(),
}))

// Mock MfaService 静态方法
vi.mock('@/services/core/mfa.service', () => ({
  MfaService: {
    disableMFA: vi.fn(),
    enableMFA: vi.fn(),
    setupMFA: vi.fn(),
    getMFAStatus: vi.fn(),
  },
}))

// 动态导入路由
const { POST } = await import('@/app/api/v1/user/mfa/setup/route')

// ==================== 测试辅助 ====================

function createMockAuth(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    roles: ['user'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        canUpload: true,
      },
      roles: [],
      permissions: [],
    }),
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

describe('API: POST /api/v1/user/mfa/setup', () => {
  let mockGetUserMfaData: ReturnType<typeof vi.fn>
  let mockUpdateUserMfa: ReturnType<typeof vi.fn>
  let mockCreateAuditLog: ReturnType<typeof vi.fn>

  const mockMfaRepository: MfaRepository = {
    getUserMfaData: vi.fn(),
    updateUserMfa: vi.fn(),
    disableUserMfa: vi.fn(),
    setPendingMfaSecret: vi.fn(),
    getPendingMfaSecret: vi.fn(),
    clearPendingMfaSecret: vi.fn(),
    createActionToken: vi.fn(),
    getActionToken: vi.fn(),
    consumeActionToken: vi.fn(),
    cleanupExpiredActionTokens: vi.fn(),
    createAuditLog: vi.fn(),
    getUserAuditLogs: vi.fn(),
  }

  beforeEach(() => {
    vi.resetAllMocks()

    // 重置 mock 仓库
    mockGetUserMfaData = vi.fn()
    mockUpdateUserMfa = vi.fn()
    mockCreateAuditLog = vi.fn()

    mockMfaRepository.getUserMfaData = mockGetUserMfaData
    mockMfaRepository.updateUserMfa = mockUpdateUserMfa
    mockMfaRepository.createAuditLog = mockCreateAuditLog

    vi.mocked(MfaFactory.createMfaRepository).mockResolvedValue(mockMfaRepository)
    vi.mocked(extractClientIpSafe).mockReturnValue({ ip: '127.0.0.1' })

    // Mock 认证上下文
    mockUseApiAuth.mockResolvedValue(createMockAuth())

    // Mock MfaService.setupMFA（BACKUP_CODES_COUNT = 10）
    vi.mocked(MfaService.setupMFA).mockResolvedValue({
      secret: 'test-secret',
      qrCode: 'data:image/png;base64,...',
      backupCodes: Array.from({ length: 10 }, (_, i) => `CODE-${String(i).padStart(2, '0')}`),
    })
  })

  it('should return MFA setup data for authenticated user', async () => {
    const req = new NextRequest('http://localhost/api/v1/user/mfa/setup', {
      method: 'POST',
      headers: {
        'Cookie': 'access_token=valid_token',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('secret')
    expect(json.data).toHaveProperty('qrCode')
    expect(json.data).toHaveProperty('backupCodes')
    expect(json.data.backupCodes).toHaveLength(10)
  })

  it('should return 401 for unauthenticated user', async () => {
    // Mock 认证失败
    mockUseApiAuth.mockRejectedValue(new UnauthorizedError())

    const req = new NextRequest('http://localhost/api/v1/user/mfa/setup', {
      method: 'POST',
    })

    const response = await POST(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(401)
  })
})
