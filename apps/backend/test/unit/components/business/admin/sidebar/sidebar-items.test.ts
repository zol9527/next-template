import { describe, expect, it } from 'vitest'

import { SIDEBAR_ITEMS } from '@/components/business/admin/sidebar/sidebar-items'

describe('sidebar RBAC gating', () => {
  it('所有 requiredAccess 都应包含有效的 action 和 scope', () => {
    for (const item of SIDEBAR_ITEMS) {
      if (item.requiredAccess) {
        expect(item.requiredAccess.action).toBeTruthy()
        expect(item.requiredAccess.scope).toBeTruthy()
      }
    }
  })

  it('侧边栏中的 requiredAccess 不应为空', () => {
    const requiredAccess = SIDEBAR_ITEMS
      .map(item => item.requiredAccess)
      .filter(Boolean)
    expect(requiredAccess.length).toBeGreaterThan(0)
  })
})
