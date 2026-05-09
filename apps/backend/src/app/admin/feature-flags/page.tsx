'use client'

/**
 * 功能开关管理页面
 */

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Shield, CreditCard, Bell, TrendingUp, Ticket } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'

interface FeatureFlag {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  variant: 'default' | 'destructive' | 'warning' | 'success'
}

const featureFlagsConfig: FeatureFlag[] = [
  {
    key: 'maintenance_mode',
    label: '全站维护模式',
    description: '开启后，普通用户将无法访问系统（管理员不受影响）',
    icon: <Shield className="h-5 w-5" />,
    variant: 'destructive',
  },
  {
    key: 'payment_enabled',
    label: '支付功能',
    description: '关闭后，用户将无法进行支付操作',
    icon: <CreditCard className="h-5 w-5" />,
    variant: 'default',
  },
  {
    key: 'announcement_enabled',
    label: '公告功能',
    description: '关闭后，小程序端将不显示公告',
    icon: <Bell className="h-5 w-5" />,
    variant: 'default',
  },
  {
    key: 'promotion_enabled',
    label: '推广功能',
    description: '关闭后，推广中心和分销功能将不可用',
    icon: <TrendingUp className="h-5 w-5" />,
    variant: 'default',
  },
  {
    key: 'coupon_enabled',
    label: '优惠券功能',
    description: '关闭后，用户将无法使用优惠券',
    icon: <Ticket className="h-5 w-5" />,
    variant: 'default',
  },
]

export default function AdminFeatureFlagsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 获取所有功能开关
  const { data: flags } = useQuery<Record<string, boolean>>({
    queryKey: ['admin', 'feature-flags'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/feature-flags', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{
        flags: Record<string, boolean>
      }>
      if (!json.success) throw new Error(json.error.message)
      return json.data.flags
    },
  })

  // 切换开关 Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/admin/feature-flags/${key}`, {
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

  return (
    <AdminPageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureFlagsConfig.map((config) => {
          const enabled = flags?.[config.key] ?? false
          const isSubmitting = toggleMutation.isPending

          return (
            <Card
              key={config.key}
              className={cn(
                'bg-card/20 backdrop-blur-xl border border-border/10 shadow-xl transition-all',
                enabled && 'border-primary/30'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {config.label}
                        {enabled && (
                          <Badge variant={config.variant === 'destructive' ? 'destructive' : 'default'}>
                            已启用
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{config.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {enabled ? '已开启' : '已关闭'}
                  </span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggle(config.key, checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 警告提示 */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">操作警告</h4>
              <p className="text-sm text-muted-foreground mt-1">
                功能开关的更改会立即生效，可能会影响用户体验。请在充分测试后进行操作，特别是全站维护模式和支付功能。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
