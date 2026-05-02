/**
 * BackupJob 并发保护模块
 *
 * Function: acquireJobLock
 * Description: 检查是否有正在执行的备份任务，确保同一时间只有一个备份任务运行
 *
 * Parameters:
 *   params(JobGuardParams): 包含 Prisma 客户端的参数对象
 *
 * Returns:
 *   allowed(boolean): 是否允许创建新的备份任务
 *   activeJobId(string): 如果有活跃任务，返回其 ID
 *   reason(string): 拒绝原因
 */

/**
 * Prisma 客户端接口定义
 * 仅使用 $queryRawUnsafe 方法，避免引入完整 Prisma 类型
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * JobGuard 参数接口
 */
export interface JobGuardParams {
  prisma: PrismaClientLike
}

/**
 * JobGuard 结果接口
 */
export interface JobGuardResult {
  allowed: boolean
  activeJobId?: string
  reason?: string
}

/**
 * Function: acquireJobLock
 * Description: 检查是否有正在执行的备份任务，确保同一时间只有一个备份任务运行
 *
 * Parameters:
 *   params(JobGuardParams): 包含 Prisma 客户端的参数对象
 *
 * Returns:
 *   allowed(boolean): 是否允许创建新的备份任务
 *   activeJobId(string): 如果有活跃任务，返回其 ID
 *   reason(string): 拒绝原因
 */
export async function acquireJobLock(
  params: JobGuardParams
): Promise<JobGuardResult> {
  const { prisma } = params

  // 查询是否有 pending 或 processing 状态的备份任务
  const activeJobs = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM backup_jobs WHERE status IN ('pending', 'processing') LIMIT 1`
  )

  // 如果存在活跃任务，拒绝创建新任务
  if (activeJobs.length > 0) {
    return {
      allowed: false,
      activeJobId: activeJobs[0].id,
      reason: '已有正在执行的备份任务',
    }
  }

  // 无活跃任务，允许创建
  return {
    allowed: true,
  }
}

/**
 * Function: releaseJobLock
 * Description: 释放备份任务锁（标记函数，不需要实际实现）
 *
 * Parameters: 无
 *
 * Returns: void
 */
export function releaseJobLock(): void {
  // 标记函数，不需要实际实现
  // 未来如果需要实现分布式锁，可以在这里添加释放逻辑
}
