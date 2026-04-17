/**
 * File: test/api/admin/logs/logs.test.ts
 * Description: 日志列表 API 路由测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UnauthorizedError } from '@/lib/errors/app-error'

// TODO: 适配 grant-based 权限系统 const useApiAdminAuthMock = vi.hoisted(() => vi.fn())
const createLogViewerServiceMock = vi.hoisted(() => vi.fn())
const mockGetRecentLogs = vi.hoisted(() => vi.fn())

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
const { GET } = await import('@/app/api/v1/admin/logs/route')

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
  getRecentLogs: mockGetRecentLogs,
  getConfig: vi.fn(),
  setLogLevel: vi.fn(),
  getCurrentLogFile: vi.fn(),
  readLastNLogs: vi.fn(),
  parseLogLine: vi.fn(),
  levelNumToString: vi.fn(),
}

// ==================== Test Suite ====================

describe('API: /api/v1/admin/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createLogViewerServiceMock.mockReturnValue(mockService as unknown)
// TODO: 适配 grant-based 权限系统     useApiAdminAuthMock.mockResolvedValue(mockAdminAuth as unknown)
  })

  describe('GET', () => {
    it('LOGS-001: 未认证用户应该返回 401', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockRejectedValue(new UnauthorizedError('Unauthorized'))

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(401)
    })

    it('LOGS-002: 非 admin 角色应该返回 403', async () => {
// TODO: 适配 grant-based 权限系统       useApiAdminAuthMock.mockResolvedValue(mockNonAdminAuth as unknown)

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(403)
    })

    it('LOGS-003: 应该成功返回日志列表', async () => {
      const mockLogs = {
        logs: [
          {
            time: '2026-03-01T10:00:00.000Z',
            level: 'info',
            msg: 'Test message',
            traceId: 'trace-001',
          },
          {
            time: '2026-03-01T10:01:00.000Z',
            level: 'warn',
            msg: 'Warning message',
            traceId: 'trace-002',
          },
        ],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 2,
      }
      mockGetRecentLogs.mockResolvedValue(mockLogs)

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.logs).toHaveLength(2)
      expect(json.data.currentLevel).toBe('info')
      expect(json.data.logFile).toBe('app.log')
    })

    it('LOGS-004: 应该支持按 level 参数过滤', async () => {
      const mockLogs = {
        logs: [
          {
            time: '2026-03-01T10:02:00.000Z',
            level: 'error',
            msg: 'Error message',
            traceId: 'trace-003',
          },
        ],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 1,
      }
      mockGetRecentLogs.mockResolvedValue(mockLogs)

      const req = new NextRequest('http://localhost/api/v1/admin/logs?level=error')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.logs).toHaveLength(1)
      expect(json.data.logs[0].level).toBe('error')

      // 验证服务被正确调用
      expect(mockGetRecentLogs).toHaveBeenCalledWith('error', 200)
    })

    it('LOGS-005: 应该支持自定义 limit 参数', async () => {
      mockGetRecentLogs.mockResolvedValue({
        logs: [],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 0,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs?limit=50')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(mockGetRecentLogs).toHaveBeenCalledWith(undefined, 50)
    })

    it('LOGS-006: limit 超过 500 应该返回 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/logs?limit=600')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })

    it('LOGS-007: 无效的 level 参数应该返回 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/logs?level=invalid')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })

    it('LOGS-008: 无日志文件时应该返回空数组', async () => {
      mockGetRecentLogs.mockResolvedValue({
        logs: [],
        currentLevel: 'info',
        logFile: '无日志文件',
        totalRead: 0,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.logs).toEqual([])
      expect(json.data.logFile).toBe('无日志文件')
    })

    it('LOGS-009: 响应应该包含 X-Trace-Id 头', async () => {
      mockGetRecentLogs.mockResolvedValue({
        logs: [],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 0,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(res.headers.has('x-trace-id') || res.headers.has('X-Trace-Id')).toBe(true)
    })

    it('应该使用默认 limit 值 200', async () => {
      mockGetRecentLogs.mockResolvedValue({
        logs: [],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 0,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs')
      await GET(req, { params: Promise.resolve({}) })

      expect(mockGetRecentLogs).toHaveBeenCalledWith(undefined, 200)
    })

    it('limit 为 1 应该是有效的', async () => {
      mockGetRecentLogs.mockResolvedValue({
        logs: [{ time: '2026-03-01T10:00:00.000Z', level: 'info', msg: 'Test' }],
        currentLevel: 'info',
        logFile: 'app.log',
        totalRead: 1,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/logs?limit=1')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(200)
      expect(mockGetRecentLogs).toHaveBeenCalledWith(undefined, 1)
    })

    it('limit 为 0 应该返回 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/logs?limit=0')
      const res = await GET(req, { params: Promise.resolve({}) })

      expect(res.status).toBe(400)
    })
  })
})
