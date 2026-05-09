'use client'

import { createContext, ReactNode, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { AuthContextValue, MeUserDto, RoleDto, LoginParams, GrantDto } from '@/types/lib/auth-context'
import { MeResponseSchema } from '@/contracts/dtos/auth/me.dto'
import type { Session } from '@/contracts/dtos/session.dto'
import { SessionSchema } from '@/contracts/dtos/session.dto'
import { ApiSuccessResponseSchema, ApiFailureResponseSchema } from '@/contracts/api-response.schema'
import { RefreshSessionResponseSchema } from '@/contracts/dtos/auth/refresh.dto'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ==================== 跨标签页刷新锁 ====================

/**
 * localStorage 锁的 Key
 */
const REFRESH_LOCK_KEY = 'auth_refresh_lock'

/**
 * 锁的超时时间（毫秒），防止死锁
 */
const REFRESH_LOCK_TIMEOUT = 10000 // 10 秒

/**
 * Type: RefreshLockData
 *
 * Description: 刷新锁的数据结构
 */
type RefreshLockData = {
  locked: boolean
  timestamp: number
}

/**
 * Function: isLockValid
 *
 * Description: 检查锁是否有效（未超时）
 *
 * Returns:
 *     boolean: 锁存在且未超时返回 true
 */
function isLockValid(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const lockData = window.localStorage.getItem(REFRESH_LOCK_KEY)
    if (!lockData) return false

    const data: RefreshLockData = JSON.parse(lockData)
    return Date.now() - data.timestamp < REFRESH_LOCK_TIMEOUT
  } catch {
    return false
  }
}

/**
 * Function: acquireLock
 *
 * Description: 尝试获取刷新锁
 *
 * Returns:
 *     boolean: 成功获取锁返回 true，否则返回 false
 */
function acquireLock(): boolean {
  if (typeof window === 'undefined') return false

  if (isLockValid()) return false

  try {
    window.localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({
      locked: true,
      timestamp: Date.now(),
    }))
    return isLockValid()
  } catch {
    return false
  }
}

/**
 * Function: releaseLock
 *
 * Description: 释放刷新锁
 */
function releaseLock(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(REFRESH_LOCK_KEY)
  } catch {
    // 忽略错误
  }
}

// ==================== 测试专用：模块级刷新锁实现 ====================

/**
 * 单文件内的并发刷新 Promise（用于同标签页并发去重）
 */
let pendingRefreshPromise: Promise<boolean> | null = null

/**
 * 等待跨标签页锁释放（轮询），避免忙等
 */
async function waitForLockRelease(timeoutMs: number = REFRESH_LOCK_TIMEOUT): Promise<void> {
  if (typeof window === 'undefined') return

  const start = Date.now()
  while (isLockValid()) {
    if (Date.now() - start >= timeoutMs) {
      return
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100)
    })
  }
}

/**
 * Function: refreshSession (仅用于测试)
 *
 * Description: 刷新会话 Token，带有同标签页并发去重和跨标签页 localStorage 锁。
 *
 * Returns:
 *     Promise<boolean>: 是否刷新成功
 */
export function refreshSession(): Promise<boolean> {
  if (pendingRefreshPromise) return pendingRefreshPromise

  pendingRefreshPromise = (async () => {
    // 尝试获取跨标签页锁；如果失败则等待锁释放并重试一次
    if (!acquireLock()) {
      await waitForLockRelease()
      if (!acquireLock()) {
        return false
      }
    }

    try {
      return await refreshSessionImpl()
    } finally {
      pendingRefreshPromise = null
      releaseLock()
    }
  })()

  return pendingRefreshPromise
}

/**
 * Function: refreshSessionImpl
 *
 * Description: 刷新会话 Token 的底层实现
 *              不包含任何并发控制逻辑，只负责发送请求
 *              导出供测试使用
 *
 * Returns:
 *     Promise<boolean>: 是否刷新成功
 */
export async function refreshSessionImpl(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    const ApiResponseSchema = z.union([
      ApiSuccessResponseSchema(RefreshSessionResponseSchema),
      ApiFailureResponseSchema,
    ])

    const json = await res.json()
    const parsed = ApiResponseSchema.safeParse(json)

    return !!(parsed.success && parsed.data.success)
  } catch {
    return false
  }
}

/**
 * Function: fetchMe
 *
 * Description: 获取当前用户信息
 *
 * Returns:
 *     object: 包含 user, roles, permissions
 *
 * Throws:
 *     Error: 当请求失败或响应格式不正确时抛出错误
 */
async function fetchMe(): Promise<{
  user: MeUserDto
  roles: RoleDto[]
  grants: GrantDto[]
}> {
  const res = await fetch('/api/v1/user/me', {
    method: 'GET',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`获取用户信息失败: ${res.status}`)
  }

  const ApiResponseSchema = z.union([
    ApiSuccessResponseSchema(MeResponseSchema),
    ApiFailureResponseSchema,
  ])

  const json = await res.json()
  const parsed = ApiResponseSchema.safeParse(json)

  if (!parsed.success) {
    throw new Error('响应格式不符合预期')
  }

  const api = parsed.data
  if (!api.success) {
    throw new Error(api.error.message || '获取用户信息失败')
  }

  return {
    user: api.data.user,
    roles: api.data.roles,
    grants: api.data.grants || [],
  }
}

/**
 * Type: AuthProviderProps
 *
 * Description: AuthProvider 组件属性
 *
 * Properties:
 *     children(ReactNode): 子组件
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Function: AuthProvider
 *
 * Description: 认证上下文提供者组件，自动获取并管理用户认证状态
 *
 * Parameters:
 *     props(AuthProviderProps): 组件属性
 *
 * Returns:
 *     React.ReactElement: AuthProvider 组件
 *
 * Features:
 *     - 使用 TanStack Query 管理数据获取和缓存
 *     - 自动调用 /api/v1/user/me 获取用户信息
 *     - 提供 login、logout、refreshSession 操作方法
 *     - 提供权限和角色检查方法
 *     - 使用 mutation 状态自动处理并发刷新请求
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()

  // 使用 ref 来存储刷新状态，确保在渲染周期内稳定
  const refreshState = useRef({
    isRefreshing: false,
    pendingPromise: null as Promise<boolean> | null,
  })

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 10 * 1000, // 10 秒 - 缩短缓存时间以更快识别权限变化
    refetchOnWindowFocus: true, // 窗口聚焦时重新获取权限
    refetchOnReconnect: true, // 网络重连时重新获取权限
  })

  // Session 查询
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['sessions', 'mine'],
    queryFn: async (): Promise<Session[]> => {
      const res = await fetch('/api/v1/user/sessions?page=1&pageSize=50', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`获取会话列表失败: ${res.status}`)
      const json = await res.json()
      const ApiResponseSchema = z.union([
        ApiSuccessResponseSchema(z.object({
          sessions: z.array(SessionSchema),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        })),
        ApiFailureResponseSchema,
      ])
      const parsed = ApiResponseSchema.safeParse(json)
      if (!parsed.success || !parsed.data.success) return []
      return parsed.data.data.sessions
    },
    staleTime: 1 * 60 * 1000, // 1 分钟
  })

  /**
   * Function: refreshSession
   *
   * Description: 刷新会话 Token，带有并发控制
   *              使用 React 状态管理来防止并发请求
   *
   * Returns:
   *     Promise<boolean>: 是否刷新成功
   */
  const refreshSession = async (): Promise<boolean> => {
    // 如果已经在刷新，返回现有的 Promise
    if (refreshState.current.isRefreshing && refreshState.current.pendingPromise) {
      return refreshState.current.pendingPromise
    }

    // 尝试获取跨标签页锁
    if (!acquireLock()) {
      // 其他标签页正在刷新，返回 false
      return false
    }

    // 标记刷新开始
    refreshState.current.isRefreshing = true

    // 创建刷新 Promise
    refreshState.current.pendingPromise = (async () => {
      try {
        const success = await refreshSessionImpl()
        if (success) {
          await refetch()
        }
        return success
      } finally {
        // 清理状态
        refreshState.current.isRefreshing = false
        refreshState.current.pendingPromise = null
        releaseLock()
      }
    })()

    return refreshState.current.pendingPromise
  }

  // 登录 Mutation
  const loginMutation = useMutation({
    mutationFn: async (params: LoginParams) => {
      const body = params.type === 'password'
        ? { identifier: params.identifier, password: params.password }
        : { code: params.code }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`登录失败: ${res.status}`)
      }

      return res.json()
    },
    onSuccess: async () => {
      // 立即使缓存失效并重新获取，确保权限数据是最新的
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await refetch()
    },
  })

  // 登出 Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        throw new Error(`登出失败: ${res.status}`)
      }

      queryClient.removeQueries({ queryKey: ['auth'] })
    },
  })

  // 撤销指定会话 Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/v1/user/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`撤销会话失败: ${res.status}`)
    },
    onSuccess: async () => {
      await refetchSessions()
    },
  })

  // 构建上下文值
  const contextValue: AuthContextValue = {
    user: data?.user || null,
    roles: data?.roles || [],
    grants: data?.grants || [],
    isAuthenticated: !!data?.user,
    isLoading: isLoading || isFetching,
    error: error as Error | null,
    login: async (params) => {
      await loginMutation.mutateAsync(params)
    },
    logout: async () => {
      await logoutMutation.mutateAsync()
    },
    refreshSession,
    refetch: async () => {
      await refetch()
    },
    hasRole: (requiredRole: string) => {
      return (data?.roles || []).some((role) => role.name === requiredRole)
    },
    // Session 管理
    sessions: sessionsData || [],
    sessionsLoading,
    sessionsError: sessionsError as Error | null,
    revokeSession: async (sessionId: string) => {
      await revokeSessionMutation.mutateAsync(sessionId)
    },
    revokeOtherSessions: async () => {
      await refetchSessions()
    },
    refreshSessions: async () => {
      await refetchSessions()
    },
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Function: resetRefreshLock (仅用于测试)
 *
 * Description: 重置刷新锁状态，用于测试隔离
 */
export function resetRefreshLock() {
  pendingRefreshPromise = null
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(REFRESH_LOCK_KEY)
    } catch {
      // 忽略错误
    }
  }
}
