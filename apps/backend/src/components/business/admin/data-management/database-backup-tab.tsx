'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// ============================================================================
// 类型定义
// ============================================================================

/** API 返回的原始预估数据结构（与 EstimateResult 对齐） */
interface BackupEstimateRaw {
  db: {
    tablesTotal: number
    totalRows: number
    estimatedSizeBytes: number
    estimatedDurationMs: number
  }
  files: {
    totalFiles: number
    totalBytes: number
    estimatedDurationMs: number
  }
}

/** 组件内部使用的扁平化预估信息 */
interface BackupEstimate {
  estimatedTables: number
  estimatedRows: number
  estimatedFiles: number
  estimatedTotalBytes: number
  estimatedDurationSeconds: number
  estimatedZipSizeMB: number
}

/** 备份任务状态 */
type BackupJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/** 创建备份任务返回 */
interface BackupJob {
  id: string
  jobType: 'db_backup'
  status: BackupJobStatus
  requestedBy: string
  backupFileKey: string | null
  stats: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 备份进度统计（包含 job 状态信息） */
interface BackupProgress {
  phase: string | null
  tablesTotal: number
  tablesCompleted: number
  totalRows: number
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  errors: string[]
  /** job 当前状态（从 stats 端点返回） */
  status?: string
  /** 失败原因 */
  errorMessage?: string | null
  /** 备份文件 key（completed 时有值） */
  backupFileKey?: string | null
  /** 完成时间 */
  completedAt?: string | null
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * Function: formatBytes
 *
 * Description: 将字节数转换为人类可读的大小字符串（如 1.5 GB）
 *
 * Parameters:
 * 	bytes(number): 待转换的字节数
 *
 * Returns:
 * 	result(string): 格式化后的大小字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}

/**
 * Function: formatDuration
 *
 * Description: 将秒数转换为 "分:秒" 格式的可读时长
 *
 * Parameters:
 * 	seconds(number): 时长（秒）
 *
 * Returns:
 * 	result(string): 格式化后的时长字符串
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Function: getStatusBadge
 *
 * Description: 根据备份任务状态返回对应的 Badge 组件
 *
 * Parameters:
 * 	status(BackupJobStatus): 备份任务状态
 *
 * Returns:
 * 	element(React.ReactElement): 状态 Badge 组件
 */
function getStatusBadge(status: BackupJobStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">等待中</Badge>
    case 'processing':
      return <Badge variant="secondary">处理中</Badge>
    case 'completed':
      return <Badge variant="default">已完成</Badge>
    case 'failed':
      return <Badge variant="destructive">失败</Badge>
    case 'cancelled':
      return <Badge variant="outline">已取消</Badge>
  }
}

// ============================================================================
// API 请求函数
// ============================================================================

/** 获取预估信息（将 API 嵌套结构映射为扁平结构） */
async function fetchEstimate(): Promise<BackupEstimate> {
  const res = await fetch('/api/v1/admin/data-management/backups/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType: 'db_backup' }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || '获取预估信息失败')
  }
  const json = await res.json()
  const raw: BackupEstimateRaw = json.data
  return {
    estimatedTables: raw.db.tablesTotal,
    estimatedRows: raw.db.totalRows,
    estimatedFiles: raw.files.totalFiles,
    estimatedTotalBytes: raw.db.estimatedSizeBytes + raw.files.totalBytes,
    estimatedDurationSeconds: Math.ceil(
      (raw.db.estimatedDurationMs + raw.files.estimatedDurationMs) / 1000
    ),
    // 压缩比约 0.15（JSONL→GZIP 经验值）
    estimatedZipSizeMB: Number(
      ((raw.db.estimatedSizeBytes + raw.files.totalBytes) * 0.15 / 1024 / 1024).toFixed(1)
    ),
  }
}

/** 创建备份任务 */
async function createBackup(): Promise<BackupJob> {
  const res = await fetch('/api/v1/admin/data-management/backups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType: 'db_backup' }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || '创建备份失败')
  }
  const json = await res.json()
  return json.data
}

/** 获取当前活跃的备份任务（processing/pending 状态） */
async function fetchActiveJob(): Promise<BackupJob | null> {
  const res = await fetch('/api/v1/admin/data-management/backups?status=processing&limit=1', {
    credentials: 'include',
  })
  if (!res.ok) return null
  const json = await res.json()
  const items = json.data?.items as BackupJob[] | undefined
  return items && items.length > 0 ? items[0] : null
}

/** 获取备份进度 */
async function fetchProgress(jobId: string): Promise<BackupProgress> {
  const res = await fetch(
    `/api/v1/admin/data-management/backups/${jobId}/stats`,
    { credentials: 'include' },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || '获取进度失败')
  }
  const json = await res.json()
  return json.data
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * Component: DatabaseBackupTab
 *
 * Description: 数据库备份操作面板。包含预估信息展示、创建备份、实时进度轮询、
 * 完成后下载等完整备份流程。使用 TanStack Query 管理 API 请求和轮询状态。
 */
export function DatabaseBackupTab() {
  const queryClient = useQueryClient()
  // 当前活跃的备份任务 ID，用于轮询进度
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  // 备份完成后的任务信息，用于展示下载按钮
  const [completedJob, setCompletedJob] = useState<BackupJob | null>(null)

  // ---- 预估信息查询 ----
  const {
    data: estimate,
    isLoading: estimateLoading,
    error: estimateError,
  } = useQuery<BackupEstimate>({
    queryKey: ['admin', 'data-management', 'backup-estimate'],
    queryFn: fetchEstimate,
    // 有活跃任务时停止刷新预估
    enabled: !activeJobId,
  })

  // ---- 备份进度轮询（仅在 activeJobId 存在时启用） ----
  const {
    data: progress,
    error: progressError,
  } = useQuery<BackupProgress>({
    queryKey: ['admin', 'data-management', 'backup-progress', activeJobId],
    queryFn: () => fetchProgress(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: 5000,
  })

  // ---- 创建备份 mutation ----
  const createMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: (job) => {
      setActiveJobId(job.id)
      setCompletedJob(null)
      toast.success('备份任务已创建')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '创建备份失败')
    },
  })

  // ---- 计算进度百分比 ----
  const progressPercent =
    progress && progress.tablesTotal > 0
      ? Math.round((progress.tablesCompleted / progress.tablesTotal) * 100)
      : 0

  // ---- 检测备份终态（通过 status 字段或进度完成判断） ----
  // 新增状态引用，避免闭包问题
  const [failedError, setFailedError] = useState<string | null>(null)

  // ---- 检查是否有活跃任务（页面加载时检测，用于恢复进度面板） ----
  const { data: activeJob } = useQuery<BackupJob | null>({
    queryKey: ['admin', 'data-management', 'backup-active'],
    queryFn: fetchActiveJob,
    // 仅在没有 activeJobId 且没有完成任务时检查（避免重复查询）
    enabled: !activeJobId && !completedJob && !failedError,
    // 30 秒后视为过期，避免缓存已结束的任务数据
    staleTime: 30_000,
  })

  // 当检测到活跃任务时，自动恢复进度面板
  useEffect(() => {
    if (activeJob && !activeJobId && !completedJob && !failedError) {
      setActiveJobId(activeJob.id)
    }
  }, [activeJob?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (activeJobId && progress && !completedJob && !failedError) {
    const jobStatus = progress.status

    // 1. 任务失败
    if (jobStatus === 'failed') {
      queueMicrotask(() => {
        setFailedError(progress.errorMessage || '备份任务失败，请重试')
        setActiveJobId(null)
        queryClient.invalidateQueries({
          queryKey: ['admin', 'data-management', 'backup-estimate'],
        })
      })
    }
    // 2. 任务完成（通过 status 字段判断，比进度更可靠）
    else if (jobStatus === 'completed') {
      queueMicrotask(() => {
        setCompletedJob({
          id: activeJobId,
          jobType: 'db_backup',
          status: 'completed',
          requestedBy: '',
          backupFileKey: progress.backupFileKey ?? null,
          stats: null,
          errorMessage: null,
          startedAt: null,
          completedAt: progress.completedAt ?? new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        setActiveJobId(null)
        queryClient.invalidateQueries({
          queryKey: ['admin', 'data-management', 'backup-estimate'],
        })
      })
    }
    // 3. 兼容旧逻辑：通过进度完成判断（无 status 字段的 fallback）
    else if (
      progress.tablesTotal > 0 &&
      progress.tablesCompleted >= progress.tablesTotal
    ) {
      queueMicrotask(() => {
        setCompletedJob({
          id: activeJobId,
          jobType: 'db_backup',
          status: 'completed',
          requestedBy: '',
          backupFileKey: null,
          stats: null,
          errorMessage: null,
          startedAt: null,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        setActiveJobId(null)
        queryClient.invalidateQueries({
          queryKey: ['admin', 'data-management', 'backup-estimate'],
        })
      })
    }
  }

  // ---- 下载处理 ----
  const handleDownload = () => {
    if (!completedJob) return
    // 直接打开下载链接
    window.open(
      `/api/v1/admin/data-management/backups/${completedJob.id}/download`,
      '_blank',
    )
  }

  // ---- 重新备份（重置到初始预估状态） ----
  const handleReset = () => {
    setActiveJobId(null)
    setCompletedJob(null)
    setFailedError(null)
    queryClient.invalidateQueries({
      queryKey: ['admin', 'data-management', 'backup-estimate'],
    })
  }

  // ============================================================================
  // 渲染：预估面板
  // ============================================================================
  const renderEstimatePanel = () => {
    if (estimateLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备份预估</CardTitle>
            <CardDescription>正在计算备份规模...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      )
    }

    if (estimateError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备份预估</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive mb-3">
              {estimateError instanceof Error
                ? estimateError.message
                : '获取预估信息失败'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ['admin', 'data-management', 'backup-estimate'],
                })
              }
            >
              重试
            </Button>
          </CardContent>
        </Card>
      )
    }

    if (!estimate) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">备份预估</CardTitle>
          <CardDescription>基于当前数据库规模估算备份所需时间和空间</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* 预估大小 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">预估大小</p>
              <p className="mt-1 text-lg font-semibold">
                {estimate.estimatedZipSizeMB.toFixed(1)} MB
              </p>
            </div>
            {/* 预估时间 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">预估时间</p>
              <p className="mt-1 text-lg font-semibold">
                {formatDuration(estimate.estimatedDurationSeconds)}
              </p>
            </div>
            {/* 预估表数 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">数据表</p>
              <p className="mt-1 text-lg font-semibold">
                {estimate.estimatedTables} 张
              </p>
            </div>
            {/* 预估行数 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">数据行</p>
              <p className="mt-1 text-lg font-semibold">
                {estimate.estimatedRows.toLocaleString()} 行
              </p>
            </div>
            {/* 预估文件数 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">文件数</p>
              <p className="mt-1 text-lg font-semibold">
                {estimate.estimatedFiles.toLocaleString()}
              </p>
            </div>
            {/* 总字节数 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">原始大小</p>
              <p className="mt-1 text-lg font-semibold">
                {formatBytes(estimate.estimatedTotalBytes)}
              </p>
            </div>
          </div>

          {/* 创建备份按钮 */}
          <div className="mt-6">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !!activeJob}
            >
              {createMutation.isPending
                ? '正在创建...'
                : activeJob
                  ? '已有任务执行中...'
                  : '创建数据库备份'}
            </Button>
            {activeJob && (
              <p className="mt-2 text-xs text-muted-foreground">
                已有备份任务正在执行中（任务 ID: {activeJob.id.slice(0, 8)}...）
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：进度面板
  // ============================================================================
  const renderProgressPanel = () => {
    if (!activeJobId) return null

    // 进度查询出错
    if (progressError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备份进度</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive mb-3">
              {progressError instanceof Error
                ? progressError.message
                : '获取进度失败'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: [
                      'admin',
                      'data-management',
                      'backup-progress',
                      activeJobId,
                    ],
                  })
                }
              >
                重试
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">备份进度</CardTitle>
              <CardDescription>
                {progress?.phase ?? '正在准备...'}
              </CardDescription>
            </div>
            <Badge variant="secondary">处理中</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 进度条 */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                表 {progress?.tablesCompleted ?? 0} / {progress?.tablesTotal ?? 0}
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} />
          </div>

          {/* 详细指标 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* 已处理行数 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">已处理行数</p>
              <p className="mt-1 text-sm font-semibold">
                {(progress?.totalRows ?? 0).toLocaleString()}
              </p>
            </div>
            {/* 已传输字节 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">已传输</p>
              <p className="mt-1 text-sm font-semibold">
                {formatBytes(progress?.bytesTransferred ?? 0)}
              </p>
            </div>
            {/* 文件进度 */}
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">文件</p>
              <p className="mt-1 text-sm font-semibold">
                {progress?.filesCompleted ?? 0} / {progress?.filesTotal ?? 0}
              </p>
            </div>
          </div>

          {/* 错误列表 */}
          {progress?.errors && progress.errors.length > 0 && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive mb-1">
                错误信息：
              </p>
              <ul className="text-xs text-destructive/80 list-disc pl-4">
                {progress.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            每 5 秒自动刷新进度
          </p>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：完成面板
  // ============================================================================
  const renderCompletedPanel = () => {
    if (!completedJob) return null

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">备份完成</CardTitle>
              <CardDescription>
                任务 ID: {completedJob.id.slice(0, 8)}...
              </CardDescription>
            </div>
            {getStatusBadge(completedJob.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {completedJob.errorMessage && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  {completedJob.errorMessage}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {/* 完成且有文件时显示下载按钮 */}
              {completedJob.status === 'completed' && (
                <Button onClick={handleDownload}>
                  下载备份文件
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                创建新备份
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：失败面板
  // ============================================================================
  const renderFailedPanel = () => {
    if (!failedError) return null

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">备份失败</CardTitle>
              <CardDescription>任务执行过程中发生错误</CardDescription>
            </div>
            <Badge variant="destructive">失败</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 mb-4">
            <p className="text-sm text-destructive">{failedError}</p>
          </div>
          <Button variant="outline" onClick={handleReset}>
            重新备份
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 主渲染
  // ============================================================================
  return (
    <div className="flex flex-col gap-6">
      {/* 优先级：完成面板 > 失败面板 > 进度面板 > 预估面板 */}
      {renderCompletedPanel()}
      {renderFailedPanel()}
      {renderProgressPanel()}
      {!activeJobId && !completedJob && !failedError && renderEstimatePanel()}
    </div>
  )
}
