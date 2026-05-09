import { describe, expect, it } from 'vitest'

import { sidebarGroups } from '@/components/business/admin/sidebar/sidebar-items'

function collectRequiredAccess() {
  return sidebarGroups.flatMap((group) =>
    group.items.flatMap((item) => [item.requiredAccess, ...(item.children?.map((child) => child.requiredAccess) ?? [])])
  ).filter((access): access is NonNullable<typeof access> => Boolean(access))
}

describe('sidebarGroups RBAC gating', () => {
  it('所有 requiredAccess 都应包含有效的 action 和 scope', () => {
    const requiredAccess = collectRequiredAccess()

    for (const access of requiredAccess) {
      expect(access?.action).toBeTruthy()
      expect(access?.scope).toBeTruthy()
    }
  })

  it('侧边栏分组中的 requiredAccess 不应为空', () => {
    const requiredAccess = collectRequiredAccess()

    expect(requiredAccess.length).toBeGreaterThan(0)
  })
})
