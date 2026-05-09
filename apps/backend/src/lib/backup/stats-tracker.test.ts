import { describe, it, expect, vi } from 'vitest'
import { StatsTracker, type BackupStats } from './stats-tracker'

describe('StatsTracker', () => {
  it('Debounce mechanism', async () => {
    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const tracker = new StatsTracker({ flushCallback, debounceMs: 50 })

    for (let i = 0; i < 10; i++) {
      tracker.update({ phase: `phase-${i}` })
    }

    expect(flushCallback).not.toHaveBeenCalled()

    await new Promise(resolve => setTimeout(resolve, 80))

    expect(flushCallback).toHaveBeenCalledTimes(1)
  })

  it('forceFlush bypasses debounce', async () => {
    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const tracker = new StatsTracker({ flushCallback, debounceMs: 5000 })

    tracker.update({ phase: 'test' })
    await tracker.forceFlush()

    expect(flushCallback).toHaveBeenCalledTimes(1)
  })

  it('getStats returns snapshot', () => {
    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const tracker = new StatsTracker({ flushCallback })

    tracker.update({ phase: 'backup', tablesTotal: 10 })
    expect(tracker.getStats()).toEqual({ phase: 'backup', tablesTotal: 10 })

    tracker.update({ tablesCompleted: 3 })
    expect(tracker.getStats()).toEqual({ phase: 'backup', tablesTotal: 10, tablesCompleted: 3 })
  })

  it('Reset clears everything', () => {
    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const tracker = new StatsTracker({ flushCallback })

    tracker.update({ phase: 'backup', tablesTotal: 10 })
    expect(tracker.getStats()).toEqual({ phase: 'backup', tablesTotal: 10 })

    tracker.reset()
    expect(tracker.getStats()).toEqual({})
  })

  it('Multiple updates merge correctly', () => {
    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const tracker = new StatsTracker({ flushCallback })

    tracker.update({ phase: 'backup', tablesTotal: 10 })
    expect(tracker.getStats()).toEqual({ phase: 'backup', tablesTotal: 10 })

    tracker.update({ tablesCompleted: 5 })
    expect(tracker.getStats()).toEqual({ phase: 'backup', tablesTotal: 10, tablesCompleted: 5 })
  })
})
