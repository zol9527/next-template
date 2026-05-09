/**
 * API: 数据导出接口测试
 *
 * Description: 测试数据导出的 POST 和 GET 端点
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/v1/admin/exports/route'
import * as RepoFactory from '@/repositories/factory'
import * as DataExportServiceModule from '@/services/core/data-export.service'
import type { ExportJobRepository } from '@/repositories/interfaces/export-job.interface'
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
    createExportJob: vi.fn(),
    getExportJobById: vi.fn(),
    listExportJobs: vi.fn(),
    updateExportJobStatus: vi.fn(),
    getBuyersPaymentData: vi.fn(),
    getPromotersCommissionData: vi.fn(),
  }),
}))

vi.mock('@/services/core/data-export.service', () => ({
  createDataExportService: vi.fn().mockReturnValue({
    createExportJob: vi.fn(),
    getExportJob: vi.fn(),
    listExportJobs: vi.fn(),
    processExportJob: vi.fn(),
  }),
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
    status: 'pending',
    requestedBy: 'admin-123',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    recordCount: null,
    errorMessage: null,
    filters: '{}',
    startedAt: null,
    completedAt: null,
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
 * Parameters:
 *     overrides(object): 可选的覆盖属性
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

describe('API: /api/v1/admin/exports', () => {
  const mockExportJobRepo = {
    createExportJob: vi.fn(),
    getExportJobById: vi.fn(),
    listExportJobs: vi.fn(),
    updateExportJobStatus: vi.fn(),
    getBuyersPaymentData: vi.fn(),
    getPromotersCommissionData: vi.fn(),
  } as unknown as ExportJobRepository

  const mockDataExportService = {
    createExportJob: vi.fn(),
    getExportJob: vi.fn(),
    listExportJobs: vi.fn(),
    processExportJob: vi.fn(),
  } as unknown as DataExportService & {
    createExportJob: ReturnType<typeof vi.fn>
    getExportJob: ReturnType<typeof vi.fn>
    listExportJobs: ReturnType<typeof vi.fn>
    processExportJob: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(RepoFactory.getExportJobRepository).mockResolvedValue(mockExportJobRepo)
    vi.mocked(DataExportServiceModule.createDataExportService).mockReturnValue(mockDataExportService)
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
  })

  // ============================================================
  // POST /api/v1/admin/exports 测试
  // ============================================================
  describe('POST', () => {
    it('应该成功创建 buyers_payment 导出任务', async () => {
      const mockJob = buildTestExportJobResponse()
      mockDataExportService.createExportJob.mockResolvedValue(mockJob)

      const body = {
        jobType: 'buyers_payment',
        filters: { startTime: '2024-01-01T00:00:00Z', endTime: '2024-12-31T23:59:59Z' },
      }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: mockJob,
      })
      expect(mockDataExportService.createExportJob).toHaveBeenCalledWith({
        jobType: 'buyers_payment',
        requestedBy: 'admin-id',
        filters: body.filters,
      })
    })

    it('应该成功创建 promoters_commission 导出任务', async () => {
      const mockJob = buildTestExportJobResponse({ jobType: 'promoters_commission' })
      mockDataExportService.createExportJob.mockResolvedValue(mockJob)

      const body = {
        jobType: 'promoters_commission',
        filters: { settlementStatus: 'settled' },
      }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.jobType).toBe('promoters_commission')
    })

    it('缺少 jobType 应返回 400', async () => {
      const body = { filters: {} }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    it('无效的 jobType 应返回 400', async () => {
      const body = { jobType: 'invalid_type', filters: {} }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
    })

    // Note: 权限验证现在通过 withV1Route 的 requireAuth 处理

    it('Service 创建失败应返回 500', async () => {
      mockDataExportService.createExportJob.mockRejectedValue(new Error('Database error'))

      const body = { jobType: 'buyers_payment', filters: {} }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.success).toBe(false)
      // withV1Route 会将普通 Error 映射为 'Internal error'
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Internal error')
    })

    it('filters 为 null 时应使用默认 {}', async () => {
      const mockJob = buildTestExportJobResponse()
      mockDataExportService.createExportJob.mockResolvedValue(mockJob)

      const body = { jobType: 'buyers_payment' }
      const req = new NextRequest('http://localhost/api/v1/admin/exports', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      expect(mockDataExportService.createExportJob).toHaveBeenCalledWith({
        jobType: 'buyers_payment',
        requestedBy: 'admin-id',
        filters: {},
      })
    })
  })

  // ============================================================
  // GET /api/v1/admin/exports 测试
  // ============================================================
  describe('GET', () => {
    it('应该成功返回任务列表', async () => {
      const mockJobs = [
        buildTestExportJobResponse({ id: 'job-1' }),
        buildTestExportJobResponse({ id: 'job-2' }),
      ]
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: mockJobs,
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({
        success: true,
        data: {
          items: mockJobs,
          nextCursor: null,
        },
      })
      expect(mockDataExportService.listExportJobs).toHaveBeenCalledWith({
        jobType: undefined,
        status: undefined,
        limit: 20,
        cursor: null,
      })
    })

    it('应该支持 jobType 筛选', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports?jobType=buyers_payment')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      expect(mockDataExportService.listExportJobs).toHaveBeenCalledWith({
        jobType: 'buyers_payment',
        status: undefined,
        limit: 20,
        cursor: null,
      })
    })

    it('应支持 status 筛选', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports?status=completed')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      expect(mockDataExportService.listExportJobs).toHaveBeenCalledWith({
        jobType: undefined,
        status: 'completed',
        limit: 20,
        cursor: null,
      })
    })

    it('应支持自定义 limit', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports?limit=50')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      expect(mockDataExportService.listExportJobs).toHaveBeenCalledWith({
        jobType: undefined,
        status: undefined,
        limit: 50,
        cursor: null,
      })
    })

    it('应支持游标分页', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: 'next-cursor',
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports?cursor=abc123')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      expect(mockDataExportService.listExportJobs).toHaveBeenCalledWith({
        jobType: undefined,
        status: undefined,
        limit: 20,
        cursor: 'abc123',
      })
    })

    it('空列表应返回空数组', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.items).toEqual([])
    })

    // Note: 权限验证现在通过 withV1Route 的 requireAuth 处理

    it('Service 查询失败应返回 500', async () => {
      mockDataExportService.listExportJobs.mockRejectedValue(new Error('Service error'))

      const req = new NextRequest('http://localhost/api/v1/admin/exports')

      const response = await GET(req, { params: Promise.resolve({}) })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.success).toBe(false)
      // withV1Route 会将普通 Error 映射为 'Internal error'
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Internal error')
    })

    it('limit 超出范围应返回 400', async () => {
      mockDataExportService.listExportJobs.mockResolvedValue({
        items: [],
        nextCursor: null,
      })

      const req = new NextRequest('http://localhost/api/v1/admin/exports?limit=200')

      const response = await GET(req, { params: Promise.resolve({}) })

      // Zod 验证会拒绝超出 max(100) 的值
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INVALID_INPUT')
    })
  })
})
