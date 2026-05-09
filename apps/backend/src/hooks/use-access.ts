'use client'

import { useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createAccessManager } from '@/lib/auth/access-manager'
import type { AccessManager } from '@/lib/auth/access-manager'

/**
 * Hook: useAccess
 *
 * Description: 前端权限管理 Hook，返回 AccessManager 实例
 *              根据 auth-context 中的 grants 自动构建索引
 *
 * Returns:
 *     AccessManager: 权限管理器，提供 has/assert/canRead/canWrite/canExecute 等方法
 *
 * Example:
 *     const access = useAccess()
 *     if (access.canRead('users')) { ... }
 *     if (access.canWrite('orders')) { ... }
 */
export function useAccess(): AccessManager {
  const { grants } = useAuth()
  return useMemo(() => createAccessManager(grants), [grants])
}
