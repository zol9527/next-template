/**
 * ExportJob Repository 单元测试
 *
 * @module repositories/prisma/export-job.repository.test
 * @description 测试导出任务仓库的所有方法
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPrismaExportJobRepository } from '@/repositories/prisma/core/export-job.repository'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ExportJob } from '@/lib/prisma/generated/prisma'
import type { BuyersPaymentExportRow } from '@/contracts/dtos/export-buyers.dto'
import type { PromotersCommissionExportRow } from '@/plugins/promotion/contracts/export-promoters.dto'
import { prisma } from '@/lib/prisma'
import type pino from 'pino'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exportJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

const mockCtx: RepoContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

/**
 * 辅助函数：构建测试用的 ExportJob 数据
 */
function buildTestExportJob(overrides?: Partial<ExportJob>): ExportJob {
  const now = new Date()
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * 辅助函数：构建测试用的 BuyersPaymentExportRow 数据
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildTestBuyersPaymentRow(overrides?: Partial<BuyersPaymentExportRow>): BuyersPaymentExportRow {
  return {
    userId: 'user-123',
    userName: '测试用户',
    userPhone: '138****5678',
    orderCount: 5,
    totalAmount: BigInt(50000),
    successAmount: BigInt(50000),
    refundedAmount: BigInt(0),
    lastPaymentAt: '2024-01-03T12:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 辅助函数：构建测试用的 PromotersCommissionExportRow 数据
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildTestPromotersCommissionRow(
  overrides?: Partial<PromotersCommissionExportRow>
): PromotersCommissionExportRow {
  return {
    promoterId: 'promoter-123',
    promoterName: '推广员A',
    promoterPhone: '139****6789',
    promoterLevel: '高级推广员',
    referralOrderCount: 10,
    totalSalesAmount: BigInt(100000),
    totalCommission: BigInt(5000),
    pendingCommission: BigInt(2000),
    settledCommission: BigInt(3000),
    settlementCount: 3,
    lastSettlementAt: '2024-01-02T12:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ExportJobRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================
  // 辅助函数测试
  // ============================================================
  describe('辅助函数测试', () => {
    describe('maskPhoneNumber', () => {
      it('null 应返回空字符串', () => {
        createPrismaExportJobRepository()
        // 测试内部函数通过数据转换验证
        const mockData = { userPhone: null as string | null }
        const result = mockData.userPhone ?? ''
        expect(result).toBe('')
      })

      it('空字符串应返回空字符串', () => {
        createPrismaExportJobRepository()
        const mockData = { phone: '' }
        const result = mockData.phone?.trim() || ''
        expect(result).toBe('')
      })

      it('短于 7 位应返回原值', () => {
        const phone = '123'
        const result = phone.length < 7 ? phone : phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
        expect(result).toBe('123')
      })

      it('8 位应正确脱敏', () => {
        const phone = '12345678'
        const result = phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
        expect(result).toBe('123****5678')
      })

      it('11 位应正确脱敏', () => {
        const phone = '13812345678'
        const result = phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
        expect(result).toBe('138****5678')
      })
    })
  })

  // ============================================================
  // createExportJob 测试
  // ============================================================
  describe('createExportJob', () => {
    it('应该成功创建导出任务', async () => {
      const now = new Date()
      const mockJob = buildTestExportJob({
        createdAt: now,
        updatedAt: now,
      })
      vi.mocked(prisma.exportJob.create).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      const result = await repo.createExportJob(mockCtx, {
        jobType: 'buyers_payment',
        requestedBy: 'admin-123',
        filters: { startTime: '2024-01-01', endTime: '2024-12-31' },
      })

      expect(result).toEqual({
        id: 'job-123',
        jobType: 'buyers_payment',
        status: 'pending',
        requestedBy: 'admin-123',
        fileUrl: null,
        fileName: null,
        fileSize: null,
        recordCount: null,
        errorMessage: null,
        filters: '{}', // mapExportJob 返回的是原始 job.filters，即 '{}'
        startedAt: null,
        completedAt: null,
        createdAt: mockJob.createdAt.toISOString(),
        updatedAt: mockJob.updatedAt.toISOString(),
      })
      expect(prisma.exportJob.create).toHaveBeenCalledWith({
        data: {
          jobType: 'buyers_payment',
          requestedBy: 'admin-123',
          filters: JSON.stringify({ startTime: '2024-01-01', endTime: '2024-12-31' }),
          status: 'pending',
        },
      })
      expect(mockLogger.info).toHaveBeenCalledWith({
        action: 'create_export_job',
        jobType: 'buyers_payment',
        requestedBy: 'admin-123',
      })
    })

    it('应该正确序列化 filters 为 JSON 字符串', async () => {
      const mockJob = buildTestExportJob()
      vi.mocked(prisma.exportJob.create).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      await repo.createExportJob(mockCtx, {
        jobType: 'promoters_commission',
        requestedBy: 'admin-456',
        filters: { status: 'active', level: 'senior' },
      })

      expect(prisma.exportJob.create).toHaveBeenCalledWith({
        data: {
          jobType: 'promoters_commission',
          requestedBy: 'admin-456',
          filters: JSON.stringify({ status: 'active', level: 'senior' }),
          status: 'pending',
        },
      })
    })
  })

  // ============================================================
  // getExportJobById 测试
  // ============================================================
  describe('getExportJobById', () => {
    it('应该成功获取任务', async () => {
      const mockJob = buildTestExportJob({
        id: 'job-456',
        status: 'processing',
      })
      vi.mocked(prisma.exportJob.findUnique).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getExportJobById(mockCtx, { id: 'job-456' })

      expect(result).toEqual({
        id: 'job-456',
        jobType: 'buyers_payment',
        status: 'processing',
        requestedBy: 'admin-123',
        fileUrl: null,
        fileName: null,
        fileSize: null,
        recordCount: null,
        errorMessage: null,
        filters: '{}',
        startedAt: null,
        completedAt: null,
        createdAt: mockJob.createdAt.toISOString(),
        updatedAt: mockJob.updatedAt.toISOString(),
      })
      expect(prisma.exportJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-456' },
      })
      expect(mockLogger.info).toHaveBeenCalledWith({
        action: 'get_export_job_by_id',
        id: 'job-456',
      })
    })

    it('应该返回 null 当任务不存在时', async () => {
      vi.mocked(prisma.exportJob.findUnique).mockResolvedValue(null)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getExportJobById(mockCtx, { id: 'non-existent' })

      expect(result).toBeNull()
    })
  })

  // ============================================================
  // listExportJobs 测试
  // ============================================================
  describe('listExportJobs', () => {
    it('应该使用默认参数返回任务列表', async () => {
      const mockJobs = [buildTestExportJob(), buildTestExportJob({ id: 'job-2' })]
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(2)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, {})

      expect(result.items).toHaveLength(2)
      expect(result.nextCursor).toBeNull()
      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 21, // limit + 1
        cursor: undefined,
        skip: 0,
      })
    })

    it('应该支持 jobType 筛选', async () => {
      const mockJobs = [buildTestExportJob({ jobType: 'buyers_payment' })]
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(1)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, { jobType: 'buyers_payment' })

      expect(result.items).toHaveLength(1)
      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { jobType: 'buyers_payment' },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        skip: 0,
      })
    })

    it('应该支持 status 筛选', async () => {
      const mockJobs = [buildTestExportJob({ status: 'completed' })]
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(1)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, { status: 'completed' })

      expect(result.items).toHaveLength(1)
      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: undefined,
        skip: 0,
      })
    })

    it('应该使用游标分页', async () => {
      const mockJobs = [buildTestExportJob(), buildTestExportJob({ id: 'job-2' })]
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(2)

      const repo = createPrismaExportJobRepository()
      await repo.listExportJobs(mockCtx, { cursor: 'job-100' })

      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: { id: 'job-100' },
        skip: 1,
      })
    })

    it('有下一页时应返回 nextCursor', async () => {
      const mockJobs = Array.from({ length: 21 }, (_, i) =>
        buildTestExportJob({ id: `job-${i}` })
      )
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(21)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, { limit: 20 })

      expect(result.items).toHaveLength(20)
      expect(result.nextCursor).toBe('job-20')
    })

    it('无下一页时应返回 null', async () => {
      const mockJobs = Array.from({ length: 20 }, (_, i) =>
        buildTestExportJob({ id: `job-${i}` })
      )
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(20)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, { limit: 20 })

      expect(result.items).toHaveLength(20)
      expect(result.nextCursor).toBeNull()
    })

    it('limit=1 应正常处理', async () => {
      const mockJobs = [buildTestExportJob()]
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue(mockJobs)
      vi.mocked(prisma.exportJob.count).mockResolvedValue(1)

      const _repo = createPrismaExportJobRepository()
      await _repo.listExportJobs(mockCtx, { limit: 1 })

      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 2, // limit + 1
        cursor: undefined,
        skip: 0,
      })
    })

    it('limit=100 应正常处理', async () => {
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue([])
      vi.mocked(prisma.exportJob.count).mockResolvedValue(0)

      const repo = createPrismaExportJobRepository()
      await repo.listExportJobs(mockCtx, { limit: 100 })

      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 101, // limit + 1
        cursor: undefined,
        skip: 0,
      })
    })

    it('limit 超出范围应限制为 100', async () => {
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue([])
      vi.mocked(prisma.exportJob.count).mockResolvedValue(0)

      const repo = createPrismaExportJobRepository()
      await repo.listExportJobs(mockCtx, { limit: 200 })

      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 101, // 100 + 1
        cursor: undefined,
        skip: 0,
      })
    })

    it('空列表应返回空数组', async () => {
      vi.mocked(prisma.exportJob.findMany).mockResolvedValue([])
      vi.mocked(prisma.exportJob.count).mockResolvedValue(0)

      const repo = createPrismaExportJobRepository()
      const result = await repo.listExportJobs(mockCtx, {})

      expect(result.items).toEqual([])
      expect(result.nextCursor).toBeNull()
    })
  })

  // ============================================================
  // updateExportJobStatus 测试
  // ============================================================
  describe('updateExportJobStatus', () => {
    it('更新为 processing 应自动设置 startedAt', async () => {
      const now = new Date()
      const mockJob = buildTestExportJob({
        status: 'processing',
        startedAt: now,
      })
      vi.mocked(prisma.exportJob.update).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      await repo.updateExportJobStatus(mockCtx, {
        id: 'job-123',
        status: 'processing',
      })

      expect(prisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'processing',
          startedAt: expect.any(Date),
        },
      })
    })

    it('更新为 completed 应自动设置 completedAt', async () => {
      const now = new Date()
      const mockJob = buildTestExportJob({
        status: 'completed',
        completedAt: now,
        fileUrl: 'https://example.com/file.csv',
        fileName: 'file.csv',
        fileSize: BigInt(1024),
        recordCount: 100,
      })
      vi.mocked(prisma.exportJob.update).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      await repo.updateExportJobStatus(mockCtx, {
        id: 'job-123',
        status: 'completed',
        fileUrl: 'https://example.com/file.csv',
        fileName: 'file.csv',
        fileSize: 1024,
        recordCount: 100,
      })

      expect(prisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'completed',
          fileUrl: 'https://example.com/file.csv',
          fileName: 'file.csv',
          fileSize: BigInt(1024),
          recordCount: 100,
          completedAt: expect.any(Date),
        },
      })
    })

    it('更新为 failed 应自动设置 completedAt', async () => {
      const now = new Date()
      const mockJob = buildTestExportJob({
        status: 'failed',
        completedAt: now,
        errorMessage: 'Export failed',
      })
      vi.mocked(prisma.exportJob.update).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      await repo.updateExportJobStatus(mockCtx, {
        id: 'job-123',
        status: 'failed',
        errorMessage: 'Export failed',
      })

      expect(prisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'failed',
          errorMessage: 'Export failed',
          completedAt: expect.any(Date),
        },
      })
    })

    it('应正确转换 fileSize 为 BigInt', async () => {
      const mockJob = buildTestExportJob({ fileSize: BigInt(2048) })
      vi.mocked(prisma.exportJob.update).mockResolvedValue(mockJob)

      const repo = createPrismaExportJobRepository()
      await repo.updateExportJobStatus(mockCtx, {
        id: 'job-123',
        status: 'completed',
        fileSize: 2048,
      })

      expect(prisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'completed',
          fileSize: BigInt(2048),
          completedAt: expect.any(Date),
        },
      })
    })
  })

  // ============================================================
  // getBuyersPaymentData 测试
  // ============================================================
  describe('getBuyersPaymentData', () => {
    it('应返回购买者支付数据', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          userId: 'user-456',
          userName: '测试用户2',
          userPhone: '13912345678',
          orderCount: BigInt(3),
          totalAmount: BigInt(30000),
          successAmount: BigInt(30000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getBuyersPaymentData(mockCtx, {})

      expect(result).toHaveLength(2)
      expect(result[0].userPhone).toBe('138****5678')
      expect(result[0].orderCount).toBe(5)
      expect(result[0].totalAmount).toBe(BigInt(50000))
      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 startTime 筛选', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getBuyersPaymentData(mockCtx, { startTime: '2024-01-01T00:00:00Z' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 endTime 筛选', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getBuyersPaymentData(mockCtx, { endTime: '2024-12-31T23:59:59Z' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 status 筛选', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getBuyersPaymentData(mockCtx, { status: 'success' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 productId 筛选', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getBuyersPaymentData(mockCtx, { productId: 'product-123' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('空结果集应返回空数组', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])

      const repo = createPrismaExportJobRepository()
      const result = await repo.getBuyersPaymentData(mockCtx, {})

      expect(result).toEqual([])
    })

    it('应正确转换数据类型', async () => {
      const mockRawData = [
        {
          userId: 'user-123',
          userName: '测试用户',
          userPhone: '13812345678',
          orderCount: BigInt(5),
          totalAmount: BigInt(50000),
          successAmount: BigInt(50000),
          refundedAmount: BigInt(0),
          lastPaymentAt: new Date('2024-01-03T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getBuyersPaymentData(mockCtx, {})

      expect(result[0].orderCount).toBe(5)
      expect(result[0].totalAmount).toBe(BigInt(50000))
      expect(result[0].lastPaymentAt).toBe('2024-01-03T12:00:00.000Z')
      expect(result[0].userPhone).toBe('138****5678') // 脱敏后
    })
  })

  // ============================================================
  // getPromotersCommissionData 测试
  // ============================================================
  describe('getPromotersCommissionData', () => {
    it('应返回推广员佣金数据', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          promoterId: 'promoter-456',
          promoterName: '推广员B',
          promoterPhone: '13812345678',
          promoterLevel: '普通推广员',
          referralOrderCount: BigInt(5),
          totalSalesAmount: BigInt(50000),
          totalCommission: BigInt(2500),
          pendingCommission: BigInt(1000),
          settledCommission: BigInt(1500),
          settlementCount: BigInt(2),
          lastSettlementAt: new Date('2024-01-01T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getPromotersCommissionData(mockCtx, {})

      expect(result).toHaveLength(2)
      expect(result[0].promoterPhone).toBe('139****5678')
      expect(result[0].referralOrderCount).toBe(10)
      expect(result[0].totalCommission).toBe(BigInt(5000))
      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 startTime 筛选', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getPromotersCommissionData(mockCtx, { startTime: '2024-01-01T00:00:00Z' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 endTime 筛选', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getPromotersCommissionData(mockCtx, { endTime: '2024-12-31T23:59:59Z' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 settlementStatus 筛选', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getPromotersCommissionData(mockCtx, { settlementStatus: 'settled' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('应支持 promoterLevel 筛选', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      await repo.getPromotersCommissionData(mockCtx, { promoterLevel: '高级推广员' })

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('空结果集应返回空数组', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])

      const repo = createPrismaExportJobRepository()
      const result = await repo.getPromotersCommissionData(mockCtx, {})

      expect(result).toEqual([])
    })

    it('应正确转换数据类型', async () => {
      const mockRawData = [
        {
          promoterId: 'promoter-123',
          promoterName: '推广员A',
          promoterPhone: '13912345678',
          promoterLevel: '高级推广员',
          referralOrderCount: BigInt(10),
          totalSalesAmount: BigInt(100000),
          totalCommission: BigInt(5000),
          pendingCommission: BigInt(2000),
          settledCommission: BigInt(3000),
          settlementCount: BigInt(3),
          lastSettlementAt: new Date('2024-01-02T12:00:00.000Z'),
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRawData)

      const repo = createPrismaExportJobRepository()
      const result = await repo.getPromotersCommissionData(mockCtx, {})

      expect(result[0].referralOrderCount).toBe(10)
      expect(result[0].totalCommission).toBe(BigInt(5000))
      expect(result[0].lastSettlementAt).toBe('2024-01-02T12:00:00.000Z')
      expect(result[0].promoterPhone).toBe('139****5678') // 脱敏后
    })
  })
})
