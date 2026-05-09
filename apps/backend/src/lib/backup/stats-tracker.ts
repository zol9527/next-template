/**
 * StatsTracker - 实时进度追踪器
 *
 * 维护内存中的 stats 对象，通过防抖机制减少写入频率
 * 支持强制刷新（forceFlush）用于关键节点（如阶段切换）
 */

/** 备份进度统计 */
export interface BackupStats {
  /** 当前阶段 */
  phase?: string
  /** 总表数 */
  tablesTotal?: number
  /** 已完成表数 */
  tablesCompleted?: number
  /** 当前处理的表名 */
  currentTable?: string
  /** 当前行数 */
  currentRows?: number
  /** 总行数 */
  totalRows?: number
  /** 文件总数 */
  filesTotal?: number
  /** 已完成文件数 */
  filesCompleted?: number
  /** 已传输字节数 */
  bytesTransferred?: number
  /** 失败文件数 */
  failedFiles?: number
  /** 失败文件列表 */
  failedFileList?: string[]
  /** 错误信息 */
  errors?: string[]
  /** 恢复断点 */
  restoreCheckpoint?: {
    completedTables: string[]
    currentTable?: string
  }
  /** 安全快照路径 */
  safetySnapshotPath?: string
}

export class StatsTracker {
  private stats: BackupStats
  private flushCallback: (stats: BackupStats) => Promise<void>
  private debounceMs: number
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private flushCount: number = 0

  constructor(deps: {
    flushCallback: (stats: BackupStats) => Promise<void>
    debounceMs?: number
  }) {
    this.stats = {}
    this.flushCallback = deps.flushCallback
    this.debounceMs = deps.debounceMs ?? 2000
  }

  /** 合并更新 stats（不立即写入） */
  update(partial: Partial<BackupStats>): void {
    this.stats = { ...this.stats, ...partial }
    this.scheduleFlush()
  }

  /** 获取当前 stats 快照 */
  getStats(): BackupStats {
    return { ...this.stats }
  }

  /** 立即强制写入（用于关键节点） */
  async forceFlush(): Promise<void> {
    this.cancelScheduled()
    await this.flushCallback(this.getStats())
    this.flushCount++
  }

  /** 获取 flush 调用次数（测试用） */
  getFlushCount(): number {
    return this.flushCount
  }

  /** 重置所有状态 */
  reset(): void {
    this.cancelScheduled()
    this.stats = {}
    this.flushCount = 0
  }

  private scheduleFlush(): void {
    this.cancelScheduled()
    this.debounceTimer = setTimeout(async () => {
      await this.flushCallback(this.getStats())
      this.flushCount++
      this.debounceTimer = null
    }, this.debounceMs)
  }

  private cancelScheduled(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }
}