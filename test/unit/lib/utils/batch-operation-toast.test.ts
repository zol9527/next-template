import { describe, expect, it } from 'vitest'

import { buildBatchOperationToast } from '@/lib/utils/batch-operation-toast'

describe('buildBatchOperationToast', () => {
  it('不应拼接出 true/false', () => {
    const out = buildBatchOperationToast({
      titlePrefix: '批量下架',
      actionLabel: '下架',
      successCount: 0,
      failedCount: 2,
    })

    expect(out.description).toBe('成功下架 0 个商品，失败 2 个')
    expect(out.description.includes('true')).toBe(false)
    expect(out.description.includes('false')).toBe(false)
  })

  it('全失败时返回 destructive 且标题为失败', () => {
    const out = buildBatchOperationToast({
      titlePrefix: '批量下架',
      actionLabel: '下架',
      successCount: 0,
      failedCount: 2,
    })

    expect(out.title).toBe('批量下架失败')
    expect(out.variant).toBe('destructive')
  })

  it('部分失败时标题提示部分失败但保持 default', () => {
    const out = buildBatchOperationToast({
      titlePrefix: '批量上架',
      actionLabel: '上架',
      successCount: 3,
      failedCount: 1,
    })

    expect(out.title).toBe('批量上架部分失败')
    expect(out.variant).toBe('default')
    expect(out.description).toBe('成功上架 3 个商品，失败 1 个')
  })

  it('无失败时标题为成功且不含失败文案', () => {
    const out = buildBatchOperationToast({
      titlePrefix: '批量删除',
      actionLabel: '删除',
      successCount: 2,
      failedCount: 0,
    })

    expect(out.title).toBe('批量删除成功')
    expect(out.variant).toBe('default')
    expect(out.description).toBe('成功删除 2 个商品')
  })
})
