'use client'

import { createContext, ReactNode, useRef, useCallback, useMemo } from 'react'
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
 * 标签页唯一标识，用于跨标签页锁的 ownership 验证
 */
const TAB_ID = typeof crypto !== 'undefined' ? crypto.randomUUID() : 'ssr'

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
  ownerId: string
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
 * Description: 尝试获取跨标签页刷新锁
 *   使用「乐观写入 + 读回验证」策略解决 TOCTOU 竞态
 *
 * Returns:
 *     boolean: 成功获取锁返回 true
 */
function acquireLock(): boolean {
  if (typeof window === 'undefined') return false

  // 检查是否有有效锁
  try {
    const raw = window.localStorage.getItem(REFRESH_LOCK_KEY)
    if (raw) {
      const data: RefreshLockData = JSON.parse(raw)
      if (Date.now() - data.timestamp < REFRESH_LOCK_TIMEOUT) {
        // 如果锁是自己持有的（同标签页重入），允许
        return data.ownerId === TAB_ID
      }
    }
  } catch {
    // 损坏的数据，可以覆盖
  }

  // 乐观写入
  const lockData: RefreshLockData = { ownerId: TAB_ID, timestamp: Date.now() }
  window.localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lockData))

  // 读回验证：确保自己赢得了写入竞争
  try {
    const stored = JSON.parse(window.localStorage.getItem(REFRESH_LOCK_KEY)!)
    return stored.ownerId === TAB_ID
  } catch {
    return false
  }
}

/**
 * Function: releaseLock
 *
 * Description: 释放刷新锁（仅释放自己持有的锁）
 */
function releaseLock(): void {
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(REFRESH_LOCK_KEY)
    if (raw) {
      const data: RefreshLockData = JSON.parse(raw)
      // 只释放自己持有的锁，避免误删其他标签页的锁
      if (data.ownerId === TAB_ID) {
        window.localStorage.removeItem(REFRESH_LOCK_KEY)
      }
    }
  } catch {
    // 忽略错误
  }
}

/**
 * Function: waitForLockRelease
 *
 * Description: 等待跨标签页锁释放，使用 storage 事件 + 超时兜底
 */
async function waitForLockRelease(timeoutMs: number = REFRESH_LOCK_TIMEOUT): Promise<void> {
  if (typeof window === 'undefined') return

  return new Promise<void>((resolve) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === REFRESH_LOCK_KEY || e.key === null) {
        cleanup()
        resolve()
      }
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, timeoutMs)

    const cleanup = () => {
      window.removeEventListener('storage', onStorage)
      clearTimeout(timer)
    }

    window.addEventListener('storage', onStorage)
  })
}

// ==================== 测试专用：模块级刷新锁实现 ====================

/**
 * 单文件内的并发刷新 Promise（用于同标签页并发去重）
 */
let pendingRefreshPromise: Promise<boolean> | null = null

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
/** 空数组常量，避免 useMemo 中每次创建新引用 */
const EMPTY_ROLES: RoleDto[] = []
const EMPTY_GRANTS: GrantDto[] = []
const EMPTY_SESSIONS: Session[] = []

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
  const refreshSession = useCallback(async (): Promise<boolean> => {
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
  }, [refetch])

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
    onSuccess: async (data) => {
      // H-2 修复: MFA 分支不做缓存操作，用户尚未真正登录
      if (data?.data?.requiresMfa) {
        return
      }
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
    onSuccess: async (data) => {
      await refetchSessions()
    },
  })

  // H-1 修复: 使用 useMemo 稳定 contextValue，避免消费组件不必要的重渲染
  const contextValue = useMemo<AuthContextValue>(() => ({
    user: data?.user ?? null,
    roles: data?.roles ?? EMPTY_ROLES,
    grants: data?.grants ?? EMPTY_GRANTS,
    isAuthenticated: !!data?.user,
    isLoading: isLoading || isFetching,
    error: error as Error | null,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refreshSession,
    refetch: async () => {
      await refetch()
    },
    hasRole: (requiredRole: string) => {
      return (data?.roles ?? EMPTY_ROLES).some((role) => role.name === requiredRole)
    },
    // Session 管理
    sessions: sessionsData ?? EMPTY_SESSIONS,
    sessionsLoading,
    sessionsError: sessionsError as Error | null,
    revokeSession: revokeSessionMutation.mutateAsync,
    revokeOtherSessions: async () => {
      await refetchSessions()
    },
    refreshSessions: async () => {
      await refetchSessions()
    },
  }), [
    data, isLoading, isFetching, error,
    loginMutation.mutateAsync, logoutMutation.mutateAsync,
    refreshSession, refetch,
    sessionsData, sessionsLoading, sessionsError,
    revokeSessionMutation.mutateAsync, refetchSessions,
  ])

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
