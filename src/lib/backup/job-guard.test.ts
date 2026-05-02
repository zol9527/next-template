import { describe, it, expect, vi } from 'vitest'
import { acquireJobLock, releaseJobLock, type PrismaClientLike } from './job-guard'

describe('acquireJobLock', () => {
  // 创建模拟的 Prisma 客户端
  const createMockPrisma = (activeJobs: Array<{ id: string }>) => {
    return {
      $queryRawUnsafe: vi.fn().mockResolvedValue(activeJobs),
    } as unknown as PrismaClientLike
  }

  it('无活跃 Job 时允许创建', async () => {
    // Arrange: 无活跃的备份任务
    const mockPrisma = createMockPrisma([])

    // Act: 尝试获取锁
    const result = await acquireJobLock({ prisma: mockPrisma })

    // Assert: 应该允许创建新任务
    expect(result.allowed).toBe(true)
    expect(result.activeJobId).toBeUndefined()
    expect(result.reason).toBeUndefined()

    // 验证 SQL 查询正确
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      `SELECT id FROM backup_jobs WHERE status IN ('pending', 'processing') LIMIT 1`
    )
  })

  it('有 processing Job 时拒绝', async () => {
    // Arrange: 有一个正在处理的备份任务
    const activeJobId = 'job-123'
    const mockPrisma = createMockPrisma([{ id: activeJobId }])

    // Act: 尝试获取锁
    const result = await acquireJobLock({ prisma: mockPrisma })

    // Assert: 应该拒绝创建新任务
    expect(result.allowed).toBe(false)
    expect(result.activeJobId).toBe(activeJobId)
    expect(result.reason).toBe('已有正在执行的备份任务')

    // 验证 SQL 查询正确
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      `SELECT id FROM backup_jobs WHERE status IN ('pending', 'processing') LIMIT 1`
    )
  })

  it('有 pending Job 时也拒绝', async () => {
    // Arrange: 有一个等待中的备份任务
    const activeJobId = 'job-456'
    const mockPrisma = createMockPrisma([{ id: activeJobId }])

    // Act: 尝试获取锁
    const result = await acquireJobLock({ prisma: mockPrisma })

    // Assert: 应该拒绝创建新任务
    expect(result.allowed).toBe(false)
    expect(result.activeJobId).toBe(activeJobId)
    expect(result.reason).toBe('已有正在执行的备份任务')

    // 验证 SQL 查询正确
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      `SELECT id FROM backup_jobs WHERE status IN ('pending', 'processing') LIMIT 1`
    )
  })
})

describe('releaseJobLock', () => {
  it('标记函数，无副作用', () => {
    // Act: 调用释放锁函数
    const result = releaseJobLock()

    // Assert: 应该无返回值，且不抛出错误
    expect(result).toBeUndefined()
  })
})
