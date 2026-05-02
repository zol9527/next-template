/**
 * RateController - 三层节流器
 *
 * 控制备份/恢复过程中的速率，避免对数据库和存储系统造成过大压力
 * 三层节流：表级、批级、文件级
 */

export interface RateControllerConfig {
  /** 每完成一张表后延迟（ms），默认 1000 */
  tableDelayMs?: number
  /** 每批行数阈值，默认 500 */
  batchBatchSize?: number
  /** 每达到批阈值后延迟（ms），默认 200 */
  batchDelayMs?: number
  /** 文件阈值：每处理 N 个文件后延迟，默认 10 */
  fileBatchSize?: number
  /** 每达到文件阈值后延迟（ms），默认 500 */
  fileDelayMs?: number
}

export class RateController {
  private tableDelayMs: number
  private batchBatchSize: number
  private batchDelayMs: number
  private fileBatchSize: number
  private fileDelayMs: number
  private batchCounter: number = 0
  private fileCounter: number = 0

  constructor(config: RateControllerConfig = {}) {
    this.tableDelayMs = config.tableDelayMs ?? 1000
    this.batchBatchSize = config.batchBatchSize ?? 500
    this.batchDelayMs = config.batchDelayMs ?? 200
    this.fileBatchSize = config.fileBatchSize ?? 10
    this.fileDelayMs = config.fileDelayMs ?? 500
  }

  /** 表完成后延迟 */
  async waitForTable(): Promise<void> {
    if (this.tableDelayMs > 0) {
      await this.sleep(this.tableDelayMs)
    }
  }

  /** 批处理后计数，达到阈值时延迟 */
  async waitForBatch(rowCount: number = 1): Promise<void> {
    this.batchCounter += rowCount
    if (this.batchCounter >= this.batchBatchSize) {
      this.batchCounter = 0
      if (this.batchDelayMs > 0) {
        await this.sleep(this.batchDelayMs)
      }
    }
  }

  /** 文件处理后计数，达到阈值时延迟 */
  async waitForFile(count: number = 1): Promise<void> {
    this.fileCounter += count
    if (this.fileCounter >= this.fileBatchSize) {
      this.fileCounter = 0
      if (this.fileDelayMs > 0) {
        await this.sleep(this.fileDelayMs)
      }
    }
  }

  /** 重置所有计数器 */
  reset(): void {
    this.batchCounter = 0
    this.fileCounter = 0
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}