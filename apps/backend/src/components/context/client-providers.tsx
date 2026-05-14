'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { AuthProvider, AuthContext } from '@/components/context/auth-context'
import { SiteConfigProvider } from '@/components/context/site-config-context'
import { AdminMediaAssetsProvider } from '@/components/context/admin-media-assets-context'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { getStatusByCode, type ApiErrorCode } from '@/contracts/api-response.schema'
import { ThemeProvider } from '@/components/providers/theme-provider'

/**
 * Function: AuthRefreshHandler
 *
 * Description: 处理认证相关错误的组件
 *              监听 QueryCache 事件，根据 error.code 执行不同策略：
 *              - MFA_REQUIRED → 跳转到 MFA 设置页 + 显示 toast
 *              - 401 (UNAUTHORIZED) → 尝试刷新会话，失败则跳转登录页
 *              - 403 (FORBIDDEN) → 跳转登录页
 *
 * Fix: 之前所有 403 都直接跳 /login，MFA_REQUIRED 也不例外。
 *      导致用户在后台启用了 MFA 策略但未完成个人 MFA 设置时，
 *      被「踢回」登录页而无任何提示。
 */
function AuthRefreshHandler({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const auth = React.useContext(AuthContext)


  // H-1 修复: 使用 ref 存储 auth，避免 useEffect 因 auth 引用变化而反复重订阅
  const authRef = React.useRef(auth)
  authRef.current = auth
  // 防止 MFA_REQUIRED 导致无限跳转循环
  // 场景：跳转到 /admin/mfa-setup 后，该页面的 layout 仍会加载 admin API，
  // 这些 API 继续返回 MFA_REQUIRED，如果不加 guard 会反复触发跳转。
  const mfaRedirectingRef = React.useRef(false)

  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') {
        const error = event.action.error as { code?: string; message?: string }

        // ==================== MFA_REQUIRED 特殊处理 ====================
        // 当后端检测到管理员角色需要 MFA 但用户未完成设置时，返回此错误。
        // 此时应引导用户去 MFA 设置页，而非踢回登录页。
        if (error.code === 'MFA_REQUIRED' && !mfaRedirectingRef.current) {
          // 标记正在跳转，防止后续的 MFA_REQUIRED 错误重复触发
          mfaRedirectingRef.current = true

          // 如果当前不在 MFA 设置页，才跳转
          if (!window.location.pathname.startsWith('/admin/mfa-setup')) {
            // 通过自定义事件触发 toast
            window.dispatchEvent(new CustomEvent('app:toast', {
              detail: {
                title: '需要设置多因素认证',
                description: error.message || '系统已启用多因素认证，请先完成 MFA 设置',
                variant: 'destructive',
              },
            }))

            // 延迟跳转，让用户看到 toast
            setTimeout(() => {
              window.location.href = '/admin/mfa-setup'
            }, 1500)
          }
          return
        }

        // 如果已经在跳转中，忽略所有其他错误
        if (mfaRedirectingRef.current) {
          return
        }

        if (error.code) {
          const status = getStatusByCode(error.code as ApiErrorCode)
          // 通过 ref 读取最新 auth，避免闭包捕获过期引用
          const currentAuth = authRef.current

          // ==================== 401 处理：尝试刷新会话 ====================
          if (status === 401 && currentAuth) {
            void (async () => {
              const ok = await currentAuth.refreshSession()
              if (ok) {
                await queryClient.invalidateQueries()
                await queryClient.refetchQueries({ type: 'active' })
                return
              }
              window.location.href = '/login'
            })()
            return
          }

          // ==================== 403 处理（非 MFA_REQUIRED）====================
          if (status === 403) {
            window.location.href = '/login'
          }
        }
      }
    })
    return () => unsubscribe()
  }, [queryClient])  // 移除 auth 依赖，仅依赖稳定的 queryClient

  return <>{children}</>
}

/**
 * Function: GlobalToastListener
 *
 * Description: 监听 window 上的 'app:toast' 自定义事件，允许在非组件上下文
 *              （如 QueryClient 的 onError 回调、useEffect 内部）触发 toast。
 *              必须放在 ToastProvider 内部。
 */
function GlobalToastListener() {
  const { toast } = useToast()

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ title: string; description?: string; variant?: string }>).detail
      toast({
        title: detail.title,
        description: detail.description,
        variant: (detail.variant === 'destructive' ? 'destructive' : 'default') as 'destructive' | 'default',
      })
    }
    window.addEventListener('app:toast', handler)
    return () => window.removeEventListener('app:toast', handler)
  }, [toast])

  return null
}

/**
 * Function: ClientProvider
 *
 * Description: 全局客户端状态提供者容器。
 *             集中管理所有 Context Provider (React Query, Auth, Admin, Toast 等)。
 *
 * Parameters:
 *    children(React.ReactNode): 子组件
 *
 * Returns:
 *    element(React.ReactElement): 聚合后的 Provider 组件
 */
export function ClientProvider({ children }: { children: React.ReactNode }) {
  // 创建 QueryClient 实例
  const [queryClient] = React.useState(() => new QueryClient({
    // Client 级别的默认配置
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          // 不要重试 401 和 403
          const err = error as { code?: string }
          if (err.code) {
            const status = getStatusByCode(err.code as ApiErrorCode)
            if (status === 401 || status === 403) return false
          }
          return failureCount < 3
        },
      },
      mutations: {
        // 统一处理 Mutation 错误
        // - MFA_REQUIRED → 跳转 MFA 设置页（同 AuthRefreshHandler 策略）
        // - 401 → 由 AuthRefreshHandler 通过 QueryCache 事件处理
        // - 403 → 跳转登录页
        onError: (error) => {
          const err = error as { code?: string; message?: string }
          if (err.code) {
            // MFA_REQUIRED 特殊处理：跳转到 MFA 设置页
            if (err.code === 'MFA_REQUIRED') {
              window.dispatchEvent(new CustomEvent('app:toast', {
                detail: {
                  title: '需要设置多因素认证',
                  description: err.message || '系统已启用多因素认证，请先完成 MFA 设置',
                  variant: 'destructive',
                },
              }))
              setTimeout(() => {
                window.location.href = '/admin/mfa-setup'
              }, 1500)
              return
            }

            const status = getStatusByCode(err.code as ApiErrorCode)
            if (status === 401) {
              // 注意：这里无法直接访问 auth context
              // 因为 mutation 回调是在组件外部执行的
              // 刷新逻辑由 AuthRefreshHandler 通过 QueryCache 事件处理
              return
            }

            if (status === 403) {
              window.location.href = '/login'
            }
          }
        },
      },
    },
  }))

  return (
    // Provider: ThemeProvider
    // Description: 主题切换支持 (亮色/暗色模式)
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      {/* Provider: QueryClientProvider */}
      <QueryClientProvider client={queryClient}>

        {/* Provider: AuthProvider
          Description: 认证上下文（登录态/刷新会话等）。
          说明：下方的 AuthRefreshHandler 依赖 AuthContext，因此必须放在 AuthProvider 内。
        */}
        <AuthProvider>
          {/* Provider: AuthRefreshHandler
            Description: 监听 React Query 的错误事件，当出现 401 时尝试自动刷新会话。
            说明：该组件依赖 QueryClientProvider + AuthProvider。
          */}
          <AuthRefreshHandler>
            {/* Provider: AdminProvider
              Description: 管理后台全局上下文（例如站点配置 /admin/site-config）。
              说明：仅在管理后台页面会被真正消费，但放在全局不产生额外请求以外的副作用（按需缓存）。
            */}
            <SiteConfigProvider>
              {/* Provider: AdminMediaAssetsProvider
                Description: 后台媒体资产领域 Provider。
                - 统一媒体相关缓存 key（['admin','media-assets', ...]）
                - 提供 upload/delete/refresh 能力（包含上传进度回调）
                说明：本 Provider 不默认拉取列表，只有相关组件调用 query hook 时才会发起请求。
              */}
              <AdminMediaAssetsProvider>
                {/* Provider: ToastProvider
                  Description: 全局提示（toast）容器。
                  支持 programmatic toast：通过 window.dispatchEvent(new CustomEvent('app:toast', {...}))
                  在非组件上下文（如 QueryClient onError）中触发 toast。
                */}
              <ToastProvider>
                <GlobalToastListener />
                {children}
              </ToastProvider>
              </AdminMediaAssetsProvider>
            </SiteConfigProvider>
          </AuthRefreshHandler>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
