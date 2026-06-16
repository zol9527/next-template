/**
 * API: 数据导出详情接口测试
 *
 * Description: 测试数据导出 GET /:id 端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/admin/exports/[id]/route'
import * as RepoFactory from '@/repositories/factory'
import * as DataExportServiceModule from '@/services/core/data-export.service'
import type { ExportJobRepository } from '@/repositories/interfaces/core/export-job.interface'
import type { DataExportService } from '@/services/core/data-export.service'
import type { ExportJobResponse } from '@/contracts/dtos/export.dto'

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

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

// Mock 依赖
vi.mock('@/repositories/factory', () => ({
  getExportJobRepository: vi.fn().mockResolvedValue({
    getExportJobById: vi.fn(),
  }),
}))

// Mock createDataExportService to capture the actual serviceContext
const mockCreateDataExportService = vi.fn()
vi.mock('@/services/core/data-export.service', () => ({
  createDataExportService: vi.fn((...args) => mockCreateDataExportService(...args)),
}))

// Mock 认证模块 - 使用 hoisted 确保在 vi.mock 中可用
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

// 固定测试时间
const TEST_NOW = new Date('2024-01-03T12:00:00.000Z')

function buildTestExportJobResponse(overrides?: Partial<ExportJobResponse>): ExportJobResponse {
  return {
    id: 'job-123',
    jobType: 'buyers_payment',
    status: 'completed',
    requestedBy: 'admin-123',
    fileUrl: 'https://example.com/exports/test.csv',
    fileName: 'test.csv',
    fileSize: 1024,
    recordCount: 100,
    errorMessage: null,
    filters: '{}',
    startedAt: '2024-01-03T11:00:00.000Z',
    completedAt: '2024-01-03T12:00:00.000Z',
    createdAt: TEST_NOW.toISOString(),
    updatedAt: TEST_NOW.toISOString(),
    ...overrides,
  }
}

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文（拥有所有权限）
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

describe('API: /api/v1/admin/exports/:id', () => {
  const mockExportJobRepo = {} as unknown as ExportJobRepository

  const mockDataExportService = {
    getExportJob: vi.fn(),
  } as unknown as DataExportService & {
    getExportJob: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(RepoFactory.getExportJobRepository).mockResolvedValue(mockExportJobRepo)
    vi.mocked(DataExportServiceModule.createDataExportService).mockImplementation((...args) => {
      return mockCreateDataExportService(...args)
    })
    mockCreateDataExportService.mockReturnValue(mockDataExportService)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  // ============================================================
  // GET /api/v1/admin/exports/:id 测试
  // ============================================================
  describe('GET', () => {
    it('应该成功获取任务详情', async () => {
      const mockJob = buildTestExportJobResponse()
      mockDataExportService.getExportJob.mockResolvedValue(mockJob)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: mockJob,
      })
      expect(mockDataExportService.getExportJob).toHaveBeenCalledWith('job-123')
    })

    it('任务不存在应返回 404', async () => {
      mockDataExportService.getExportJob.mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/non-existent')

      const response = await GET(req, { params: Promise.resolve({ id: 'non-existent' }) })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('NOT_FOUND')
      expect(json.error.message).toBe('Export job not found')
    })

    it('应支持 pending 状态的任务', async () => {
      const mockJob = buildTestExportJobResponse({
        status: 'pending',
        fileUrl: null,
        fileName: null,
        fileSize: null,
        recordCount: null,
      })
      mockDataExportService.getExportJob.mockResolvedValue(mockJob)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.status).toBe('pending')
      expect(json.data.fileUrl).toBeNull()
    })

    it('应支持 processing 状态的任务', async () => {
      const mockJob = buildTestExportJobResponse({
        status: 'processing',
        startedAt: '2024-01-03T11:00:00.000Z',
      })
      mockDataExportService.getExportJob.mockResolvedValue(mockJob)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.status).toBe('processing')
    })

    it('应支持 failed 状态的任务（包含错误信息）', async () => {
      const mockJob = buildTestExportJobResponse({
        status: 'failed',
        errorMessage: 'OSS upload failed: connection timeout',
        completedAt: '2024-01-03T12:00:00.000Z',
      })
      mockDataExportService.getExportJob.mockResolvedValue(mockJob)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.status).toBe('failed')
      expect(json.data.errorMessage).toBe('OSS upload failed: connection timeout')
    })

    it('应包含 filters 字段（JSON 字符串）', async () => {
      const mockJob = buildTestExportJobResponse({
        filters: '{"startTime":"2024-01-01T00:00:00Z","endTime":"2024-12-31T23:59:59Z"}',
      })
      mockDataExportService.getExportJob.mockResolvedValue(mockJob)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.filters).toBe('{"startTime":"2024-01-01T00:00:00Z","endTime":"2024-12-31T23:59:59Z"}')
    })

    // Note: 权限验证现在通过 withV1Route 的 requireAuth 处理

    it('Service 查询失败应返回 500', async () => {
      mockDataExportService.getExportJob.mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost/api/v1/admin/exports/job-123')

      const response = await GET(req, { params: Promise.resolve({ id: 'job-123' }) })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Internal error')
    })

    it('空 ID 字符串应正常处理（返回 404）', async () => {
      mockDataExportService.getExportJob.mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/v1/admin/exports/')

      const response = await GET(req, { params: Promise.resolve({ id: '' }) })

      expect(response.status).toBe(404)
    })

    it('特殊字符 ID 应正常处理', async () => {
      const specialId = 'job-123-with-special_chars'
      mockDataExportService.getExportJob.mockResolvedValue(null)

      const req = new NextRequest(`http://localhost/api/v1/admin/exports/${encodeURIComponent(specialId)}`)

      const response = await GET(req, { params: Promise.resolve({ id: specialId }) })

      expect(response.status).toBe(404)
      expect(mockDataExportService.getExportJob).toHaveBeenCalledWith(specialId)
    })
  })
})
