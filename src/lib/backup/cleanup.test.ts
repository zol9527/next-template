import { describe, it, expect, vi } from 'vitest'
import { cleanupOldBackups, type PrismaClientLike } from './cleanup'
import path from 'path'

// vi.hoisted 确保在 vi.mock 工厂函数执行时变量已初始化
const { mockUnlink } = vi.hoisted(() => ({
  mockUnlink: vi.fn(),
}))

vi.mock('fs', () => ({
  default: { promises: { unlink: mockUnlink } },
  promises: { unlink: mockUnlink },
}))

describe('cleanupOldBackups', () => {
  it('超出保留数量时自动清理（7 个删到 5 个）', async () => {
    // Arrange: 7 个已完成的备份任务
    const backupJobs = Array.from({ length: 7 }, (_, i) => ({
      id: `job-${i}`,
      backup_file_key: `backup-${i}.zip`,
      file_size: BigInt(1024 * (i + 1)),
    }))

    const queryCallLog: Array<{ query: string; values: unknown[] }> = []

    const mockPrisma = {
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(
          async <T,>(query: string, ...values: unknown[]): Promise<T> => {
            queryCallLog.push({ query, values })
            if (query.includes('SELECT')) {
              return backupJobs as T
            }
            return null as T
          }
        ),
    } as unknown as PrismaClientLike

    mockUnlink.mockResolvedValue(undefined)

    // Act: 清理旧备份（默认保留 5 个）
    const result = await cleanupOldBackups({
      prisma: mockPrisma,
      backupDir: '/backups',
    })

    // Assert: 应该删除 2 个最旧的备份
    expect(result.deletedCount).toBe(2)
    expect(result.deletedFiles).toHaveLength(2)
    expect(result.deletedFiles[0]).toBe(path.join('/backups', 'backup-0.zip'))
    expect(result.deletedFiles[1]).toBe(path.join('/backups', 'backup-1.zip'))
    expect(result.freedBytes).toBe(1024 + 2048)

    // 验证 SQL 查询正确
    expect(queryCallLog[0].query).toBe(
      `SELECT id, backup_file_key, file_size FROM backup_jobs WHERE status = 'completed' ORDER BY created_at ASC`
    )

    // 验证删除了 2 条数据库记录
    const deleteCalls = queryCallLog.filter((log) => log.query.includes('DELETE'))
    expect(deleteCalls).toHaveLength(2)
    expect(deleteCalls[0].values).toEqual(['job-0'])
    expect(deleteCalls[1].values).toEqual(['job-1'])

    // 验证删除了 2 个文件
    expect(mockUnlink).toHaveBeenCalledTimes(2)
    expect(mockUnlink).toHaveBeenCalledWith(path.join('/backups', 'backup-0.zip'))
    expect(mockUnlink).toHaveBeenCalledWith(path.join('/backups', 'backup-1.zip'))
  })

  it('保留数量内的不删除', async () => {
    // Arrange: 3 个已完成的备份任务（少于默认保留数量 5）
    const backupJobs = Array.from({ length: 3 }, (_, i) => ({
      id: `job-${i}`,
      backup_file_key: `backup-${i}.zip`,
      file_size: BigInt(1024 * (i + 1)),
    }))

    const queryCallLog: Array<{ query: string; values: unknown[] }> = []

    const mockPrisma = {
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(
          async <T,>(query: string, ...values: unknown[]): Promise<T> => {
            queryCallLog.push({ query, values })
            if (query.includes('SELECT')) {
              return backupJobs as T
            }
            return null as T
          }
        ),
    } as unknown as PrismaClientLike

    // 重置 mock
    mockUnlink.mockClear()

    // Act: 清理旧备份
    const result = await cleanupOldBackups({
      prisma: mockPrisma,
      backupDir: '/backups',
    })

    // Assert: 不应该删除任何备份
    expect(result.deletedCount).toBe(0)
    expect(result.deletedFiles).toHaveLength(0)
    expect(result.freedBytes).toBe(0)

    // 验证只执行了 SELECT 查询，没有 DELETE
    expect(queryCallLog).toHaveLength(1)
    expect(queryCallLog[0].query).toContain('SELECT')

    // 验证没有删除文件
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('maxRetention 参数优先于环境变量', async () => {
    // Arrange: 设置环境变量为 10，但参数为 3
    const originalEnv = process.env.BACKUP_MAX_RETENTION
    process.env.BACKUP_MAX_RETENTION = '10'

    const backupJobs = Array.from({ length: 7 }, (_, i) => ({
      id: `job-${i}`,
      backup_file_key: `backup-${i}.zip`,
      file_size: BigInt(1024 * (i + 1)),
    }))

    const mockPrisma = {
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(
          async <T,>(query: string, ...values: unknown[]): Promise<T> => {
            if (query.includes('SELECT')) {
              return backupJobs as T
            }
            return null as T
          }
        ),
    } as unknown as PrismaClientLike

    mockUnlink.mockResolvedValue(undefined)

    try {
      // Act: 使用参数 maxRetention=3 清理
      const result = await cleanupOldBackups({
        prisma: mockPrisma,
        backupDir: '/backups',
        maxRetention: 3,
      })

      // Assert: 应该删除 7-3=4 个（参数 3 优先于环境变量 10）
      expect(result.deletedCount).toBe(4)
      expect(result.deletedFiles).toHaveLength(4)
    } finally {
      // 恢复环境变量
      if (originalEnv !== undefined) {
        process.env.BACKUP_MAX_RETENTION = originalEnv
      } else {
        delete process.env.BACKUP_MAX_RETENTION
      }
    }
  })

  it('文件不存在时只删记录不报错', async () => {
    // Arrange: 6 个备份任务，需要删除 1 个
    const backupJobs = Array.from({ length: 6 }, (_, i) => ({
      id: `job-${i}`,
      backup_file_key: `backup-${i}.zip`,
      file_size: BigInt(1024),
    }))

    const queryCallLog: Array<{ query: string; values: unknown[] }> = []

    const mockPrisma = {
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(
          async <T,>(query: string, ...values: unknown[]): Promise<T> => {
            queryCallLog.push({ query, values })
            if (query.includes('SELECT')) {
              return backupJobs as T
            }
            return null as T
          }
        ),
    } as unknown as PrismaClientLike

    // Mock 文件不存在错误
    const fsError = new Error('File not found') as NodeJS.ErrnoException
    fsError.code = 'ENOENT'
    mockUnlink.mockRejectedValueOnce(fsError)

    // Act: 清理旧备份
    const result = await cleanupOldBackups({
      prisma: mockPrisma,
      backupDir: '/backups',
      maxRetention: 5,
    })

    // Assert: 应该成功删除数据库记录，即使文件不存在
    expect(result.deletedCount).toBe(1)
    expect(result.deletedFiles).toHaveLength(0)
    expect(result.freedBytes).toBe(0)

    // 验证仍然删除了数据库记录
    const deleteCalls = queryCallLog.filter((log) => log.query.includes('DELETE'))
    expect(deleteCalls).toHaveLength(1)
    expect(deleteCalls[0].values).toEqual(['job-0'])
  })

  it('其他文件系统错误应该抛出', async () => {
    // Arrange: 6 个备份任务
    const backupJobs = Array.from({ length: 6 }, (_, i) => ({
      id: `job-${i}`,
      backup_file_key: `backup-${i}.zip`,
      file_size: BigInt(1024),
    }))

    const mockPrisma = {
      $queryRawUnsafe: vi
        .fn()
        .mockImplementation(
          async <T,>(query: string, ...values: unknown[]): Promise<T> => {
            if (query.includes('SELECT')) {
              return backupJobs as T
            }
            return null as T
          }
        ),
    } as unknown as PrismaClientLike

    // Mock 权限错误（非 ENOENT）
    const permissionError = new Error('Permission denied') as NodeJS.ErrnoException
    permissionError.code = 'EACCES'
    mockUnlink.mockRejectedValueOnce(permissionError)

    // Act & Assert: 应该抛出错误
    await expect(
      cleanupOldBackups({
        prisma: mockPrisma,
        backupDir: '/backups',
        maxRetention: 5,
      })
    ).rejects.toThrow('Permission denied')
  })
})
