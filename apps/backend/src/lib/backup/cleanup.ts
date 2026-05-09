import { promises as fs } from 'fs'
import path from 'path'

/**
 * BackupJob 清理模块
 *
 * Function: cleanupOldBackups
 * Description: 自动删除超出保留数量的旧备份
 *
 * Parameters:
 *   params(CleanupParams): 包含 Prisma 客户端、保留数量和备份目录的参数对象
 *
 * Returns:
 *   deletedCount(number): 删除的备份数量
 *   deletedFiles(string[]): 删除的文件路径列表
 *   freedBytes(number): 释放的字节数
 */

/**
 * Prisma 客户端接口定义
 * 仅使用 $queryRawUnsafe 方法，避免引入完整 Prisma 类型
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * 清理参数接口
 */
export interface CleanupParams {
  prisma: PrismaClientLike
  maxRetention?: number // 最大保留数量，默认 5
  backupDir: string // 备份文件目录
}

/**
 * 备份任务记录接口
 */
interface BackupJobRecord {
  id: string
  backup_file_key: string | null
  file_size: bigint | null
}

/**
 * 清理结果接口
 */
export interface CleanupResult {
  deletedCount: number
  deletedFiles: string[]
  freedBytes: number
}

/**
 * Function: cleanupOldBackups
 * Description: 自动删除超出保留数量的旧备份
 *
 * Parameters:
 *   params(CleanupParams): 包含 Prisma 客户端、保留数量和备份目录的参数对象
 *
 * Returns:
 *   deletedCount(number): 删除的备份数量
 *   deletedFiles(string[]): 删除的文件路径列表
 *   freedBytes(number): 释放的字节数
 */
export async function cleanupOldBackups(
  params: CleanupParams
): Promise<CleanupResult> {
  const { prisma, maxRetention, backupDir } = params

  // 1. 确定保留数量优先级：参数 > 环境变量 > 默认值
  const effectiveMaxRetention =
    maxRetention ??
    (process.env.BACKUP_MAX_RETENTION
      ? Number.parseInt(process.env.BACKUP_MAX_RETENTION, 10)
      : 5)

  // 2. 查询所有已完成的备份任务，按创建时间升序排列
  const completedJobs = await prisma.$queryRawUnsafe<BackupJobRecord[]>(
    `SELECT id, backup_file_key, file_size FROM backup_jobs WHERE status = 'completed' ORDER BY created_at ASC`
  )

  // 3. 计算需要删除的数量（只保留正数）
  const toDeleteCount = Math.max(0, completedJobs.length - effectiveMaxRetention)

  // 如果不需要删除，直接返回空结果
  if (toDeleteCount === 0) {
    return {
      deletedCount: 0,
      deletedFiles: [],
      freedBytes: 0,
    }
  }

  // 4. 删除最旧的 N 个备份
  const deletedFiles: string[] = []
  let freedBytes = 0

  for (let i = 0; i < toDeleteCount; i++) {
    const job = completedJobs[i]

    if (!job.backup_file_key) {
      continue // 跳过没有文件路径的记录
    }

    const filePath = path.join(backupDir, job.backup_file_key)

    try {
      // 删除本地 ZIP 文件
      await fs.unlink(filePath)
      deletedFiles.push(filePath)

      // 统计释放的空间
      if (job.file_size !== null) {
        freedBytes += Number(job.file_size)
      }
    } catch (error) {
      // 文件不存在时只删除记录不报错
      const fsError = error as NodeJS.ErrnoException
      if (fsError.code !== 'ENOENT') {
        throw error // 重新抛出非"文件不存在"错误
      }
    }

    // 删除数据库记录
    await prisma.$queryRawUnsafe(
      `DELETE FROM backup_jobs WHERE id = ?`,
      job.id
    )
  }

  // 5. 返回清理结果
  return {
    deletedCount: toDeleteCount,
    deletedFiles,
    freedBytes,
  }
}
