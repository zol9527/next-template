/**
 * File: test/api/admin/logs/config.test.ts
 * Description: 日志配置 API 路由测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UnauthorizedError } from '@/lib/errors/app-error'

// TODO: 适配 grant-based 权限系统 const useApiAdminAuthMock = vi.hoisted(() => vi.fn())
const createLogViewerServiceMock = vi.hoisted(() => vi.fn())
const mockGetConfig = vi.hoisted(() => vi.fn())

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

// Mock 服务
vi.mock('@/services/log-viewer.service', () => ({
  createLogViewerService: createLogViewerServiceMock,
}))

// Mock 认证
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn(),
}))

// 动态导入路由
const { GET } = await import('@/app/api/v1/admin/logs/config/route')

// ==================== Test Data ====================

const mockAdminAuth = {
  userId: 'admin-id',
  sessionId: 'session-id',
  roles: ['admin'],
  hasRole: vi.fn().mockReturnValue(true),
  assertPermission: vi.fn().mockResolvedValue(undefined),
  assertRole: vi.fn().mockReturnValue(undefined),
  getMe: vi.fn().mockResolvedValue({
    id: 'admin-id',
    nickname: 'Super Admin',
    roles: ['admin'],
    permissions: ['logs.read'],
  }),
}

const mockNonAdminAuth = {
  ...mockAdminAuth,
  roles: ['user'],
  hasRole: vi.fn().mockReturnValue(false),
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
// TODO: 适配 grant-based 权限系统     useApiAdminAuthMock.mockResolvedValue(mockAdminAuth as unknown)
  })

  describe('GET', () => {
    it('CFG-001: 未认证用户应该返回 401', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest('http://localhost/api/v1/admin/logs/config')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(401)
    })

    it('CFG-002: 非 admin 角色应该返回 403', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockResolvedValue(mockNonAdminAuth as unknown)

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
