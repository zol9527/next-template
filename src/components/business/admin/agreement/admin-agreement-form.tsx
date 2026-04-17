'use client'

import * as React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AdminTabs, AdminTabsList, AdminTabsTrigger } from '@/components/ui/admin-tabs'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { RichTextEditor } from '@/components/business/admin/rich-text-editor'
import { FormDatePicker } from '@/components/ui/form-date-picker'
import { useToast } from '@/components/ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, FileText, CheckCircle2, Power, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Agreement, AgreementType } from '@/contracts/dtos/admin/site-config.dto'
import { UpsertAgreementRequestSchema } from '@/contracts/dtos/admin/site-config.dto'

const formSchema = z.object({
  title: z.string().min(1, '协议标题不能为空'),
  content: z.string().min(1, '协议内容不能为空'),
  version: z.string().min(1, '版本号不能为空'),
  isActive: z.boolean(),
  effectiveAt: z.string().optional(),
})

interface AdminAgreementFormProps {
  agreementId?: string
  agreementType?: AgreementType
  mode: 'edit' | 'view'
  open?: boolean
  onSaved: () => void
  onCancel: () => void
}

const typeLabels: Record<AgreementType, string> = {
  USER_AGREEMENT: '用户协议',
  PRIVACY_POLICY: '隐私政策',
  ABOUT_US: '关于我们',
}

/**
 * Function: AdminAgreementForm
 *
 * Description: 协议编辑对话框组件，支持标签页分组、草稿保存、未保存提醒
 *
 * Parameters:
 *     props(AdminAgreementFormProps): 组件属性
 *
 * Returns:
 *     component(JSX.Element): 对话框组件
 */
export function AdminAgreementForm({
  agreementId,
  agreementType,
  mode,
  open = true,
  onSaved,
  onCancel,
}: AdminAgreementFormProps) {
  const { toast } = useToast()
  const viewing = mode === 'view'

  // 标签页状态
  const [activeTab, setActiveTab] = React.useState<'basic' | 'content'>('basic')

  // 优先使用 agreementType，回退到 agreementId
  const apiUrl = agreementType
    ? `/api/v1/admin/agreements/by-type/${agreementType}`
    : `/api/v1/admin/agreements/${agreementId}`

  // 确定唯一的标识符用于 query key 和草稿缓存
  const identifier = agreementType || agreementId
  const cacheKey = `agreement_draft_${identifier}`

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      version: '1.0.0',
      isActive: true,
      effectiveAt: undefined,
    },
  })

  // 获取协议数据
  const { data: agreementData, isLoading } = useQuery<Agreement | null>({
    queryKey: ['admin', 'agreements', identifier],
    queryFn: async () => {
      const res = await fetch(apiUrl, {
        credentials: 'include',
      })
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error(`Failed to fetch: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<Agreement>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    enabled: !!identifier,
  })

  // 初始化表单数据
  React.useEffect(() => {
    if (agreementData) {
      form.reset({
        title: agreementData.title,
        content: agreementData.content,
        version: agreementData.version,
        isActive: agreementData.isActive,
        effectiveAt: agreementData.effectiveAt,
      })
    } else if (!isLoading && identifier) {
      // 新协议，保持默认值
    }
  }, [agreementData, isLoading, identifier, form])

  // 草稿自动保存（1秒防抖）
  const formValues = form.watch()
  React.useEffect(() => {
    if (isLoading || viewing) return
    const timer = setTimeout(() => {
      const draft = {
        title: formValues.title,
        content: formValues.content,
        version: formValues.version,
        isActive: formValues.isActive,
        effectiveAt: formValues.effectiveAt,
      }
      localStorage.setItem(cacheKey, JSON.stringify(draft))
    }, 1000)
    return () => clearTimeout(timer)
  }, [formValues, cacheKey, isLoading, viewing])

  // 恢复草稿
  React.useEffect(() => {
    if (!agreementData && !isLoading) {
      const saved = localStorage.getItem(cacheKey)
      if (saved) {
        try {
          const draft = JSON.parse(saved)
          form.reset({
            title: draft.title || '',
            content: draft.content || '',
            version: draft.version || '1.0.0',
            isActive: draft.isActive ?? true,
            effectiveAt: draft.effectiveAt,
          })
          toast({
            title: '已恢复草稿',
            description: '已从本地缓存加载您之前的编辑内容',
            variant: 'default',
          })
        } catch {
          // 草稿解析失败，忽略
        }
      }
    }
  }, [agreementData, cacheKey, form, isLoading, toast])

  // 监听表单变化，检测未保存状态
  const hasUnsavedChanges = React.useMemo(() => {
    if (!agreementData) return false
    const values = formValues
    return (
      values.title !== agreementData.title ||
      values.content !== agreementData.content ||
      values.version !== agreementData.version ||
      values.isActive !== agreementData.isActive ||
      values.effectiveAt !== agreementData.effectiveAt
    )
  }, [formValues, agreementData])

  // 处理对话框关闭
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && hasUnsavedChanges && !viewing) {
      if (confirm('有未保存的修改，确定要关闭吗？')) {
        localStorage.removeItem(cacheKey)
        onCancel()
      }
    } else if (!isOpen) {
      localStorage.removeItem(cacheKey)
      onCancel()
    }
  }

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = agreementType
        ? {
            type: agreementType,
            title: values.title,
            content: values.content,
            version: values.version,
            isActive: values.isActive,
            effectiveAt: values.effectiveAt,
          }
        : {
            title: values.title,
            content: values.content,
            version: values.version,
            isActive: values.isActive,
            effectiveAt: values.effectiveAt,
          }

      const parsed = UpsertAgreementRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const errors: Record<string, string> = {}
        parsed.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            errors[issue.path.join('.')] = issue.message
          }
        })
        throw new Error(JSON.stringify(errors))
      }

      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) throw new Error(`Failed to save: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<Agreement>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      localStorage.removeItem(cacheKey)
      toast({ title: '保存成功', variant: 'default' })
      onSaved()
    },
    onError: (error: Error) => {
      try {
        const errorObj = JSON.parse(error.message)
        toast({ title: '校验失败', description: Object.values(errorObj).join(', '), variant: 'destructive' })
      } catch {
        toast({ title: '保存失败', description: error.message, variant: 'destructive' })
      }
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    saveMutation.mutate(values)
  }

  const isSubmitting = saveMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        disableAnimation
        showOverlay={false}
        className={cn(
          "max-w-[98vw] w-full xl:max-w-4xl h-[96vh] flex flex-col p-0 overflow-hidden",
          "bg-background border-border shadow-lg"
        )}
      >
        {/* 标题 */}
        <DialogHeader className="relative border-b border-border px-8 py-6 shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-xl transition-all duration-300",
                "bg-linear-to-br from-primary/30 via-primary/20 to-primary/10",
                "text-primary shadow-lg shadow-primary/20 ring-1 ring-primary/30"
              )}>
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className={cn(
                  "text-2xl font-bold",
                  "bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
                )}>
                  {viewing ? '协议详情' : '编辑协议'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {agreementType ? typeLabels[agreementType] : '协议'} - {viewing ? '查看协议内容' : '编辑协议内容和版本'}
                </p>
              </div>
            </div>
            {/* 未保存提醒 */}
            {hasUnsavedChanges && !viewing && (
              <div className={cn(
                "flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg",
                "bg-warning/10 text-warning border border-warning/20"
              )}>
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">有未保存的修改</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 标签页导航 */}
        {!isLoading && (
          <div className="relative px-8 pt-6 pb-2 shrink-0 border-b border-border bg-background">
            <AdminTabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'basic' | 'content')}>
              <AdminTabsList>
                <AdminTabsTrigger value="basic">
                  基本信息
                </AdminTabsTrigger>
                <AdminTabsTrigger value="content">
                  协议内容
                </AdminTabsTrigger>
              </AdminTabsList>
            </AdminTabs>
          </div>
        )}

        {/* 内容区域 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-8 py-6">
            {/* 骨架屏 */}
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-12 w-full bg-muted/40" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 bg-muted/40" />
                  <Skeleton className="h-12 bg-muted/40" />
                </div>
                <Skeleton className="h-32 w-full bg-muted/40" />
                <Skeleton className="h-64 w-full bg-muted/40" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {/* 基本信息标签页 */}
                  {activeTab === 'basic' && (
                    <div className="space-y-6">
                      {/* 提示信息 */}
                      <div className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border shadow-sm",
                        "bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30"
                      )}>
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm text-foreground/90">
                          <p className="font-semibold text-foreground mb-1">填写协议基本信息</p>
                          请确保标题和版本号准确无误，生效日期留空将使用当前时间。
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 协议标题 */}
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="lg:col-span-2 space-y-2">
                              <FormLabel className="text-sm font-semibold text-foreground">
                                协议标题 <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="请输入协议标题..."
                                  size="lg"
                                  disabled={viewing || isSubmitting}
                                  className={cn(
                                    "bg-card/50 border-border/40 text-foreground placeholder:text-muted-foreground/50",
                                    "focus:bg-card focus:border-primary/60 focus:ring-2 focus:ring-primary/30",
                                    "shadow-sm",
                                    "transition-all duration-200"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 版本号 */}
                        <FormField
                          control={form.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-foreground">
                                版本号 <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="例如: 1.0.0"
                                  size="lg"
                                  disabled={viewing || isSubmitting}
                                  className={cn(
                                    "bg-card/50 border-border/40 text-foreground placeholder:text-muted-foreground/50",
                                    "focus:bg-card focus:border-primary/60 focus:ring-2 focus:ring-primary/30",
                                    "font-mono shadow-sm",
                                    "transition-all duration-200"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* 生效日期 */}
                        <FormField
                          control={form.control}
                          name="effectiveAt"
                          render={({ field }) => (
                            <FormDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              label="生效日期"
                              description="留空则使用当前时间"
                              disabled={viewing || isSubmitting}
                            />
                          )}
                        />
                      </div>

                      <Separator className="bg-border/10" />

                      {/* 启用状态 */}
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem>
                            <Card className={cn(
                              "border transition-all duration-300 shadow-sm",
                              field.value
                                ? "bg-linear-to-br from-success/20 via-success/10 to-success/5 border-success/40 shadow-md shadow-success/20"
                                : "bg-card/50 border-border/40"
                            )}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "p-2.5 rounded-xl transition-all duration-300",
                                      field.value
                                        ? "bg-linear-to-br from-success/30 to-success/20 text-success shadow-lg shadow-success/30 ring-1 ring-success/40"
                                        : "bg-muted/40 text-muted-foreground ring-1 ring-border/30"
                                    )}>
                                      <Power className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <CardTitle className={cn(
                                        "text-base font-semibold",
                                        field.value ? "text-success" : "text-muted-foreground"
                                      )}>
                                        启用协议
                                      </CardTitle>
                                      <p className={cn(
                                        "text-sm mt-0.5",
                                        field.value ? "text-success/80" : "text-muted-foreground"
                                      )}>
                                        {field.value ? '协议将正常显示给用户' : '协议已禁用，将不会显示'}
                                      </p>
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={viewing || isSubmitting}
                                      className={cn(
                                        "transition-all duration-200",
                                        field.value && "data-[state=checked]:bg-success"
                                      )}
                                    />
                                  </FormControl>
                                </div>
                              </CardHeader>
                            </Card>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* 协议内容标签页 */}
                  {activeTab === 'content' && (
                    <div className="space-y-4">
                      {/* 提示信息 */}
                      <div className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border shadow-sm",
                        "bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30"
                      )}>
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm text-foreground/90">
                          <p className="font-semibold text-foreground mb-1">编辑协议内容</p>
                          使用富文本编辑器编写协议内容，支持格式化、链接和图片。
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-foreground">
                              协议内容 <span className="text-destructive">*</span>
                            </FormLabel>
                            <div className={cn(
                              "border rounded-xl overflow-hidden transition-all duration-200 shadow-sm",
                              "border-border/40 bg-card/50",
                              "focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30"
                            )}>
                              <FormControl>
                                <RichTextEditor
                                  value={field.value}
                                  onChange={field.onChange}
                                  readOnly={viewing || isSubmitting}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </form>
              </Form>
            )}
          </div>
        </ScrollArea>

        {/* 底部操作栏 */}
        <div className="relative px-8 py-6 border-t border-border flex items-center justify-end gap-4 shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className={cn(
              "transition-all duration-200 border-border/40 bg-card/50 hover:bg-muted/40 hover:border-border/50"
            )}
          >
            {viewing ? '关闭' : '取消'}
          </Button>
          {!viewing && (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || isLoading}
              className={cn(
                "transition-all duration-200",
                "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30",
                "active:scale-95"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  保存更改
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
