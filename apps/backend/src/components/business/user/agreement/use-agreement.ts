'use client'

import { useQuery } from '@tanstack/react-query'
import type { Agreement } from '@/contracts/dtos/admin/site-config.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

const typeLabels: Record<string, string> = {
  USER_AGREEMENT: '用户协议',
  PRIVACY_POLICY: '隐私政策',
  ABOUT_US: '关于我们',
}

/**
 * Function: useAgreement
 *
 * Description: 获取协议数据的自定义 Hook
 *
 * Parameters:
 *     type(string): 协议类型 (USER_AGREEMENT, PRIVACY_POLICY, ABOUT_US)
 *
 * Returns:
 *     object(QueryObserverResult): TanStack Query 结果对象
 */
export function useAgreement(type: string) {
  return useQuery<Agreement>({
    queryKey: ['public', 'agreements', type],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/agreements/by-type/${type}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<Agreement>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    retry: 1,
  })
}

export { typeLabels }
