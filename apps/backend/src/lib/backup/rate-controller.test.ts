import { describe, it, expect } from 'vitest'
import { RateController } from './rate-controller'

describe('RateController', () => {
  describe('Table delay', () => {
    it('应该延迟指定的 tableDelayMs 时间', async () => {
      const controller = new RateController({ tableDelayMs: 50 })
      const start = Date.now()
      await controller.waitForTable()
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(50)
    })
  })

  describe('Batch delay triggered at threshold', () => {
    it('达到 batchBatchSize 阈值时应延迟', async () => {
      const controller = new RateController({ batchBatchSize: 3, batchDelayMs: 30 })
      const start = Date.now()
      await controller.waitForBatch(1) // 累计 1
      await controller.waitForBatch(1) // 累计 2
      await controller.waitForBatch(1) // 累计 3，触发延迟
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Batch delay NOT triggered below threshold', () => {
    it('未达到 batchBatchSize 阈值时不应延迟', async () => {
      const controller = new RateController({ batchBatchSize: 100, batchDelayMs: 30 })
      const start = Date.now()
      await controller.waitForBatch(1)
      await controller.waitForBatch(1)
      await controller.waitForBatch(1)
      await controller.waitForBatch(1)
      await controller.waitForBatch(1)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('File delay triggered at threshold', () => {
    it('达到 fileBatchSize 阈值时应延迟', async () => {
      const controller = new RateController({ fileBatchSize: 3, fileDelayMs: 30 })
      const start = Date.now()
      await controller.waitForFile(1) // 累计 1
      await controller.waitForFile(1) // 累计 2
      await controller.waitForFile(1) // 累计 3，触发延迟
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(30)
    })
  })

  describe('Reset clears counters', () => {
    it('reset() 后计数器应重置，阈值不会立即触发', async () => {
      const controller = new RateController({ batchBatchSize: 5, batchDelayMs: 30 })
      await controller.waitForBatch(3) // 累计 3，未触发
      await controller.reset()
      const start = Date.now()
      await controller.waitForBatch(3) // 累计 3，未触发
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(20) // 没有触发延迟
    })
  })

  describe('Zero delay config', () => {
    it('所有延迟为 0 时应立即返回', async () => {
      const controller = new RateController({
        tableDelayMs: 0,
        batchDelayMs: 0,
        fileDelayMs: 0,
        batchBatchSize: 1,
        fileBatchSize: 1,
      })
      const start = Date.now()
      await controller.waitForTable()
      await controller.waitForBatch(1)
      await controller.waitForFile(1)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(5)
    })
  })
})