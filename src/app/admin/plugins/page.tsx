'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ShoppingBag, TrendingUp, Info } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { PLUGIN_DEFINITIONS } from '@/plugins/plugin-definitions'

interface PluginInfo {
  name: string
  label: string
  description: string
  icon: string
  installed: boolean
  active: boolean
}

export default function AdminPluginsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: plugins } = useQuery<PluginInfo[]>({
    queryKey: ['admin', 'plugins'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/plugins', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{
        plugins: PluginInfo[]
      }>
      if (!json.success) throw new Error(json.error.message)
      return json.data.plugins
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ name, active }: { name: string; active: boolean }) => {
      const res = await fetch(`/api/v1/admin/plugins/${name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active }),
      })
      if (!res.ok) throw new Error(`Failed to toggle: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plugins'] })
    },
    onError: (error: Error) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    },
  })

  const handleToggle = (name: string, active: boolean) => {
    toggleMutation.mutate({ name, active })
  }

  return (
    <AdminPageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plugins?.map((plugin) => {
          const iconComponent = PLUGIN_DEFINITIONS[plugin.name as keyof typeof PLUGIN_DEFINITIONS]?.icon
          const staticIconMap = {
            MessageCircle,
            ShoppingBag,
            TrendingUp,
            Info,
          }
          const IconComponent = iconComponent ? staticIconMap[iconComponent as keyof typeof staticIconMap] || null : null
          
          const isSubmitting = toggleMutation.isPending

          return (
            <Card
              key={plugin.name}
              className={cn(
                'bg-card/20 backdrop-blur-xl border border-border/10 shadow-xl transition-all',
                plugin.active && 'border-primary/30'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        plugin.active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {IconComponent ? <IconComponent className="h-5 w-5" /> : 
                       <div className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {plugin.label}
                        {plugin.active && (
                          <Badge variant="default">
                            已激活
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{plugin.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {plugin.installed ? (plugin.active ? '已激活' : '已停用') : '未安装'}
                  </span>
                  <Switch
                    checked={plugin.active}
                    onCheckedChange={(checked) => handleToggle(plugin.name, checked)}
                    disabled={!plugin.installed || isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/20 bg-card/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-info/20 text-info">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-info">说明</h4>
              <p className="text-sm text-muted-foreground mt-1">
                安装状态由环境变量决定（编译时生效），激活状态由数据库决定（运行时生效）。
                未安装的插件无法激活，已安装的插件可以随时切换激活状态。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}
