'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Function: useFeatureFlag
 *
 * Description: 通过 API 获取功能开关状态的客户端 Hook
 *   在客户端组件中使用，调用 /api/v1/admin/feature-flags 获取开关状态
 *
 * Parameters:
 *     flagName(string): 功能开关名称
 *
 * Returns:
 *     isEnabled(boolean): 功能开关是否启用
 *     isLoading(boolean): 是否加载中
 *     error(Error | null): 错误信息
 *     refetch(() => void): 重新获取数据
 */
export function useFeatureFlag(flagName: string) {
  const queryClient = useQueryClient()

  const { data: isEnabled, isLoading, error } = useQuery({
    queryKey: ['feature-flag', flagName],
    queryFn: async () => {
      // 通过 API 获取所有功能开关状态
      const res = await fetch('/api/v1/admin/feature-flags', {
        credentials: 'include',
      })
      if (!res.ok) return false

      const json = (await res.json()) as ApiResponse<{ flags: Record<string, boolean> }>
      if (!json.success) return false

      return json.data.flags[flagName] ?? false
    },
    // 5 分钟内数据视为新鲜，减少 API 调用
    staleTime: 5 * 60 * 1000,
    // 10 分钟后垃圾回收
    gcTime: 10 * 60 * 1000,
  })

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['feature-flag', flagName] })
  }

  return {
    isEnabled: isEnabled ?? false,
    isLoading,
    error,
    refetch,
  }
}
