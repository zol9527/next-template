'use client'

/**
 * 通知表单页面组件
 * 用于创建/编辑通知的独立页面布局（非 Modal）
 */

import * as React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminNotification } from './admin-notification-columns'

const formSchema = z.object({
  title: z.string().min(1, '通知标题不能为空'),
  summary: z.string().optional().default(''),
  content: z.string().min(1, '通知内容不能为空'),
  icon: z.string().optional().default(''),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(true),
})

interface AdminNotificationFormProps {
  notificationId?: string
  mode: 'create' | 'edit' | 'view'
  onSaved: () => void
  onCancel: () => void
}

/**
 * Function: AdminNotificationForm
 *
 * Description: 通知表单页面组件（用于独立页面布局，非 Modal）
 *
 * Parameters:
 *     props(AdminNotificationFormProps): 组件属性
 *
 * Returns:
 *     component(JSX.Element): 表单页面组件
 */
export function AdminNotificationForm({
  notificationId,
  mode,
  onSaved,
  onCancel,
}: AdminNotificationFormProps) {
  const { toast } = useToast()
  const editing = mode === 'edit'
  const viewing = mode === 'view'

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      icon: '',
      priority: 0,
      isActive: true,
      isGlobal: true,
    },
  })

  // 条件查询通知数据（编辑模式下按 ID 获取）
  const { data: notificationData, isLoading } = useQuery<AdminNotification>({
    queryKey: ['admin', 'notifications', notificationId],
    queryFn: async () => {
      if (!notificationId) throw new Error('Notification ID is required')
      const res = await fetch(`/api/v1/admin/notifications/${notificationId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<AdminNotification>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    enabled: !!notificationId && (editing || viewing),
    staleTime: 60 * 1000, // 1 分钟内数据视为新鲜
  })

  // 初始化表单数据
  React.useEffect(() => {
    if (notificationData) {
      form.reset({
        title: notificationData.title,
        summary: notificationData.summary ?? '',
        content: notificationData.content,
        icon: notificationData.icon ?? '',
        priority: notificationData.priority,
        isActive: notificationData.isActive,
        isGlobal: notificationData.isGlobal,
      })
    }
  }, [notificationData, form])

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const url = editing
        ? `/api/v1/admin/notifications/${notificationId}`
        : '/api/v1/admin/notifications'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })

      if (!res.ok) throw new Error(`Failed to save: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<AdminNotification>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      toast({ title: '保存成功', variant: 'default' })
      onSaved()
    },
    onError: (error: Error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' })
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    saveMutation.mutate(values)
  }

  const isSubmitting = saveMutation.isPending

  return (
    <div className="bg-card border border-border/10 rounded-xl overflow-hidden">
      <div className="p-6 lg:p-8 border-b border-border/10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 通知标题 */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>标题 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入通知标题..."
                        disabled={viewing || isSubmitting}
                        className={cn(
                          "h-11 w-full bg-muted/5 border border-border/10 rounded-lg px-4",
                          "focus:border-primary/50 focus:outline-none transition-all",
                          "disabled:opacity-50 placeholder:text-muted-foreground/40"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 摘要 */}
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>摘要</FormLabel>
                    <FormControl>
                      <input
                        placeholder="请输入通知摘要（可选）..."
                        disabled={viewing || isSubmitting}
                        className={cn(
                          "h-11 w-full bg-muted/5 border border-border/10 rounded-lg px-4",
                          "focus:border-primary/50 focus:outline-none transition-all",
                          "disabled:opacity-50 placeholder:text-muted-foreground/40"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 通知内容 */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium">内容 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="请输入通知内容..."
                        disabled={viewing || isSubmitting}
                        rows={6}
                        className={cn(
                          "w-full bg-muted/5 border border-border/10 rounded-lg px-4 py-3",
                          "focus:border-primary/50 focus:outline-none transition-all resize-y",
                          "disabled:opacity-50 placeholder:text-muted-foreground/40"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 图标 */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>图标</FormLabel>
                    <FormControl>
                      <input
                        placeholder="图标名称或 URL（可选）"
                        disabled={viewing || isSubmitting}
                        className={cn(
                          "h-11 w-full bg-muted/5 border border-border/10 rounded-lg px-4",
                          "focus:border-primary/50 focus:outline-none transition-all",
                          "disabled:opacity-50 placeholder:text-muted-foreground/40"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 优先级 */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>优先级</FormLabel>
                    <FormControl>
                      <input
                        type="number"
                        min="0"
                        placeholder="数值越大越靠前"
                        disabled={viewing || isSubmitting}
                        className={cn(
                          "h-11 w-full bg-muted/5 border border-border/10 rounded-lg px-4",
                          "focus:border-primary/50 focus:outline-none transition-all",
                          "disabled:opacity-50 placeholder:text-muted-foreground/40"
                        )}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 启用状态 */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-4 bg-muted/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">是否启用</FormLabel>
                      <p className="text-xs text-muted-foreground">禁用后通知将不会展示给用户</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={viewing || isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 是否全局 */}
              <FormField
                control={form.control}
                name="isGlobal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-4 bg-muted/5">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">是否全局</FormLabel>
                      <p className="text-xs text-muted-foreground">全局通知将发送给所有用户</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={viewing || isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </div>

      {/* 底部操作栏 */}
      <div className="px-6 lg:px-8 py-4 border-t border-border/10 flex items-center justify-between bg-muted/5">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="h-10 px-5">
          {viewing ? '关闭' : '取消'}
        </Button>
        {!viewing && (
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || isLoading}
            className="h-10 px-5 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {editing ? '保存更改' : '创建通知'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
