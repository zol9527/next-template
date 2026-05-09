/**
 * 维护模式守护器测试
 *
 * 测试内容：
 * 1. 维护模式成功开启（SQL 执行正确）
 * 2. 维护模式成功关闭
 * 3. 安全快照创建成功（调用 createDbBackup）
 * 4. 组合操作：开启维护模式并创建快照
 *
 * 使用 vi.hoisted + vi.mock 替代 vi.spyOn，避免 ESM 命名空间不可配置的问题
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PrismaClientLike } from './db-backup-engine'

// ─── Mock：node:fs 模块 ────────────────────────────────
// ESM 命名空间导出不可配置，无法使用 vi.spyOn，改用 vi.hoisted + vi.mock
const { mockCreateDbBackup, mockMkdirSync } = vi.hoisted(() => ({
  mockCreateDbBackup: vi.fn(),
  mockMkdirSync: vi.fn(),
}))

vi.mock('./db-backup-engine', () => ({
  createDbBackup: mockCreateDbBackup,
}))

vi.mock('node:fs', () => ({
  default: { mkdirSync: mockMkdirSync },
  mkdirSync: mockMkdirSync,
}))

// 在 mock 声明之后导入被测模块
import { enableMaintenanceMode, disableMaintenanceMode, createSafetySnapshot, enableMaintenanceModeWithSnapshot } from './maintenance-guard'

// ─── 测试数据 ─────────────────────────────────────────

const mockPrisma: PrismaClientLike = {
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn(),
} as any

const mockDbBackupResult = {
  zipPath: '/test/path/safety_snapshot_test.zip',
  totalTables: 5,
  totalRows: 100,
  duration: 1000,
  fileChecksums: { users: 'abc123' },
}

// ─── 测试套件 ─────────────────────────────────────────

describe('maintenance-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateDbBackup.mockResolvedValue(mockDbBackupResult)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('enableMaintenanceMode', () => {
    it('应该成功开启维护模式', async () => {
      ;(mockPrisma.$queryRawUnsafe as any).mockResolvedValue(undefined)

      await enableMaintenanceMode(mockPrisma)

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_settings'),
        'feature.maintenance_mode'
      )
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("value = 'true'"),
        'feature.maintenance_mode'
      )
    })

    it('应该抛出数据库错误', async () => {
      const error = new Error('数据库连接失败')
      ;(mockPrisma.$queryRawUnsafe as any).mockRejectedValue(error)

      await expect(enableMaintenanceMode(mockPrisma)).rejects.toThrow('数据库连接失败')
    })
  })

  describe('disableMaintenanceMode', () => {
    it('应该成功关闭维护模式', async () => {
      ;(mockPrisma.$queryRawUnsafe as any).mockResolvedValue(undefined)

      await disableMaintenanceMode(mockPrisma)

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_settings'),
        'feature.maintenance_mode'
      )
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("value = 'false'"),
        'feature.maintenance_mode'
      )
    })

    it('应该抛出数据库错误', async () => {
      const error = new Error('数据库连接失败')
      ;(mockPrisma.$queryRawUnsafe as any).mockRejectedValue(error)

      await expect(disableMaintenanceMode(mockPrisma)).rejects.toThrow('数据库连接失败')
    })
  })

  describe('createSafetySnapshot', () => {
    it('应该成功创建安全快照', async () => {
      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      const result = await createSafetySnapshot(params)

      expect(result).toEqual({
        zipPath: mockDbBackupResult.zipPath,
        snapshotTime: expect.any(Date),
      })
      expect(mockCreateDbBackup).toHaveBeenCalledTimes(1)
      expect(mockCreateDbBackup).toHaveBeenCalledWith({
        outputPath: expect.stringContaining('safety_snapshot_'),
        prisma: mockPrisma,
        databaseName: 'test_db',
        statsTracker: expect.any(Object),
        rateController: expect.any(Object),
      })
    })

    it('应该使用自定义输出目录', async () => {
      mockCreateDbBackup.mockImplementation(async (params: any) => ({
        ...mockDbBackupResult,
        zipPath: params.outputPath,
      }))

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
        outputDir: '/custom/path',
      }

      const result = await createSafetySnapshot(params)

      expect(result.zipPath).toContain('/custom/path')
      expect(mockCreateDbBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          outputPath: expect.stringContaining('/custom/path'),
        })
      )
    })

    it('应该在 createDbBackup 返回空路径时抛出错误', async () => {
      mockCreateDbBackup.mockResolvedValue({
        zipPath: '',
        totalTables: 5,
        totalRows: 100,
        duration: 1000,
        fileChecksums: {},
      })

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      await expect(createSafetySnapshot(params)).rejects.toThrow('安全快照创建失败：未生成 ZIP 文件路径')
    })

    it('应该在 createDbBackup 返回 undefined 路径时抛出错误', async () => {
      mockCreateDbBackup.mockResolvedValue({
        zipPath: undefined as any,
        totalTables: 5,
        totalRows: 100,
        duration: 1000,
        fileChecksums: {},
      })

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      await expect(createSafetySnapshot(params)).rejects.toThrow('安全快照创建失败：未生成 ZIP 文件路径')
    })

    it('应该传递 createDbBackup 失败的错误', async () => {
      const error = new Error('备份失败')
      mockCreateDbBackup.mockRejectedValue(error)

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      await expect(createSafetySnapshot(params)).rejects.toThrow('备份失败')
    })
  })

  describe('enableMaintenanceModeWithSnapshot', () => {
    it('应该先创建快照再开启维护模式', async () => {
      ;(mockPrisma.$queryRawUnsafe as any).mockResolvedValue(undefined)

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      const result = await enableMaintenanceModeWithSnapshot(params)

      expect(mockCreateDbBackup).toHaveBeenCalledTimes(1)
      expect(mockCreateDbBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseName: 'test_db',
        })
      )

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("value = 'true'"),
        'feature.maintenance_mode'
      )

      expect(result).toEqual({
        zipPath: mockDbBackupResult.zipPath,
        snapshotTime: expect.any(Date),
      })
    })

    it('应该在快照创建失败时抛出错误', async () => {
      const error = new Error('快照创建失败')
      mockCreateDbBackup.mockRejectedValue(error)

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      await expect(enableMaintenanceModeWithSnapshot(params)).rejects.toThrow('快照创建失败')

      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled()
    })

    it('应该在维护模式开启失败时抛出错误', async () => {
      const error = new Error('维护模式开启失败')
      ;(mockPrisma.$queryRawUnsafe as any).mockRejectedValue(error)

      const params = {
        prisma: mockPrisma,
        databaseName: 'test_db',
      }

      await expect(enableMaintenanceModeWithSnapshot(params)).rejects.toThrow('维护模式开启失败')

      expect(mockCreateDbBackup).toHaveBeenCalledTimes(1)
    })
  })
})
