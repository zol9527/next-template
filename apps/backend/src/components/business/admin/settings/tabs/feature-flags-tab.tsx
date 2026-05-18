'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Shield, CreditCard, Bell, TrendingUp, Ticket, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'

interface FeatureFlagConfig {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  iconColor: string
}

const featureFlagsConfig: FeatureFlagConfig[] = [
  { key: 'maintenance_mode', label: '全站维护模式', description: '开启后，普通用户将无法访问系统', icon: <Shield className="size-5" />, iconColor: '#CF2D56' },
  { key: 'payment_enabled', label: '支付功能', description: '关闭后，用户将无法进行支付操作', icon: <CreditCard className="size-5" />, iconColor: '#1F8A65' },
  { key: 'announcement_enabled', label: '公告功能', description: '关闭后，小程序端将不显示公告', icon: <Bell className="size-5" />, iconColor: '#F54E00' },
  { key: 'promotion_enabled', label: '推广功能', description: '关闭后，推广中心和分销功能将不可用', icon: <TrendingUp className="size-5" />, iconColor: '#8B6F47' },
  { key: 'coupon_enabled', label: '优惠券功能', description: '关闭后，用户将无法使用优惠券', icon: <Ticket className="size-5" />, iconColor: '#C08532' },
]

/** 白名单校验，防止路径注入 */
const VALID_FLAG_KEYS = new Set(featureFlagsConfig.map((c) => c.key))

export function FeatureFlagsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: flags } = useQuery<Record<string, boolean>>({
    queryKey: ['admin', 'feature-flags'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/feature-flags', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{ flags: Record<string, boolean> }>
      if (!json.success) throw new Error(json.error.message)
      return json.data.flags
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      if (!VALID_FLAG_KEYS.has(key)) throw new Error(`Invalid flag key: ${key}`)
      const res = await fetch(`/api/v1/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error(`Failed to toggle: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
    onError: (error: Error) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleToggle = (key: string, enabled: boolean) => {
    toggleMutation.mutate({ key, enabled })
  }

  /** 当前正在切换的 key，仅禁用对应的 Switch */
  const pendingKey = toggleMutation.isPending ? toggleMutation.variables?.key : null

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 警告横幅 */}
      <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--warning)]/10 border border-[var(--warning)]/20">
        <AlertTriangle className="size-5 text-[var(--warning)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--fg-secondary)]">
          功能开关变更会即时生效，请谨慎操作。建议在维护模式下进行关键功能的切换。
        </p>
      </div>

      {/* 开关卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featureFlagsConfig.map((config, index) => {
          const enabled = flags?.[config.key] ?? false
          const isThisPending = pendingKey === config.key
          return (
            <div
              key={config.key}
              className={cn(
                'p-5 bg-[var(--surface)] rounded-[var(--radius-md)]',
                'border border-[var(--border)]/10 shadow-[var(--shadow-card)]',
                'hover:shadow-[var(--shadow-hover)] transition-all duration-200',
                enabled && 'border-[var(--ds-accent)]/20',
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center size-10 rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: `${config.iconColor}15`, color: config.iconColor }}
                >
                  {config.icon}
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(config.key, checked)}
                  disabled={isThisPending}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--fg)]">{config.label}</h4>
                  {enabled && (
                    <Badge className="text-[10px] bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30 px-1.5 py-0">
                      已开启
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--fg-muted)] mt-1">{config.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
