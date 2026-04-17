'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { AuthProvider, AuthContext } from '@/components/context/auth-context'
import { SiteConfigProvider } from '@/components/context/site-config-context'
import { AdminMediaAssetsProvider } from '@/components/context/admin-media-assets-context'
import { ToastProvider } from '@/components/ui/toast'
import { getStatusByCode, type ApiErrorCode } from '@/contracts/api-response.schema'
import { ThemeProvider } from '@/components/providers/theme-provider'

/**
 * Function: AuthRefreshHandler
 *
 * Description: 处理 401 错误时自动刷新认证的组件
 *              监听 QueryCache 事件，当检测到 401 时触发刷新
 */
function AuthRefreshHandler({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const auth = React.useContext(AuthContext)

  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') {
        const error = event.action.error as { code?: string }
        if (error.code) {
          const status = getStatusByCode(error.code as ApiErrorCode)
          if (status === 401 && auth) {
            void (async () => {
              const ok = await auth.refreshSession()
              if (ok) {
                await queryClient.invalidateQueries()
                await queryClient.refetchQueries({ type: 'active' })
                return
              }
              window.location.href = '/login'
            })()
            return
          }

          if (status === 403) {
            window.location.href = '/login'
          }
        }
      }
    })
    return () => unsubscribe()
  }, [queryClient, auth])

  return <>{children}</>
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
        // 如果是 401 则尝试刷新会话， 如果是 403 则跳转到首页
        onError: (error) => {
          const err = error as { code?: string }
          if (err.code) {
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
                */}
              <ToastProvider>
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
