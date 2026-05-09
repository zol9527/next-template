/**
 * File: test/api/admin/logs/config.test.ts
 * Description: 日志配置 API 路由测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/app-error'

const createLogViewerServiceMock = vi.hoisted(() => vi.fn())
const mockGetConfig = vi.hoisted(() => vi.fn())
const mockUseApiAuth = vi.hoisted(() => vi.fn())

// ==================== Mocks ====================

// Mock logger to avoid file system issues
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

// Mock createServiceContext to provide a valid context
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

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

// Mock 服务
vi.mock('@/services/core/log-viewer.service', () => ({
  createLogViewerService: createLogViewerServiceMock,
}))

// Mock 认证
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// 动态导入路由
const { GET } = await import('@/app/api/v1/admin/logs/config/route')

// ==================== Test Data ====================

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth() {
  return {
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      check: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
  }
}

const mockService = {
  getRecentLogs: vi.fn(),
  getConfig: mockGetConfig,
  setLogLevel: vi.fn(),
  getCurrentLogFile: vi.fn(),
  readLastNLogs: vi.fn(),
  parseLogLine: vi.fn(),
  levelNumToString: vi.fn(),
}

// ==================== Test Suite ====================

describe('API: /api/v1/admin/logs/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createLogViewerServiceMock.mockReturnValue(mockService as unknown)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  describe('GET', () => {
    it('CFG-001: 未认证用户应该返回 401', async () => {
      mockUseApiAuth.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(401)
    })

    it('CFG-002: 非 admin 角色应该返回 403', async () => {
      mockUseApiAuth.mockRejectedValue(new ForbiddenError('Forbidden'))

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(403)
    })

    it('CFG-003: 应该成功返回配置信息', async () => {
      const mockConfigData = {
        currentLevel: 'info',
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: './logs',
        currentLogFile: 'app-2026-03-01.log',
      }
      mockGetConfig.mockReturnValue(mockConfigData)

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.currentLevel).toBe('info')
      expect(json.data.currentLogFile).toBe('app-2026-03-01.log')
    })

    it('CFG-004: 应该返回所有必需字段', async () => {
      const mockConfigData = {
        currentLevel: 'info',
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: './logs',
        currentLogFile: 'app.log',
      }
      mockGetConfig.mockReturnValue(mockConfigData)

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveProperty('currentLevel')
      expect(json.data).toHaveProperty('availableLevels')
      expect(json.data).toHaveProperty('logDirectory')
      expect(json.data).toHaveProperty('currentLogFile')
      expect(json.data.availableLevels).toEqual(['debug', 'info', 'warn', 'error'])
    })

    it('CFG-005: 无日志文件时应该返回提示信息', async () => {
      const mockConfigData = {
        currentLevel: 'info',
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: './logs',
        currentLogFile: '无日志文件',
      }
      mockGetConfig.mockReturnValue(mockConfigData)

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.currentLogFile).toBe('无日志文件')
    })

    it('应该正确创建服务实例', async () => {
      mockGetConfig.mockReturnValue({
        currentLevel: 'info',
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: './logs',
        currentLogFile: 'app.log',
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      await GET(req, { params: Promise.resolve({}) })

      expect(createLogViewerServiceMock).toHaveBeenCalled()
      expect(mockGetConfig).toHaveBeenCalled()
    })

    it('响应应该包含 X-Trace-Id 头', async () => {
      mockGetConfig.mockReturnValue({
        currentLevel: 'info',
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: './logs',
        currentLogFile: 'app.log',
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(res.headers.has('x-trace-id') || res.headers.has('X-Trace-Id')).toBe(true)
    })
  })
})
