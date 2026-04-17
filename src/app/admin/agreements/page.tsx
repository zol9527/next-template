'use client'

/**
 * 协议管理页面
 */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Pencil, Eye, Power, Sparkles } from 'lucide-react'
import { AdminAgreementForm } from '@/components/business/admin/agreement/admin-agreement-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Agreement, AgreementType } from '@/contracts/dtos/admin/site-config.dto'
import { AgreementListResponseSchema } from '@/contracts/dtos/admin/site-config.dto'
import { cn } from '@/lib/utils'

const agreementTypes: { type: AgreementType; title: string; description: string; icon: React.ReactNode }[] = [
  { type: 'USER_AGREEMENT', title: '用户协议', description: '用户注册和使用协议', icon: <FileText className="h-5 w-5" /> },
  { type: 'PRIVACY_POLICY', title: '隐私政策', description: '用户隐私保护政策', icon: <FileText className="h-5 w-5" /> },
  { type: 'ABOUT_US', title: '关于我们', description: '平台介绍和联系方式', icon: <FileText className="h-5 w-5" /> },
]

export default function AdminAgreementsPage() {
  const queryClient = useQueryClient()

  const [selectedType, setSelectedType] = React.useState<AgreementType | null>(null)
  const [viewMode, setViewMode] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // 获取所有协议
  const { data: agreements, isLoading } = useQuery<Agreement[]>({
    queryKey: ['admin', 'agreements'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/agreements', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{
        items: Agreement[]
      }>
      if (!json.success) throw new Error(json.error.message)

      // 验证响应数据
      const parsed = AgreementListResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('Invalid response data')
      }

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

  const handleView = (type: AgreementType) => {
    setSelectedType(type)
    setViewMode(true)
    setDialogOpen(true)
  }

  return (
    <>
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
        {/* <div className="bg-linear-to-br from-primary/30 via-primary/20 to-primary/10 text-primary p-3 rounded-xl shadow-lg shadow-primary/20 ring-1 ring-primary/30">
          <FileText className="h-6 w-6" />
        </div> */}
        <div>
          {/* <h1 className="text-2xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            协议管理
          </h1> */}
          <p className="text-sm text-muted-foreground">管理用户协议、隐私政策和关于我们</p>
        </div>
      </div>

      {/* 协议卡片网格 */}
      <div className="grid grid-cols-3 gap-6">
        {agreementTypes.map((config, index) => {
          const agreement = agreementsMap.get(config.type)
          return (
            <Card
              key={config.type}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
              className={cn(
                "group relative overflow-hidden backdrop-blur-xl border shadow-lg transition-all duration-300",
                // 基础样式 - 深色主题优化
                "bg-linear-to-br from-card via-card to-card/95",
                "border-border/20",
                // Hover 效果
                "hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/40",
                // 动画
                "animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards"
              )}
            >
              {/* 装饰性背景渐变 */}
              <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* 顶部光晕效果 */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      agreement?.isActive
                        ? "bg-success/20 text-success shadow-lg shadow-success/20 ring-1 ring-success/30"
                        : "bg-muted/50 text-muted-foreground ring-1 ring-border/20"
                    )}>
                      {agreement?.isActive ? <Power className="h-5 w-5" /> : config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">{config.title}</CardTitle>
                      <CardDescription className="mt-1 text-muted-foreground/80">{config.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={agreement?.isActive ? 'default' : 'secondary'}
                    className={cn(
                      "transition-all duration-300 font-medium px-3 py-1",
                      agreement?.isActive
                        ? "bg-success/20 text-success border-success/40 shadow-sm shadow-success/10 hover:bg-success/30"
                        : "bg-muted/40 text-muted-foreground border-border/20"
                    )}
                  >
                    {agreement?.isActive ? '已启用' : '已禁用'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="relative">
                {isLoading ? (
                  // 骨架屏加载状态
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-20 bg-muted/30" />
                    <Skeleton className="h-4 w-32 bg-muted/30" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 flex-1 bg-muted/30" />
                      <Skeleton className="h-9 flex-1 bg-muted/30" />
                    </div>
                  </div>
                ) : agreement ? (
                  <div className="space-y-4">
                    {/* 协议信息 */}
                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/10">
                        <span className="text-muted-foreground font-medium">版本号</span>
                        <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 border-border/30 bg-muted/30">
                          v{agreement.version}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/10">
                        <span className="text-muted-foreground font-medium">生效时间</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(agreement.effectiveAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 transition-all duration-200 hover:bg-muted/30 hover:border-border/40"
                        onClick={() => handleView(config.type)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        查看
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 transition-all duration-200 hover:bg-primary/90 shadow-md shadow-primary/20"
                        onClick={() => handleEdit(config.type)}
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        编辑
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 空状态 - 创建协议
                  <Button
                    variant="outline"
                    size="lg"
                    className={cn(
                      "w-full h-24 border-dashed border-2 transition-all duration-300",
                      "border-border/30 hover:border-primary/50 hover:bg-primary/5",
                      "group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-primary/10"
                    )}
                    onClick={() => handleEdit(config.type)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted/20 group-hover:bg-primary/10 transition-colors">
                        <Sparkles className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                        创建协议
                      </span>
                    </div>
                  </Button>
                )}
              </CardContent>

              {/* 状态指示条 */}
              {agreement && (
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 transition-all duration-300",
                  agreement.isActive
                    ? "bg-linear-to-r from-success/60 via-success/40 to-success/60"
                    : "bg-muted/30"
                )} />
              )}

              {/* 边框光晕 */}
              <div className="absolute inset-0 rounded-in border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </Card>
          )
        })}
      </div>

      {/* 编辑对话框 */}
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
