'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// 类型定义
// ============================================================================

/** 备份任务统计信息 */
interface BackupStats {
  phase: string | null
  tablesTotal: number
  tablesCompleted: number
  totalRows: number
  filesTotal: number
  filesCompleted: number
  bytesTransferred: number
  errors: string[]
}

// ============================================================================
// 常量
// ============================================================================

/** 最大文件大小：500MB */
const MAX_FILE_SIZE = 500 * 1024 * 1024

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 2000

/** 二次确认文本 */
const CONFIRM_TEXT = '确认导入'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * Function: formatFileSize
 *
 * Description: 将字节数转换为人类可读的大小字符串（如 1.5 GB）
 *
 * Parameters:
 * 	bytes(number): 待转换的字节数
 *
 * Returns:
 * 	result(string): 格式化后的大小字符串
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Function: formatPercent
 *
 * Description: 计算当前值占总值的百分比（取整）
 *
 * Parameters:
 * 	current(number): 当前值
 * 	total(number): 总值
 *
 * Returns:
 * 	result(number): 百分比（0-100）
 */
function formatPercent(current: number, total: number): number {
  if (total === 0) return 0
  return Math.round((current / total) * 100)
}

// ============================================================================
// API 请求函数
// ============================================================================

/**
 * Function: uploadAndImport
 *
 * Description: 上传 ZIP 文件并创建恢复任务
 *
 * Parameters:
 * 	file(File): 待上传的 ZIP 文件
 *
 * Returns:
 * 	result(Promise<{ id: string; status: string }>): 包含任务 ID 和状态的对象
 */
async function uploadAndImport(file: File): Promise<{ id: string; status: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/v1/admin/data-management/import', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.error?.message ?? `上传失败 (${res.status})`)
  }

  const json = await res.json()
  return json.data
}

/**
 * Function: fetchJobStats
 *
 * Description: 获取指定任务的进度统计信息
 *
 * Parameters:
 * 	jobId(string): 任务 ID
 *
 * Returns:
 * 	result(Promise<BackupStats | null>): 进度统计信息，失败时返回 null
 */
async function fetchJobStats(jobId: string): Promise<BackupStats | null> {
  const res = await fetch(`/api/v1/admin/data-management/backups/${jobId}/stats`, {
    credentials: 'include',
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data
}

/**
 * Function: fetchActiveRestoreJob
 *
 * Description: 获取当前活跃的恢复任务（页面刷新时恢复进度）
 *
 * Returns:
 * 	result(Promise<{ id: string } | null>): 活跃任务信息，无活跃任务时返回 null
 */
async function fetchActiveRestoreJob(): Promise<{ id: string } | null> {
  const res = await fetch('/api/v1/admin/data-management/backups?status=processing&jobType=full_restore&limit=1', {
    credentials: 'include',
  })
  if (!res.ok) return null
  const json = await res.json()
  const items = json.data?.items as Array<{ id: string }> | undefined
  return items && items.length > 0 ? items[0] : null
}

// ============================================================================
// 主组件
// ============================================================================

/** 导入流程的阶段 */
type ImportPhase =
  | 'idle'        // 初始状态
  | 'selected'    // 文件已选择
  | 'confirming'  // 等待二次确认
  | 'uploading'   // 文件上传中
  | 'processing'  // 后端处理中（轮询进度）
  | 'completed'   // 导入完成
  | 'failed'      // 导入失败

/**
 * Component: DataImportTab
 *
 * Description: 数据导入操作面板。用户上传 ZIP 备份文件后自动启动恢复流程，
 * 包含文件选择（拖拽/点击）、二次确认、进度轮询、完成/失败展示等完整流程。
 */
export function DataImportTab() {
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ---- 页面加载时检查是否有活跃的恢复任务（刷新恢复进度） ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const job = await fetchActiveRestoreJob()
        if (!cancelled && job) {
          setActiveJobId(job.id)
          setPhase('processing')
        }
      } catch {
        // 忽略错误，不影响页面显示
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ---- 轮询进度（仅在 processing 阶段且有 activeJobId 时启用） ----
  useEffect(() => {
    if (!activeJobId || phase !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const jobStats = await fetchJobStats(activeJobId)
        if (jobStats) {
          setStats(jobStats)

          // 通过查询任务详情判断终态
          const detailRes = await fetch(`/api/v1/admin/data-management/backups/${activeJobId}`, {
            credentials: 'include',
          })
          if (detailRes.ok) {
            const detailJson = await detailRes.json()
            const status = detailJson.data?.status
            if (status === 'completed') {
              setPhase('completed')
              toast.success('数据导入完成')
              return
            }
            if (status === 'failed') {
              setPhase('failed')
              setErrorMessage(detailJson.data?.errorMessage ?? '导入失败，请查看日志')
              toast.error('数据导入失败')
              return
            }
          }
        }
      } catch {
        // 轮询错误不中断
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [activeJobId, phase])

  // ---- 上传 mutation ----
  const importMutation = useMutation({
    mutationFn: () => uploadAndImport(selectedFile!),
    onSuccess: (data) => {
      setActiveJobId(data.id)
      setPhase('processing')
      toast.success('文件上传成功，开始恢复数据')
    },
    onError: (error: Error) => {
      setPhase('failed')
      setErrorMessage(error.message)
      toast.error(`导入失败: ${error.message}`)
    },
  })

  // ---- 文件选择处理 ----
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('请选择 ZIP 格式的文件')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`文件大小超过限制（最大 ${formatFileSize(MAX_FILE_SIZE)}）`)
      return
    }
    setSelectedFile(file)
    setPhase('selected')
    setErrorMessage(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // ---- 确认对话框处理 ----
  const handleConfirm = useCallback(() => {
    if (confirmInput !== CONFIRM_TEXT) return
    setPhase('uploading')
    importMutation.mutate()
  }, [confirmInput, importMutation])

  // ---- 重置到初始状态 ----
  const handleReset = useCallback(() => {
    setPhase('idle')
    setSelectedFile(null)
    setConfirmInput('')
    setActiveJobId(null)
    setStats(null)
    setErrorMessage(null)
  }, [])

  // ── 进度计算 ────────────────────────────────────────
  const tableProgress = stats ? formatPercent(stats.tablesCompleted, stats.tablesTotal) : 0
  const fileProgress = stats ? formatPercent(stats.filesCompleted, stats.filesTotal) : 0

  // ============================================================================
  // 渲染：初始状态 - 上传区域
  // ============================================================================
  const renderUploadArea = () => {
    if (phase !== 'idle' && phase !== 'selected') return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">上传备份文件</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* 拖拽上传区域 */}
          <div
            role="button"
            tabIndex={0}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('import-file-input')?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                document.getElementById('import-file-input')?.click()
              }
            }}
          >
            <Upload className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              拖拽 ZIP 文件到此处，或点击选择文件
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              支持通过备份功能生成的 ZIP 文件（最大 {formatFileSize(MAX_FILE_SIZE)}）
            </p>
            <input
              id="import-file-input"
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {/* 已选择的文件信息 */}
          {selectedFile && phase === 'selected' && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <FileArchive className="size-8 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPhase('idle')
                  setSelectedFile(null)
                }}
              >
                移除
              </Button>
            </div>
          )}

          {/* 开始导入按钮 */}
          {selectedFile && phase === 'selected' && (
            <Button
              className="w-full"
              onClick={() => {
                setPhase('confirming')
                setConfirmInput('')
              }}
            >
              开始导入
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：上传中
  // ============================================================================
  const renderUploading = () => {
    if (phase !== 'uploading') return null

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium">正在上传文件...</p>
          <p className="text-xs text-muted-foreground">请勿关闭页面</p>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：处理中 - 进度面板
  // ============================================================================
  const renderProcessing = () => {
    if (phase !== 'processing') return null

    // 还没有拿到 stats，显示启动中状态
    if (!stats) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm font-medium">正在启动恢复流程...</p>
            <p className="text-xs text-muted-foreground">即将开启维护模式并开始数据恢复</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据导入进行中</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* 维护模式提示 */}
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-sm">
              网站当前处于维护模式，导入完成后将自动恢复。
            </AlertDescription>
          </Alert>

          {/* 数据库恢复进度 */}
          {stats.tablesTotal > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>数据库恢复</span>
                <span className="text-muted-foreground">
                  {stats.tablesCompleted}/{stats.tablesTotal} 表 · {stats.totalRows.toLocaleString()} 行
                </span>
              </div>
              <Progress value={tableProgress} />
            </div>
          )}

          {/* 文件恢复进度 */}
          {stats.filesTotal > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>文件恢复</span>
                <span className="text-muted-foreground">
                  {stats.filesCompleted}/{stats.filesTotal} 文件 · {formatFileSize(stats.bytesTransferred)}
                </span>
              </div>
              <Progress value={fileProgress} />
            </div>
          )}

          {/* 当前阶段 */}
          {stats.phase && (
            <p className="text-xs text-muted-foreground">当前阶段: {stats.phase}</p>
          )}

          {/* 错误信息 */}
          {stats.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">错误信息:</p>
              {stats.errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive">{err}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            导入过程中请勿关闭页面，后台任务将持续执行。
          </p>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：完成
  // ============================================================================
  const renderCompleted = () => {
    if (phase !== 'completed') return null

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <CheckCircle2 className="size-10 text-green-500" />
          <p className="text-sm font-medium">数据导入完成</p>
          <p className="text-xs text-muted-foreground">网站已自动退出维护模式</p>
          <Button variant="outline" onClick={handleReset}>
            再次导入
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // 渲染：失败
  // ============================================================================
  const renderFailed = () => {
    if (phase !== 'failed') return null

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <XCircle className="size-10 text-destructive" />
          <p className="text-sm font-medium">数据导入失败</p>
          {errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            请检查文件是否有效，或查看服务日志获取详细信息
          </p>
          <Button variant="outline" onClick={handleReset}>
            重新导入
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
      {/* 风险警告 */}
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription className="text-sm">
          <strong>警告：</strong>数据导入将<strong>覆盖现有数据</strong>。
          导入期间网站将自动进入<strong>维护模式</strong>，所有用户无法访问。
          请确保已提前创建备份。
        </AlertDescription>
      </Alert>

      {/* 各阶段面板 */}
      {renderUploadArea()}
      {renderUploading()}
      {renderProcessing()}
      {renderCompleted()}
      {renderFailed()}

      {/* 二次确认对话框 */}
      <Dialog open={phase === 'confirming'} onOpenChange={(open) => !open && setPhase('selected')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认数据导入</DialogTitle>
            <DialogDescription>
              此操作将覆盖现有数据，且导入期间网站将进入维护模式。
              请确保已提前创建备份。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              请输入 <strong>{CONFIRM_TEXT}</strong> 以确认操作
            </p>
            <input
              type="text"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder={CONFIRM_TEXT}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhase('selected')}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={confirmInput !== CONFIRM_TEXT}
              onClick={handleConfirm}
            >
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
