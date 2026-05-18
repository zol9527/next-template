'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Pencil, Sparkles } from 'lucide-react'
import { AdminAgreementForm } from '@/components/business/admin/agreement/admin-agreement-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Agreement, AgreementType } from '@/contracts/dtos/admin/site-config.dto'
import { AgreementListResponseSchema } from '@/contracts/dtos/admin/site-config.dto'
import { cn } from '@/lib/utils'

const agreementTypes: { type: AgreementType; title: string; description: string; iconColor: string }[] = [
  { type: 'USER_AGREEMENT', title: '用户协议', description: '用户注册时需要同意的服务条款', iconColor: '#F54E00' },
  { type: 'PRIVACY_POLICY', title: '隐私政策', description: '数据收集、使用与保护声明', iconColor: '#1F8A65' },
  { type: 'ABOUT_US', title: '关于我们', description: '平台介绍与关于页面内容', iconColor: '#C08532' },
]

export function AgreementTab() {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = React.useState<AgreementType | null>(null)
  const [viewMode, setViewMode] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const { data: agreements, isLoading } = useQuery<Agreement[]>({
    queryKey: ['admin', 'agreements'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/agreements', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{ items: Agreement[] }>
      if (!json.success) throw new Error(json.error.message)
      const parsed = AgreementListResponseSchema.safeParse(json.data)
      if (!parsed.success) throw new Error('Invalid response data')
      return parsed.data.items
    },
  })

  const agreementsMap = React.useMemo(() => {
    const map = new Map<AgreementType, Agreement>()
    agreements?.forEach((a) => map.set(a.type, a))
    return map
  }, [agreements])

  const handleEdit = (type: AgreementType) => {
    setSelectedType(type)
    setViewMode(false)
    setDialogOpen(true)
  }

  // 加载状态：统一在 map 外部渲染 skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {agreementTypes.map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-md)]" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 animate-in fade-in duration-300">
        {agreementTypes.map((config, index) => {
          const agreement = agreementsMap.get(config.type)
          return (
            <div
              key={config.type}
              className={cn(
                'flex items-center justify-between p-4 bg-[var(--surface)] rounded-[var(--radius-md)]',
                'border border-[var(--border)]/10 shadow-[var(--shadow-card)]',
                'hover:shadow-[var(--shadow-hover)] transition-all duration-200',
              )}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* 左侧: 图标 + 标题 + 描述 */}
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center size-11 rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: `${config.iconColor}15`, color: config.iconColor }}
                >
                  <FileText className="size-5" />
                </div>
                <div>
                  <h4 className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[var(--fg)]">
                    {config.title}
                  </h4>
                  <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">{config.description}</p>
                </div>
              </div>

              {/* 右侧: 版本号 + 生效日期 + 状态 + 编辑按钮 */}
              {agreement ? (
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="font-[family-name:var(--font-mono)] text-xs px-2 py-0.5">
                    v{agreement.version}
                  </Badge>
                  <span className="text-xs text-[var(--fg-muted)]">
                    {new Date(agreement.effectiveAt).toLocaleDateString('zh-CN')}
                  </span>
                  {agreement.isActive && (
                    <Badge className="bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30 text-xs">
                      <span className="size-1.5 rounded-full bg-[var(--success)] mr-1.5" />
                      已启用
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(config.type)}>
                    <Pencil className="size-3.5 mr-1" />
                    编辑
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEdit(config.type)}>
                  <Sparkles className="size-3.5 mr-1" />
                  创建
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* 编辑/查看 Dialog */}
      {selectedType && (
        <AdminAgreementForm
          agreementType={selectedType}
          mode={viewMode ? 'view' : 'edit'}
          open={dialogOpen}
          onSaved={() => {
            setDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['admin', 'agreements'] })
          }}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </>
  )
}
