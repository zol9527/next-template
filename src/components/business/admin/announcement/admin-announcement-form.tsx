'use client'

import * as React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RichTextEditor } from '@/components/business/admin/rich-text-editor'
import { useToast } from '@/components/ui/toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Bell, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Announcement } from '@/contracts/dtos/admin/site-config.dto'
import { CreateAnnouncementRequestSchema, UpdateAnnouncementRequestSchema } from '@/contracts/dtos/admin/site-config.dto'

const formSchema = z.object({
  title: z.string().min(1, '公告标题不能为空'),
  content: z.string().min(1, '公告内容不能为空'),
  type: z.enum(['NOTICE', 'ACTIVITY', 'MAINTENANCE']),
  isActive: z.boolean(),
  priority: z.number().int().min(0),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
})

interface AdminAnnouncementFormProps {
  announcementId?: string | null
  mode: 'create' | 'edit' | 'view'
  onSaved: () => void
  onCancel: () => void
}

/**
 * Function: AdminAnnouncementForm
 *
 * Description: 公告表单对话框组件
 *
 * Parameters:
 *     props(AdminAnnouncementFormProps): 组件属性
 *
 * Returns:
 *     component(JSX.Element): 对话框组件
 */
export function AdminAnnouncementForm({
  announcementId,
  mode,
  onSaved,
  onCancel,
}: AdminAnnouncementFormProps) {
  const { toast } = useToast()
  const editing = mode === 'edit'
  const viewing = mode === 'view'

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      type: 'NOTICE',
      isActive: true,
      priority: 0,
      startAt: null,
      endAt: null,
    },
  })

  // 条件查询公告数据
  const { data: announcementData, isLoading } = useQuery<Announcement>({
    queryKey: ['admin', 'announcements', announcementId],
    queryFn: async () => {
      if (!announcementId) throw new Error('Announcement ID is required')
      const res = await fetch(`/api/v1/admin/announcements/${announcementId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<Announcement>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    enabled: !!announcementId && (editing || viewing),
  })

  // 初始化表单数据
  React.useEffect(() => {
    if (announcementData) {
      form.reset({
        title: announcementData.title,
        content: announcementData.content,
        type: announcementData.type,
        isActive: announcementData.isActive,
        priority: announcementData.priority,
        startAt: announcementData.startAt ? announcementData.startAt.slice(0, 16) : '',
        endAt: announcementData.endAt ? announcementData.endAt.slice(0, 16) : '',
      })
    }
  }, [announcementData, form])

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const url = editing
        ? `/api/v1/admin/announcements/${announcementId}`
        : '/api/v1/admin/announcements'
      const method = editing ? 'PATCH' : 'POST'

      // 转换日期格式为 ISO 字符串
      const payload = {
        ...values,
        startAt: values.startAt ? new Date(values.startAt).toISOString() : null,
        endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
      }

      // 验证
      const validator = editing ? UpdateAnnouncementRequestSchema : CreateAnnouncementRequestSchema
      const parsed = validator.safeParse(payload)

      if (!parsed.success) {
        const errors: Record<string, string> = {}
        parsed.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            errors[issue.path.join('.')] = issue.message
          }
        })
        throw new Error(JSON.stringify(errors))
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) throw new Error(`Failed to save: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<Announcement>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
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
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="max-w-[98vw] w-full xl:max-w-4xl h-[96vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl"
      >
        {/* 标题 */}
        <DialogHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 text-primary p-3">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                {viewing ? '公告详情' : editing ? '编辑公告' : '创建新公告'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {viewing ? '查看公告的完整信息' : '填写公告信息，支持富文本编辑'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 内容 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 公告标题 */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel>公告标题 <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <input
                            placeholder="请输入公告标题..."
                            disabled={viewing || isSubmitting}
                            className={cn(
                              "h-12 w-full bg-muted/5 border border-border/10 rounded-xl px-4",
                              "focus:border-primary/50 focus:outline-none transition-all",
                              "disabled:opacity-50"
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 公告类型 */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>公告类型</FormLabel>
                        <Select
                          disabled={viewing || isSubmitting}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择类型" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NOTICE">
                              <div className="flex items-center gap-2">
                                <Badge variant="default">通知</Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="ACTIVITY">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">活动</Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="MAINTENANCE">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">维护</Badge>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
                              "h-12 w-full bg-muted/5 border border-border/10 rounded-xl px-4",
                              "focus:border-primary/50 focus:outline-none transition-all",
                              "disabled:opacity-50"
                            )}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 生效时间 */}
                  <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>生效时间</FormLabel>
                        <FormControl>
                          <input
                            type="datetime-local"
                            disabled={viewing || isSubmitting}
                            className={cn(
                              "h-12 w-full bg-muted/5 border border-border/10 rounded-xl px-4",
                              "focus:border-primary/50 focus:outline-none transition-all",
                              "disabled:opacity-50"
                            )}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 失效时间 */}
                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>失效时间</FormLabel>
                        <FormControl>
                          <input
                            type="datetime-local"
                            disabled={viewing || isSubmitting}
                            className={cn(
                              "h-12 w-full bg-muted/5 border border-border/10 rounded-xl px-4",
                              "focus:border-primary/50 focus:outline-none transition-all",
                              "disabled:opacity-50"
                            )}
                            value={field.value ?? ''}
                            onChange={field.onChange}
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-4">
                        <div className="space-y-0.5">
                          <FormLabel>启用公告</FormLabel>
                          <p className="text-sm text-muted-foreground">禁用后公告将不会显示</p>
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

                {/* 富文本内容 */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>公告内容 <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          readOnly={viewing || isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* 底部操作栏 */}
        <div className="px-8 py-6 border-t border-border/10 flex items-center justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {viewing ? '关闭' : '取消'}
          </Button>
          {!viewing && (
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  {editing ? '保存更改' : '创建公告'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
