'use client'

import { useState } from 'react'
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
import type { ApiResponse } from '@/contracts/api-response.schema'

// ── 类型定义 ──────────────────────────────────────────────

/** 备份任务状态 */
type BackupStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/** 备份预估响应 */
interface BackupEstimate {
  estimatedTables: number
  estimatedRows: number
  estimatedFiles: number
  estimatedTotalBytes: number
  estimatedDurationSeconds: number
  estimatedZipSizeMB: number
}

/** 备份任务响应 */
interface BackupJob {
  id: string
  jobType: 'full_backup'
  status: BackupStatus
  requestedBy: string
  backupFileKey: string | null
  stats: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 备份进度响应 */
interface BackupProgress {
  phase: string | null
  tablesTotal: number
  tablesCompleted: number
  totalRows: number
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  errors: string[]
}

// ── 辅助函数 ──────────────────────────────────────────────

/**
 * Function: formatBytes
 *
 * Description: 将字节数转换为人类可读的大小格式 (KB/MB/GB/TB)
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
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const safeIndex = Math.min(index, units.length - 1)
  return `${(bytes / Math.pow(1024, safeIndex)).toFixed(1)} ${units[safeIndex]}`
}

/**
 * Function: formatDuration
 *
 * Description: 将秒数转换为人类可读的时间格式
 *
 * Parameters:
 * 	seconds(number): 待转换的秒数
 *
 * Returns:
 * 	result(string): 格式化后的时间字符串
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (minutes < 60) return `${minutes} 分 ${remainingSeconds} 秒`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} 小时 ${remainingMinutes} 分`
}

// ── 主组件 ──────────────────────────────────────────────

/**
 * Component: FileBackupTab
 *
 * Description: 文件备份操作界面，提供预估信息展示、创建备份、实时进度轮询和下载功能。
 * 使用 TanStack Query 管理 API 调用和 5 秒轮询进度。
 */
export function FileBackupTab() {
  const queryClient = useQueryClient()

  // 当前备份任务 ID（创建备份后设置）
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // ── 查询：备份预估 ──────────────────────────────────────

  const { data: estimate, isLoading: estimateLoading, error: estimateError } = useQuery<BackupEstimate>({
    queryKey: ['admin', 'data-management', 'backups', 'estimate', 'full_backup'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/data-management/backups/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobType: 'full_backup' }),
      })
      if (!res.ok) {
        throw new Error(`获取预估信息失败: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<BackupEstimate>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    // 有活跃任务时不自动刷新预估
    enabled: !activeJobId,
  })

  // ── 查询：备份进度（5 秒轮询）──────────────────────────

  const { data: progress } = useQuery<BackupProgress>({
    queryKey: ['admin', 'data-management', 'backups', activeJobId, 'stats'],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/admin/data-management/backups/${activeJobId}/stats`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        throw new Error(`获取进度失败: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<BackupProgress>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    // 仅在任务处理中时启用轮询
    enabled: !!activeJobId,
    refetchInterval: 5_000,
  })

  // ── 查询：任务状态（检查完成/失败）───────────────────────

  const { data: jobStatus } = useQuery<BackupJob>({
    queryKey: ['admin', 'data-management', 'backups', activeJobId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/admin/data-management/backups/${activeJobId}`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        throw new Error(`获取任务状态失败: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<BackupJob>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    enabled: !!activeJobId,
    refetchInterval: 5_000,
  })

  const isCompleted = jobStatus?.status === 'completed'
  const isFailed = jobStatus?.status === 'failed'
  const isProcessing = !!activeJobId && !isCompleted && !isFailed

  // ── Mutation：创建备份 ──────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/admin/data-management/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobType: 'full_backup' }),
      })
      if (!res.ok) {
        throw new Error(`创建备份失败: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<BackupJob>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    onSuccess: (data) => {
      setActiveJobId(data.id)
      toast.success('备份任务已创建', {
        description: `任务 ID: ${data.id}`,
      })
    },
    onError: (error) => {
      toast.error('创建备份失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    },
  })

  // ── Mutation：下载备份 ──────────────────────────────────

  const handleDownload = async () => {
    if (!activeJobId) return

    try {
      const res = await fetch(
        `/api/v1/admin/data-management/backups/${activeJobId}/download`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        throw new Error('下载失败')
      }
      const blob = await res.blob()
      // 从响应头获取文件名，或使用默认名
      const contentDisposition = res.headers.get('content-disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `backup-${activeJobId}.zip`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('下载已开始')
    } catch (error) {
      toast.error('下载失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    }
  }

  // ── 重置状态：返回预估面板 ──────────────────────────────

  const handleReset = () => {
    setActiveJobId(null)
    queryClient.invalidateQueries({
      queryKey: ['admin', 'data-management', 'backups', 'estimate'],
    })
  }

  // ── 进度百分比计算 ──────────────────────────────────────

  const fileProgress = progress && progress.filesTotal > 0
    ? Math.round((progress.filesCompleted / progress.filesTotal) * 100)
    : 0

  // ── 渲染：预估面板（初始状态）───────────────────────────

  if (!activeJobId) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">文件备份预估</CardTitle>
            <CardDescription>
              创建全量文件备份前，系统将预估备份范围和耗时
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estimateLoading && (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">正在计算预估信息...</p>
              </div>
            )}

            {estimateError && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-destructive">
                  {estimateError instanceof Error ? estimateError.message : '获取预估信息失败'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ['admin', 'data-management', 'backups', 'estimate'],
                    })
                  }}
                >
                  重试
                </Button>
              </div>
            )}

            {estimate && (
              <div className="flex flex-col gap-4">
                {/* 预估指标网格 */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">预估文件数</p>
                    <p className="text-lg font-semibold">
                      {estimate.estimatedFiles.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">预估总大小</p>
                    <p className="text-lg font-semibold">
                      {formatBytes(estimate.estimatedTotalBytes)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">压缩后大小</p>
                    <p className="text-lg font-semibold">
                      {estimate.estimatedZipSizeMB.toFixed(1)} MB
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">预估耗时</p>
                    <p className="text-lg font-semibold">
                      {formatDuration(estimate.estimatedDurationSeconds)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">涉及数据表</p>
                    <p className="text-lg font-semibold">
                      {estimate.estimatedTables}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">预估行数</p>
                    <p className="text-lg font-semibold">
                      {estimate.estimatedRows.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 创建备份按钮 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? '创建中...' : '创建文件备份'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── 渲染：错误状态 ──────────────────────────────────────

  if (isFailed) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备份失败</CardTitle>
            <CardDescription>
              文件备份任务执行过程中出现错误
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-6">
              <Badge variant="destructive">失败</Badge>
              {jobStatus?.errorMessage && (
                <p className="text-sm text-destructive max-w-md text-center">
                  {jobStatus.errorMessage}
                </p>
              )}
              {progress?.errors && progress.errors.length > 0 && (
                <div className="w-full max-w-md">
                  <p className="text-xs text-muted-foreground mb-2">错误详情：</p>
                  <ul className="text-xs text-destructive flex flex-col gap-1">
                    {progress.errors.map((err, i) => (
                      <li key={i} className="rounded bg-destructive/10 px-2 py-1">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" onClick={handleReset}>
                返回重新备份
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── 渲染：完成状态 ──────────────────────────────────────

  if (isCompleted) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备份完成</CardTitle>
            <CardDescription>
              文件备份任务已成功完成
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* 完成统计 */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">文件数</p>
                  <p className="text-lg font-semibold">
                    {progress ? progress.filesCompleted.toLocaleString() : '-'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">传输大小</p>
                  <p className="text-lg font-semibold">
                    {progress ? formatBytes(progress.bytesTransferred) : '-'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">状态</p>
                  <Badge variant="default">已完成</Badge>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleReset}>
                  创建新备份
                </Button>
                <Button onClick={handleDownload}>
                  下载备份文件
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── 渲染：进度面板（处理中）─────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">备份进行中</CardTitle>
              <CardDescription>
                {progress?.phase ? `当前阶段: ${progress.phase}` : '正在准备...'}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {isProcessing ? '处理中' : '等待中'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* 进度条 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">文件进度</span>
                <span className="font-medium">{fileProgress}%</span>
              </div>
              <Progress value={fileProgress} />
            </div>

            {/* 实时统计 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">已完成文件</p>
                <p className="text-lg font-semibold">
                  {progress
                    ? `${progress.filesCompleted.toLocaleString()} / ${progress.filesTotal.toLocaleString()}`
                    : '-'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">已传输</p>
                <p className="text-lg font-semibold">
                  {progress ? formatBytes(progress.bytesTransferred) : '-'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">数据表</p>
                <p className="text-lg font-semibold">
                  {progress
                    ? `${progress.tablesCompleted} / ${progress.tablesTotal}`
                    : '-'}
                </p>
              </div>
            </div>

            {/* 错误列表（如有） */}
            {progress?.errors && progress.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 p-3">
                <p className="text-xs text-destructive font-medium mb-1">
                  错误 ({progress.errors.length})
                </p>
                <ul className="text-xs text-destructive flex flex-col gap-1">
                  {progress.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {progress.errors.length > 5 && (
                    <li className="text-muted-foreground">
                      ...还有 {progress.errors.length - 5} 条错误
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* 等待提示 */}
            <p className="text-xs text-muted-foreground text-center">
              每 5 秒自动刷新进度，请勿关闭此页面
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
