'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicConfigResponseSchema } from '@/contracts/dtos/public/site-config.dto'
import type { PublicSiteConfig } from '@/contracts/dtos/public/site-config.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * 获取公开站点配置数据
 *
 * 调用 GET /api/v1/public/config 接口，解析并返回 siteConfig 部分。
 * 使用 TanStack Query 缓存 10 分钟。
 */
async function fetchPublicSiteConfig(): Promise<PublicSiteConfig | null> {
  const res = await fetch('/api/v1/public/config', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  })

  if (!res.ok) return null

  const json = (await res.json()) as ApiResponse<unknown>
  if (!json.success) return null

  const parsed = PublicConfigResponseSchema.safeParse(json.data)
  if (!parsed.success) return null

  return parsed.data.siteConfig ?? null
}

/**
 * Hook: usePublicSiteConfig
 *
 * 在 Landing Page 等公开页面中获取站点配置（品牌名称、Logo、联系方式、备案号等）。
 *
 * @returns {object} data - 站点配置数据（可能为 null）
 * @returns {boolean} isLoading - 是否正在加载
 */
export function usePublicSiteConfig() {
  const { data, isLoading } = useQuery<PublicSiteConfig | null>({
    queryKey: ['public', 'site-config'],
    queryFn: fetchPublicSiteConfig,
    staleTime: 10 * 60 * 1000, // 10 分钟缓存
  })

  return {
    siteConfig: data ?? null,
    isLoading,
  }
}
