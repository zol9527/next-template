'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Loader2, Save } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { MfaGlobalSettingsDto } from '@/contracts/dtos/admin/mfa-settings.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Type: MfaGlobalSettingsCardProps
 *
 * Description: MFA 全局设置卡片组件属性
 *
 * Properties:
 *     settings(MfaGlobalSettingsDto): 全局 MFA 设置数据
 */
export interface MfaGlobalSettingsCardProps {
  settings: MfaGlobalSettingsDto
}

/**
 * Function: MfaGlobalSettingsCard
 *
 * Description: MFA 全局设置卡片组件，负责显示和更新全局 MFA 配置
 *
 * Parameters:
 *     props(MfaGlobalSettingsCardProps): 组件属性
 *
 * Returns:
 *     component(React.ReactElement): 全局设置卡片组件
 */
export function MfaGlobalSettingsCard({ settings }: MfaGlobalSettingsCardProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 本地状态
  const [mode, setMode] = React.useState<'disabled' | 'optional' | 'required'>(settings.mode)
  const [allowExemptions, setAllowExemptions] = React.useState(settings.allowExemptions)
  const [hasChanges, setHasChanges] = React.useState(false)

  // 同步外部数据变化
  React.useEffect(() => {
    setMode(settings.mode)
    setAllowExemptions(settings.allowExemptions)
    setHasChanges(false)
  }, [settings])

  // 检查是否有变更
  React.useEffect(() => {
    const changed = mode !== settings.mode || allowExemptions !== settings.allowExemptions
    setHasChanges(changed)
  }, [mode, allowExemptions, settings])

  // 更新全局设置 Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { mode: typeof mode; allowExemptions: boolean }) => {
      const res = await fetch('/api/v1/admin/mfa/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const json = (await res.json()) as ApiResponse<MfaGlobalSettingsDto>
      if (!res.ok || !json.success) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      return json.data
    },
    onSuccess: (data) => {
      // 更新本地状态
      setMode(data.mode)
      setAllowExemptions(data.allowExemptions)
      setHasChanges(false)

      // 失效 React Query 缓存，确保刷新后获取最新数据
      queryClient.invalidateQueries({ queryKey: ['admin', 'mfa', 'settings'] })

      toast({
        title: '保存成功',
        description: '全局 MFA 设置已更新',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 处理保存
  const handleSave = () => {
    updateMutation.mutate({ mode, allowExemptions })
  }

  // MFA 模式选项配置
  const modeOptions = [
    {
      value: 'disabled' as const,
      label: '禁用',
      description: '完全关闭多因素认证功能',
      color: 'text-destructive',
    },
    {
      value: 'optional' as const,
      label: '可选',
      description: '用户可自行选择是否启用 MFA',
      color: 'text-warning',
    },
    {
      value: 'required' as const,
      label: '强制',
      description: '所有管理员必须启用 MFA',
      color: 'text-success',
    },
  ]

  return (
    <Card data-testid="global-mfa-settings" className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* 增强的卡片头部 - 添加渐变背景 */}
      <div className="relative overflow-hidden bg-gradient-to-r from-info/5 via-primary/5 to-primary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="flex items-center gap-2.5 text-xl">
                <div className="rounded-lg bg-gradient-to-br from-info to-primary p-1.5 shadow-lg">
                  <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                全局 MFA 设置
              </CardTitle>
              <CardDescription className="text-sm text-foreground/70 max-w-2xl">
                配置整个管理后台的多因素认证策略，控制所有管理员用户的 MFA 要求
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              size="sm"
              className={cn(
                'gap-2 shadow-md transition-all duration-200 flex-shrink-0',
                hasChanges && 'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105'
              )}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存更改
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </div>

      <CardContent className="space-y-8 p-8">
        {/* MFA 模式选择 - 增强间距和视觉层次 */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-info to-primary"></span>
              MFA 模式
            </Label>
            <p className="text-xs text-foreground/50 pl-3">
              选择适合您组织安全需求的多因素认证策略
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                disabled={updateMutation.isPending}
                className={cn(
                  'relative p-5 rounded-xl border-2 transition-all duration-200 text-left group',
                  'hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg',
                  mode === option.value
                    ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/10'
                    : 'border-border/10 bg-muted/5 hover:border-border/30 hover:bg-muted/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className={cn('font-semibold text-sm', option.color)}>
                      {option.label}
                    </div>
                    <div className="text-xs text-foreground/50 leading-relaxed">
                      {option.description}
                    </div>
                  </div>
                  {/* 选中指示器 - 增强动画 */}
                  {mode === option.value && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-200">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 允许豁免开关 - 增强间距和视觉 */}
        <div className="flex items-center justify-between p-5 rounded-xl border border-border/10 bg-gradient-to-r from-muted/5 to-muted/10 hover:from-muted/10 hover:to-muted/15 transition-colors">
          <div className="space-y-1.5">
            <Label htmlFor="allow-exemptions" className="text-sm font-bold text-foreground/80 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-info to-primary"></span>
              允许管理员豁免
            </Label>
            <p className="text-xs text-foreground/50 pl-3 leading-relaxed">
              开启后，可以为特定管理员用户豁免 MFA 要求（需在&quot;豁免用户&quot;标签页中配置）
            </p>
          </div>
          <Switch
            id="allow-exemptions"
            data-testid="allow-exemptions"
            checked={allowExemptions}
            onCheckedChange={setAllowExemptions}
            disabled={updateMutation.isPending}
            color="primary"
          />
        </div>

        {/* 最后更新时间 - 移到更合适的位置 */}
        {settings.updatedAt && (
          <div className="pt-4 border-t border-border/10">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse"></span>
              最后更新：{new Date(settings.updatedAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
