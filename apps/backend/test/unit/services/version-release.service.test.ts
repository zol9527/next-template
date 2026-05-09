/**
 * Unit: 版本发布服务测试
 *
 * Description: 测试版本发布服务的核心功能，包括版本同步的幂等性、版本列表查询和版本详情获取
 */

import { describe, it, expect, vi } from 'vitest'
import { createVersionReleaseService } from '@/services/core/version-release.service'
import { NotFoundError } from '@/lib/errors/app-error'
import type { VersionReleaseRepository } from '@/repositories/interfaces/version-release.repository.interface'
import type { VersionRelease } from '@/lib/prisma/generated/prisma'
import type pino from 'pino'

// 模拟日志记录器
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

// 模拟服务上下文
const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

/**
 * 构建测试用的版本发布记录
 */
function buildTestVersionRelease(overrides?: Partial<VersionRelease>): VersionRelease {
  return {
    id: 'version-123',
    version: '1.0.0',
    title: '版本 1.0.0 发布',
    description: '这是一个测试版本发布记录',
    releasedAt: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * 创建模拟的版本发布仓库
 */
function createMockVersionReleaseRepository(
  overrides?: Partial<VersionReleaseRepository>
): VersionReleaseRepository {
  return {
    create: vi.fn().mockResolvedValue(buildTestVersionRelease()),
    findByVersion: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(false),
    ...overrides,
  }
}

describe('版本发布服务测试', () => {
  describe('版本同步 (syncVersion)', () => {
    /**
     * Function: syncVersion (创建新版本)
     *
     * Description: 测试同步一个不存在的版本时创建新记录
     *
     * Parameters:
     *   data(object): 版本信息
     *   data.version(string): 版本号
     *   data.title(string): 版本标题
     *   data.description(string): 版本描述
     *   data.releasedAt(Date): 发布时间
     *
     * Returns:
     *   versionRelease(VersionRelease): 创建的版本发布记录
     */
    it('应该在版本不存在时创建新记录', async () => {
      const newVersion = buildTestVersionRelease({
        version: '2.0.0',
        title: '版本 2.0.0 发布',
      })

      const versionReleaseRepo = createMockVersionReleaseRepository({
        exists: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockResolvedValue(newVersion),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const result = await service.syncVersion({
        version: '2.0.0',
        title: '版本 2.0.0 发布',
        description: '新版本功能',
        releasedAt: new Date('2024-02-01T00:00:00.000Z'),
      })

      expect(result).toEqual(newVersion)
      expect(versionReleaseRepo.exists).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        '2.0.0'
      )
      expect(versionReleaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        {
          version: '2.0.0',
          title: '版本 2.0.0 发布',
          description: '新版本功能',
          releasedAt: new Date('2024-02-01T00:00:00.000Z'),
        }
      )
    })

    /**
     * Function: syncVersion (幂等性测试 - 版本已存在)
     *
     * Description: 测试同步已存在的版本时不创建新记录，而是返回现有记录
     * 这是幂等性的核心行为：多次调用同步操作不会产生副作用
     *
     * Parameters:
     *   data(object): 版本信息（与已存在版本相同）
     *
     * Returns:
     *   versionRelease(VersionRelease): 已存在的版本发布记录
     */
    it('应该在版本已存在时返回现有记录而不创建新记录（幂等性）', async () => {
      const existingVersion = buildTestVersionRelease({
        version: '1.0.0',
        title: '版本 1.0.0 发布',
      })

      const versionReleaseRepo = createMockVersionReleaseRepository({
        exists: vi.fn().mockResolvedValue(true),
        findByVersion: vi.fn().mockResolvedValue(existingVersion),
        create: vi.fn(), // 不应该被调用
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const result = await service.syncVersion({
        version: '1.0.0',
        title: '版本 1.0.0 发布',
        description: '已存在的版本',
        releasedAt: new Date('2024-01-01T00:00:00.000Z'),
      })

      expect(result).toEqual(existingVersion)
      expect(versionReleaseRepo.exists).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        '1.0.0'
      )
      expect(versionReleaseRepo.findByVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        '1.0.0'
      )
      expect(versionReleaseRepo.create).not.toHaveBeenCalled()
    })

    /**
     * Function: syncVersion (多次调用幂等性)
     *
     * Description: 测试多次调用 syncVersion 对同一版本的幂等性
     * 第一次调用创建记录，后续调用返回相同记录
     */
    it('应该支持对同一版本进行多次同步调用（幂等性）', async () => {
      const versionData = {
        version: '3.0.0',
        title: '版本 3.0.0 发布',
        description: '测试幂等性',
        releasedAt: new Date('2024-03-01T00:00:00.000Z'),
      }

      const createdVersion = buildTestVersionRelease(versionData)

      // 使用 mockResolvedValueOnce 来模拟状态变化：第一次不存在，后续存在
      const existsMock = vi.fn()
        .mockResolvedValueOnce(false) // 第一次调用：不存在
        .mockResolvedValueOnce(true)  // 第二次调用：已存在
        .mockResolvedValueOnce(true)  // 第三次调用：已存在

      const versionReleaseRepo = createMockVersionReleaseRepository({
        exists: existsMock,
        create: vi.fn().mockResolvedValue(createdVersion),
        findByVersion: vi.fn().mockResolvedValue(createdVersion),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      // 第一次调用：创建
      const result1 = await service.syncVersion(versionData)
      expect(result1).toEqual(createdVersion)
      expect(versionReleaseRepo.create).toHaveBeenCalledTimes(1)

      // 第二次调用：返回已存在的记录
      const result2 = await service.syncVersion(versionData)
      expect(result2).toEqual(createdVersion)
      expect(versionReleaseRepo.create).toHaveBeenCalledTimes(1) // 没有再次调用 create

      // 第三次调用：仍然返回已存在的记录
      const result3 = await service.syncVersion(versionData)
      expect(result3).toEqual(createdVersion)
      expect(versionReleaseRepo.create).toHaveBeenCalledTimes(1) // 没有再次调用 create
    })

    /**
     * Function: syncVersion (日志记录)
     *
     * Description: 测试 syncVersion 正确记录日志
     */
    it('应该记录同步操作的日志', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        exists: vi.fn().mockResolvedValue(false),
        create: vi.fn().mockResolvedValue(buildTestVersionRelease()),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      await service.syncVersion({
        version: '4.0.0',
        title: '版本 4.0.0 发布',
        description: '测试日志',
        releasedAt: new Date('2024-04-01T00:00:00.000Z'),
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'version_release.sync', version: '4.0.0' },
        '同步版本发布记录'
      )
    })
  })

  describe('版本列表查询 (getVersionList)', () => {
    /**
     * Function: getVersionList (成功获取列表)
     *
     * Description: 测试获取版本列表并正确分页
     *
     * Parameters:
     *   params(object): 分页参数
     *   params.page(number): 页码
     *   params.pageSize(number): 每页数量
     *
     * Returns:
     *   result(object): 包含列表、总数、分页信息的结果
     */
    it('应该成功获取版本列表', async () => {
      const versions = [
        buildTestVersionRelease({ version: '3.0.0', releasedAt: new Date('2024-03-01') }),
        buildTestVersionRelease({ version: '2.0.0', releasedAt: new Date('2024-02-01') }),
        buildTestVersionRelease({ version: '1.0.0', releasedAt: new Date('2024-01-01') }),
      ]

      const versionReleaseRepo = createMockVersionReleaseRepository({
        findMany: vi.fn().mockResolvedValue(versions),
        count: vi.fn().mockResolvedValue(10),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const result = await service.getVersionList({
        page: 1,
        pageSize: 3,
      })

      expect(result).toEqual({
        items: versions,
        total: 10,
        page: 1,
        pageSize: 3,
        totalPages: 4, // Math.ceil(10 / 3) = 4
      })

      expect(versionReleaseRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        {
          skip: 0,
          take: 3,
          orderBy: { releasedAt: 'desc' },
        }
      )
    })

    /**
     * Function: getVersionList (第二页数据)
     *
     * Description: 测试获取第二页数据时的分页计算
     */
    it('应该正确计算第二页的 skip 参数', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(20),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      await service.getVersionList({
        page: 2,
        pageSize: 5,
      })

      expect(versionReleaseRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        {
          skip: 5, // (2 - 1) * 5 = 5
          take: 5,
          orderBy: { releasedAt: 'desc' },
        }
      )
    })

    /**
     * Function: getVersionList (空列表)
     *
     * Description: 测试没有版本记录时返回空列表
     */
    it('应该在没有版本记录时返回空列表', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const result = await service.getVersionList({
        page: 1,
        pageSize: 10,
      })

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0, // Math.ceil(0 / 10) = 0
      })
    })

    /**
     * Function: getVersionList (日志记录)
     *
     * Description: 测试 getVersionList 正确记录日志
     */
    it('应该记录获取列表操作的日志', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const params = { page: 1, pageSize: 10 }
      await service.getVersionList(params)

      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'version_release.list', params },
        '获取版本列表'
      )
    })
  })

  describe('版本详情获取 (getVersion)', () => {
    /**
     * Function: getVersion (成功获取版本)
     *
     * Description: 测试根据版本号成功获取版本详情
     *
     * Parameters:
     *   version(string): 版本号
     *
     * Returns:
     *   versionRelease(VersionRelease): 版本发布记录
     */
    it('应该成功获取指定版本的详情', async () => {
      const version = buildTestVersionRelease({
        version: '1.0.0',
        title: '版本 1.0.0 发布',
      })

      const versionReleaseRepo = createMockVersionReleaseRepository({
        findByVersion: vi.fn().mockResolvedValue(version),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      const result = await service.getVersion('1.0.0')

      expect(result).toEqual(version)
      expect(versionReleaseRepo.findByVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          logger: expect.anything(),
        }),
        '1.0.0'
      )
    })

    /**
     * Function: getVersion (版本不存在)
     *
     * Description: 测试获取不存在的版本时抛出 404 错误
     *
     * Raises:
    *   NotFoundError: 404 NOT_FOUND 错误
     */
    it('应该在版本不存在时抛出 404 错误', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        findByVersion: vi.fn().mockResolvedValue(null),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      await expect(
        service.getVersion('99.99.99')
      ).rejects.toThrow('版本 99.99.99 不存在')

      await expect(
        service.getVersion('99.99.99')
      ).rejects.toThrow(NotFoundError)

      // 验证错误详情
      try {
        await service.getVersion('99.99.99')
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError)
        expect((error as NotFoundError).status).toBe(404)
        expect((error as NotFoundError).code).toBe('NOT_FOUND')
      }
    })

    /**
     * Function: getVersion (日志记录)
     *
     * Description: 测试 getVersion 正确记录日志
     */
    it('应该记录获取版本详情的日志', async () => {
      const versionReleaseRepo = createMockVersionReleaseRepository({
        findByVersion: vi.fn().mockResolvedValue(buildTestVersionRelease()),
      })

      const service = createVersionReleaseService(
        { versionReleaseRepo },
        mockServiceContext
      )

      await service.getVersion('1.0.0')

      expect(mockLogger.info).toHaveBeenCalledWith(
        { action: 'version_release.get', version: '1.0.0' },
        '获取版本详情'
      )
    })
  })
})
