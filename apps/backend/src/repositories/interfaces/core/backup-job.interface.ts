import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 备份任务筛选条件
 */
export interface BackupJobFilters {
  status?: string
  jobType?: string
  cursor?: string
  limit?: number
}

/**
 * 备份任务仓库接口
 */
export interface BackupJobRepository {
  /**
   * Function: createBackupJob
   *
   * Description: 创建新的备份/恢复任务
   *
   * Parameters:
   *   params(object): 请求参数
   *     jobType(string): 任务类型
   *     requestedBy(string): 请求者用户 ID
   *   ctx(RepoContext): 仓库上下文
   *
   * Returns:
   *   job(object): 创建的任务（包含 ID）
   *     id(string): 任务 ID
   */
  createBackupJob(
    params: { jobType: string; requestedBy: string },
    ctx: RepoContext
  ): Promise<{ id: string }>

  /**
   * Function: getBackupJobById
   *
   * Description: 根据 ID 获取任务详情
   *
   * Parameters:
   *   id(string): 任务 ID
   *   ctx(RepoContext): 仓库上下文
   *
   * Returns:
   *   job(object | null): 备份任务详情，不存在时返回 null
   *     id(string): 任务 ID
   *     jobType(string): 任务类型
   *     status(string): 任务状态
   *     requestedBy(string): 请求者用户 ID
   *     backupFileKey(string | null): 备份文件存储 key
   *     stats(Record<string, unknown> | null): 备份/恢复统计信息
   *     errorMessage(string | null): 错误信息
   *     startedAt(Date | null): 开始时间
   *     completedAt(Date | null): 完成时间
   *     createdAt(Date): 创建时间
   *     updatedAt(Date): 更新时间
   */
  getBackupJobById(
    id: string,
    ctx: RepoContext
  ): Promise<{
    id: string
    jobType: string
    status: string
    requestedBy: string
    backupFileKey: string | null
    stats: Record<string, unknown> | null
    errorMessage: string | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
  } | null>

  /**
   * Function: listBackupJobs
   *
   * Description: 分页查询任务列表
   *
   * Parameters:
   *   filters(BackupJobFilters): 筛选条件
   *   ctx(RepoContext): 仓库上下文
   *
   * Returns:
   *   result(object): 分页结果
   *     items(Array<object>): 任务列表
   *     nextCursor(string | null): 下一页游标
   *     total(number): 当前页数量
   */
  listBackupJobs(
    filters: BackupJobFilters,
    ctx: RepoContext
  ): Promise<{
    items: Array<{
      id: string
      jobType: string
      status: string
      requestedBy: string
      backupFileKey: string | null
      errorMessage: string | null
      createdAt: Date
      updatedAt: Date
    }>
    nextCursor: string | null
    total: number
  }>

  /**
   * Function: updateBackupJobStatus
   *
   * Description: 更新任务状态和附加数据
   *
   * Parameters:
   *   params(object): 更新参数
   *     id(string): 任务 ID
   *     status(string): 新状态
   *     backupFileKey(string, optional): 备份文件存储 key
   *     stats(Record<string, unknown>, optional): 备份/恢复统计信息
   *     errorMessage(string, optional): 错误信息
   *     startedAt(Date, optional): 开始时间
   *     completedAt(Date, optional): 完成时间
   *   ctx(RepoContext): 仓库上下文
   *
   * Returns:
   *   void: 无返回值
   */
  updateBackupJobStatus(
    params: {
      id: string
      status: string
      backupFileKey?: string
      stats?: Record<string, unknown>
      errorMessage?: string
      startedAt?: Date
      completedAt?: Date
    },
    ctx: RepoContext
  ): Promise<void>

  /**
   * Function: getActiveJobCount
   *
   * Description: 获取当前活跃（pending/processing）的任务数
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *
   * Returns:
   *   count(number): 活跃任务数量
   */
  getActiveJobCount(ctx: RepoContext): Promise<number>
}
