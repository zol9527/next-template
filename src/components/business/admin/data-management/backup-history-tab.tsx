'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  Trash2,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Database,
  HardDrive,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ==================== 类型定义 ====================

/** 备份任务类型 */
type JobType = 'db_backup' | 'full_backup' | 'db_restore' | 'full_restore'

/** 备份任务状态 */
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/** 备份任务响应 */
interface BackupJobResponse {
  id: string
  jobType: JobType
  status: JobStatus
  requestedBy: string
  backupFileKey: string | null
  stats: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 备份列表响应 */
interface BackupListResponse {
  items: BackupJobResponse[]
  nextCursor: string | null
  total: number
}

/** 备份进度统计 */
interface BackupStats {
  phase: string | null
  tablesTotal: number
  tablesCompleted: number
  totalRows: number
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  errors: string[]
}

/** 通用 API 响应格式 */
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string }
}

// ==================== 映射工具函数 ====================

/** 任务类型 → 中文标签 */
const JOB_TYPE_LABELS: Record<JobType, string> = {
  db_backup: '数据库',
  full_backup: '文件',
  db_restore: '数据库恢复',
  full_restore: '完整恢复',
}

/** 任务类型 → Badge 样式 */
const JOB_TYPE_VARIANTS: Record<JobType, 'outline' | 'secondary'> = {
  db_backup: 'outline',
  full_backup: 'outline',
  db_restore: 'secondary',
  full_restore: 'secondary',
}

/** 状态 → 中文标签 */
const STATUS_LABELS: Record<JobStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

/** 状态 → Badge variant */
const STATUS_VARIANTS: Record<JobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** 格式化时间 */
function formatTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

/** API 请求基础封装 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options })
  const json = (await res.json()) as ApiResponse<T>

  if (!res.ok) {
    throw new Error(json.error?.message ?? res.statusText)
  }
  if (!json.success) {
    throw new Error(json.error?.message ?? '请求失败')
  }

  return json.data
}

// ==================== 子组件：删除确认对话框 ====================

function DeleteConfirmDialog({
  open,
  onOpenChange,
  backupId,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  backupId: string | null
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/v1/admin/data-management/backups/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] })
      toast.success('删除成功', { description: '备份记录已删除' })
      onDeleted()
    },
    onError: (error) => {
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除此备份记录吗？此操作不可撤销，备份文件将被永久移除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (backupId) deleteMutation.mutate(backupId)
            }}
          >
            {deleteMutation.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 子组件：恢复对话框 ====================

function RestoreDialog({
  open,
  onOpenChange,
  backup,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  backup: BackupJobResponse | null
}) {
  const queryClient = useQueryClient()
  const [restoreType, setRestoreType] = useState<'db_restore' | 'full_restore'>('db_restore')
  const [confirmText, setConfirmText] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [restoreStats, setRestoreStats] = useState<BackupStats | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 二次确认文本
  const CONFIRM_PHRASE = '确认恢复'
  const isConfirmed = confirmText === CONFIRM_PHRASE

  // 创建恢复任务
  const restoreMutation = useMutation({
    mutationFn: (params: { jobType: 'db_restore' | 'full_restore'; backupFileKey: string }) =>
      apiFetch<BackupJobResponse>('/api/v1/admin/data-management/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }),
    onSuccess: (job) => {
      toast.success('恢复任务已创建', { description: `任务 ID: ${job.id}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] })
      // 开始轮询进度
      startPolling(job.id)
    },
    onError: (error) => {
      toast.error('创建恢复任务失败', {
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
      })
    },
  })

  // 轮询恢复进度
  const startPolling = useCallback((jobId: string) => {
    setIsPolling(true)
    setRestoreStats(null)

    pollIntervalRef.current = setInterval(async () => {
      try {
        const stats = await apiFetch<BackupStats>(
          `/api/v1/admin/data-management/backups/${jobId}/stats`
        )
        setRestoreStats(stats)

        // 完成或失败时停止轮询
        if (stats.phase === 'completed') {
          stopPolling()
          toast.success('恢复完成')
          queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] })
        } else if (stats.phase === 'failed') {
          stopPolling()
          toast.error('恢复失败', { description: stats.errors.join('; ') })
        }
      } catch {
        stopPolling()
      }
    }, 2000)
  }, [queryClient])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // 重置对话框状态
  const handleClose = useCallback(() => {
    stopPolling()
    setConfirmText('')
    setRestoreType('db_restore')
    setRestoreStats(null)
    restoreMutation.reset()
    onOpenChange(false)
  }, [stopPolling, restoreMutation, onOpenChange])

  // 计算进度百分比
  const progressPercent = restoreStats
    ? restoreStats.tablesTotal > 0
      ? Math.round((restoreStats.tablesCompleted / restoreStats.tablesTotal) * 100)
      : 0
    : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>恢复数据</DialogTitle>
          <DialogDescription>
            从备份恢复数据到系统中，此操作会覆盖现有数据。
          </DialogDescription>
        </DialogHeader>

        {isPolling && (
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <p className="text-sm font-medium">
              {restoreStats?.phase === 'completed'
                ? '恢复完成'
                : restoreStats?.phase === 'failed'
                  ? '恢复失败'
                  : '正在恢复...'}
            </p>
            <Progress value={progressPercent} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                表: {restoreStats?.tablesCompleted ?? 0}/{restoreStats?.tablesTotal ?? 0}
              </span>
              <span>
                文件: {restoreStats?.filesCompleted ?? 0}/{restoreStats?.filesTotal ?? 0}
              </span>
              <span>
                {formatBytes(restoreStats?.bytesTransferred ?? 0)}
              </span>
            </div>
            {restoreStats?.errors && restoreStats.errors.length > 0 && (
              <div className="mt-1 text-xs text-destructive">
                错误: {restoreStats.errors.join('; ')}
              </div>
            )}
          </div>
        )}

        {!isPolling && (
          <div className="flex flex-col gap-4">
            {backup && (
              <div className="rounded-md border p-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span>
                    类型: <Badge variant={JOB_TYPE_VARIANTS[backup.jobType]}>{JOB_TYPE_LABELS[backup.jobType]}</Badge>
                  </span>
                  <span className="text-muted-foreground">
                    创建时间: {formatTime(backup.createdAt)}
                  </span>
                  {backup.backupFileKey && (
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      文件: {backup.backupFileKey}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>恢复类型</Label>
              <div className="flex gap-2">
                <Button
                  variant={restoreType === 'db_restore' ? 'solid' : 'outline'}
                  size="sm"
                  onClick={() => setRestoreType('db_restore')}
                >
                  <Database data-icon="inline-start" />
                  仅数据库
                </Button>
                <Button
                  variant={restoreType === 'full_restore' ? 'solid' : 'outline'}
                  size="sm"
                  onClick={() => setRestoreType('full_restore')}
                >
                  <HardDrive data-icon="inline-start" />
                  完整恢复
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">风险警告</p>
                <p className="text-amber-700 dark:text-amber-300">
                  恢复操作将覆盖现有数据，建议先创建备份。此操作不可撤销。
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-restore">
                请输入 <code className="rounded bg-muted px-1 font-mono text-sm">{CONFIRM_PHRASE}</code> 以确认操作
              </Label>
              <Input
                id="confirm-restore"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_PHRASE}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPolling}>
            {isPolling ? '恢复中...' : '取消'}
          </Button>
          {!isPolling && (
            <Button
              disabled={!isConfirmed || restoreMutation.isPending || !backup?.backupFileKey}
              onClick={() => {
                if (backup?.backupFileKey) {
                  restoreMutation.mutate({
                    jobType: restoreType,
                    backupFileKey: backup.backupFileKey,
                  })
                }
              }}
            >
              {restoreMutation.isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              开始恢复
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 主组件 ====================

export function BackupHistoryTab() {
  // 对话框状态
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupJobResponse | null>(null)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)

  // 清理设置状态
  const [maxRetention, setMaxRetention] = useState(10)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // 获取备份列表
  const { data, isLoading } = useQuery<BackupListResponse>({
    queryKey: ['admin', 'backups'],
    queryFn: () =>
      apiFetch<BackupListResponse>('/api/v1/admin/data-management/backups?limit=20'),
  })

  // 下载备份
  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      // 获取下载 token 后跳转
      const result = await apiFetch<{ url: string }>(
        `/api/v1/admin/data-management/backups/${id}/download`
      )
      window.open(result.url, '_blank')
      return result
    },
    onError: (error) => {
      toast.error('下载失败', {
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
      })
    },
  })

  // 处理删除
  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id)
    setDeleteDialogOpen(true)
  }, [])

  // 处理恢复
  const handleRestore = useCallback((backup: BackupJobResponse) => {
    setRestoreTarget(backup)
    setRestoreDialogOpen(true)
  }, [])

  // 保存清理设置
  const handleSaveSettings = () => {
    setSaveStatus('saving')
    // TODO: 接入真实保存 API（Task 28 预留）
    setTimeout(() => {
      setSaveStatus('saved')
      toast.success('清理设置已保存')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  const backups = data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">备份历史</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Database className="mb-2 size-10 opacity-40" />
              <p className="text-sm">暂无备份记录</p>
              <p className="text-xs">创建备份后将在此处显示</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="text-sm">
                      {formatTime(backup.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={JOB_TYPE_VARIANTS[backup.jobType]}>
                        {JOB_TYPE_LABELS[backup.jobType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[backup.status]}>
                        {STATUS_LABELS[backup.status]}
                      </Badge>
                      {backup.errorMessage && (
                        <p className="mt-1 text-xs text-destructive">{backup.errorMessage}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {backup.requestedBy}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {backup.status === 'completed' && backup.backupFileKey && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={downloadMutation.isPending}
                            onClick={() => downloadMutation.mutate(backup.id)}
                          >
                            <Download data-icon="inline-start" />
                            下载
                          </Button>
                        )}
                        {backup.status === 'completed' && backup.backupFileKey && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(backup)}
                          >
                            <RotateCcw data-icon="inline-start" />
                            恢复
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(backup.id)}
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">清理设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="max-retention" className="text-sm font-medium whitespace-nowrap">
              最大保留数量
            </Label>
            <Input
              id="max-retention"
              type="number"
              min={1}
              max={100}
              value={maxRetention}
              onChange={(e) => setMaxRetention(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              超过此数量的旧备份将被自动清理
            </span>
          </div>
          <Button size="sm" className="mt-4" onClick={handleSaveSettings}>
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存 ✓' : '保存设置'}
          </Button>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        backupId={deleteTarget}
        onDeleted={() => {
          setDeleteDialogOpen(false)
          setDeleteTarget(null)
        }}
      />

      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        backup={restoreTarget}
      />
    </div>
  )
}
