'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicConfigResponseSchema } from '@/contracts/dtos/public/site-config.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

interface PublicIcpFilingProps {
  className?: string
}

async function fetchPublicIcpFiling(): Promise<string | null> {
  const res = await fetch('/api/v1/public/config', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  })

  if (!res.ok) return null

  const json = await res.json() as ApiResponse<unknown>
  if (!json.success) return null

  const parsed = PublicConfigResponseSchema.safeParse(json.data)
  if (!parsed.success) return null

  return parsed.data.siteConfig.icpFiling ?? null
}

export function PublicIcpFiling({ className }: PublicIcpFilingProps) {
  const { data } = useQuery({
    queryKey: ['public', 'icp-filing'],
    queryFn: fetchPublicIcpFiling,
    staleTime: 10 * 60 * 1000,
  })

  if (!data) return null

  return (
    <div className={className}>
      <span>{data}</span>
      <span className="mx-2">|</span>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-4 hover:underline"
      >
        工信部备案查询
      </a>
    </div>
  )
}
