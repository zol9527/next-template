'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * FAQ 条目数据类型
 */
interface FaqItem {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** 创建/编辑表单的默认值 */
const EMPTY_FORM = {
  question: '',
  answer: '',
  sort: 0,
  enabled: true,
}

/**
 * Component: MiniprogramFaqList
 *
 * Description: 小程序常见问题列表管理组件
 * 提供 FAQ 条目的增删改查、排序、启用/禁用等功能
 */
export function MiniprogramFaqList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<FaqItem | null>(null)
  const [deletingItem, setDeletingItem] = React.useState<FaqItem | null>(null)

  // 表单状态
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 获取 FAQ 列表
  const { data: faqList, isLoading } = useQuery<FaqItem[]>({
    queryKey: ['admin', 'miniprogram', 'faq', 'list'],
    queryFn: async (): Promise<FaqItem[]> => {
      const res = await fetch('/api/v1/admin/miniprogram/faq', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('加载常见问题失败')
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || '加载常见问题失败')
      return json.data ?? []
    },
  })

  // 按 sort 升序排列
  const sortedList = React.useMemo(() => {
    if (!faqList) return []
    return [...faqList].sort((a, b) => a.sort - b.sort)
  }, [faqList])

  // ---- Mutations ----

  /** 创建 FAQ */
  const createMutation = useMutation({
    mutationFn: async (payload: Omit<FaqItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const res = await fetch('/api/v1/admin/miniprogram/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`创建失败: ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || '创建失败')
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniprogram', 'faq', 'list'] })
      toast({ title: '创建成功', description: '常见问题已添加', variant: 'default' })
      setEditDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
    },
  })

  /** 更新 FAQ */
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<FaqItem> }) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload.data),
      })
      if (!res.ok) throw new Error(`更新失败: ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || '更新失败')
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniprogram', 'faq', 'list'] })
      toast({ title: '更新成功', description: '常见问题已更新', variant: 'default' })
      setEditDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' })
    },
  })

  /** 删除 FAQ */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`删除失败: ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || '删除失败')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniprogram', 'faq', 'list'] })
      toast({ title: '删除成功', description: '常见问题已删除', variant: 'default' })
      setDeleteDialogOpen(false)
      setDeletingItem(null)
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // ---- Handlers ----

  /** 打开新增对话框 */
  const handleAdd = () => {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, sort: (sortedList.length > 0 ? sortedList[sortedList.length - 1].sort : 0) + 1 })
    setErrors({})
    setEditDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (item: FaqItem) => {
    setEditingItem(item)
    setForm({ question: item.question, answer: item.answer, sort: item.sort, enabled: item.enabled })
    setErrors({})
    setEditDialogOpen(true)
  }

  /** 打开删除确认对话框 */
  const handleDelete = (item: FaqItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  /** 确认删除 */
  const confirmDelete = async () => {
    if (!deletingItem) return
    await deleteMutation.mutateAsync(deletingItem.id)
  }

  /** 提交表单（新增 / 编辑） */
  const handleSubmit = () => {
    // 验证
    const newErrors: Record<string, string> = {}
    if (!form.question.trim()) newErrors.question = '问题不能为空'
    if (!form.answer.trim()) newErrors.answer = '答案不能为空'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast({ title: '校验失败', description: '请检查表单中标记为红色的字段', variant: 'destructive' })
      return
    }

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      sort: form.sort,
      enabled: form.enabled,
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  /** 切换启用/禁用 */
  const handleToggleEnabled = (item: FaqItem) => {
    updateMutation.mutate({ id: item.id, data: { enabled: !item.enabled } })
  }

  /** 上移排序 */
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const current = sortedList[index]
    const prev = sortedList[index - 1]
    // 交换 sort 值
    updateMutation.mutate({ id: current.id, data: { sort: prev.sort } })
    updateMutation.mutate({ id: prev.id, data: { sort: current.sort } })
  }

  /** 下移排序 */
  const handleMoveDown = (index: number) => {
    if (index >= sortedList.length - 1) return
    const current = sortedList[index]
    const next = sortedList[index + 1]
    updateMutation.mutate({ id: current.id, data: { sort: next.sort } })
    updateMutation.mutate({ id: next.id, data: { sort: current.sort } })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ---- Render ----

  // 加载骨架屏
  if (isLoading) {
    return (
      <ScrollArea className="bg-transparent">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border/20 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-48 bg-muted/30 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-10 bg-muted/20 rounded-full animate-pulse" />
                  <div className="h-8 w-8 bg-muted/20 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-muted/20 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <>
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            共 {sortedList.length} 个问题
          </Badge>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          新增问题
        </Button>
      </div>

      {/* FAQ 列表 */}
      {sortedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted/50 p-4">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">暂无常见问题</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            点击上方「新增问题」按钮添加第一个常见问题
          </p>
        </div>
      ) : (
        <ScrollArea className="bg-transparent">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedList.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      'bg-card rounded-xl border border-border/20 shadow-sm p-5 transition-opacity duration-200',
                      !item.enabled && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* 排序按钮 */}
                      <div className="flex flex-col gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 p-0"
                          disabled={index === 0 || updateMutation.isPending}
                          onClick={() => handleMoveUp(index)}
                          aria-label="上移"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 p-0"
                          disabled={index === sortedList.length - 1 || updateMutation.isPending}
                          onClick={() => handleMoveDown(index)}
                          aria-label="下移"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* 内容区域 */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{item.question}</p>
                          <Badge variant={item.enabled ? 'default' : 'secondary'} className="shrink-0">
                            {item.enabled ? '已启用' : '已禁用'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.answer}</p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={() => handleToggleEnabled(item)}
                          disabled={updateMutation.isPending}
                          aria-label={item.enabled ? '禁用' : '启用'}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                          aria-label="编辑"
                          disabled={updateMutation.isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item)}
                          aria-label="删除"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑问题' : '新增问题'}</DialogTitle>
            <DialogDescription>
              {editingItem ? '修改常见问题的内容和设置' : '添加一个新的常见问题到列表中'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 问题 */}
            <div className="space-y-2">
              <Label className={cn('text-sm font-semibold', errors.question && 'text-destructive')}>
                问题 <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="请输入常见问题"
                value={form.question}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, question: e.target.value }))
                  if (errors.question) setErrors((prev) => ({ ...prev, question: '' }))
                }}
                disabled={isSubmitting}
                className={cn(
                  'bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200',
                  errors.question && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                )}
              />
              {errors.question && <p className="text-xs text-destructive">{errors.question}</p>}
            </div>

            {/* 答案 */}
            <div className="space-y-2">
              <Label className={cn('text-sm font-semibold', errors.answer && 'text-destructive')}>
                答案 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="请输入问题答案"
                value={form.answer}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, answer: e.target.value }))
                  if (errors.answer) setErrors((prev) => ({ ...prev, answer: '' }))
                }}
                disabled={isSubmitting}
                rows={4}
                className={cn(
                  'bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200',
                  errors.answer && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                )}
              />
              {errors.answer && <p className="text-xs text-destructive">{errors.answer}</p>}
            </div>

            {/* 排序 + 启用 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">排序</Label>
                <Input
                  type="number"
                  placeholder="排序值"
                  value={form.sort}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, sort: Number(e.target.value) || 0 }))
                  }}
                  disabled={isSubmitting}
                  className="bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Label className="text-sm font-semibold">启用</Label>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                editingItem ? '保存修改' : '确认添加'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除问题「{deletingItem?.question}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItem(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
