'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SiteConfig } from '@/contracts/dtos/admin/site-config.dto'
import { SiteConfigSchema } from '@/contracts/dtos/admin/site-config.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Type: SiteConfigContext
 *
 * Description: SiteConfig Context 数据结构
 */
export interface SiteConfigContext {
  /**
   * 站点配置数据
   */
  siteConfig: SiteConfig | null
  /**
   * 是否正在加载
   */
  isLoading: boolean
  /**
   * 错误信息
   */
  error: Error | null
  /**
   * 重新获取数据
   */
  refetch: () => Promise<void>
  /**
   * 更新站点配置缓存（保存成功后立即更新，无需等待网络请求）
   */
  setSiteConfig: (config: SiteConfig) => void
}

export const SiteConfigContext = createContext<SiteConfigContext | undefined>(undefined)

/**
 * Type: AdminProviderProps
 *
 * Description: AdminProvider 组件属性
 *
 * Properties:
 *     children(ReactNode): 子组件
 */
interface SiteConfigProviderProps {
  children: ReactNode
}

/**
 * Function: fetchSiteConfig
 *
 * Description: 获取站点配置信息
 *
 * Returns:
 *     SiteConfig | null: 站点配置数据，如果没有配置则返回 null
 *
 * Throws:
 *     Error: 当请求失败或响应格式不正确时抛出错误
 */
async function fetchSiteConfig(): Promise<SiteConfig | null> {
  const res = await fetch('/api/v1/admin/site-config', {
    method: 'GET',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`获取站点配置失败: ${res.status}`)
  }

  const json = await res.json() as ApiResponse<unknown>

  if (!json.success) {
    throw new Error(json.error.message || '获取站点配置失败')
  }

  // 处理 null 响应（当数据库中没有配置时）
  if (json.data === null) {
    return null
  }

  const parsed = SiteConfigSchema.safeParse(json.data)

  if (!parsed.success) {
    throw new Error('站点配置数据格式不符合预期')
  }

  return parsed.data
}

/**
 * Function: SiteConfigProvider
 *
 * Description: 管理后台上下文提供者组件，自动获取并管理站点配置状态
 *
 * Parameters:
 *     props(SiteConfigProviderProps): 组件属性
 *
 * Returns:
 *     React.ReactElement: SiteConfigProvider 组件
 *
 * Features:
 *     - 使用 TanStack Query 管理数据获取和缓存
 *     - 自动调用 /api/v1/admin/site-config 获取站点配置
 *     - 提供站点配置数据、refetch 方法和 setSiteConfig 方法
 *     - 正确处理没有配置数据的情况（返回 null）
 *     - setSiteConfig 可以在保存后立即更新缓存，无需等待网络请求
 */
export function SiteConfigProvider({ children }: SiteConfigProviderProps) {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SiteConfig | null>({
    queryKey: ['admin', 'site-config'],
    queryFn: fetchSiteConfig,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分钟
  })

  /**
   * Function: setSiteConfig
   *
   * Description: 立即更新站点配置缓存
   *
   * Parameters:
   *     config(SiteConfig): 新的站点配置数据
   *
   * Returns:
   *     void
   */
  const setSiteConfig = (config: SiteConfig) => {
    // 立即更新 Query Cache
    queryClient.setQueryData<SiteConfig | null>(['admin', 'site-config'], config)
  }

  const contextValue: SiteConfigContext = {
    siteConfig: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch()
    },
    setSiteConfig,
  }

  return (
    <SiteConfigContext.Provider value={contextValue}>
      {children}
    </SiteConfigContext.Provider>
  )
}

/**
 * Function: useSiteConfigContext
 *
 * Description: 获取 SiteConfig Context 的 Hook
 *
 * Returns:
 *     SiteConfigContext: SiteConfig Context 数据
 *
 * Throws:
 *     Error: 当在 Provider 外部使用时抛出错误
 */
export function useSiteConfigContext(): SiteConfigContext {
  const context = useContext(SiteConfigContext)

  if (context === undefined) {
    throw new Error('useSiteConfigContext 必须在 SiteConfigProvider 内部使用')
  }

  return context
}
