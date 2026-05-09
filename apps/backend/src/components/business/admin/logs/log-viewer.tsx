'use client'

import { useState, useCallback, useMemo, memo, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  RefreshCw,
  FileText,
  List,
  Settings,
  Play,
  Pause,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Clock,
  Hash,
  User,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// 从契约层导入类型，避免重复定义
import type {
  LogLevel,
  LogEntry,
  LogConfigResponse,
  GetLogsResponse,
} from '@/contracts/dtos/admin/logs.dto'

/**
 * 日志配置类型（组件内使用，字段名与 API 响应对应）
 */
type LogConfig = LogConfigResponse

/**
 * 日志列表响应类型（组件内使用，字段名与 API 响应对应）
 */
type LogsResponse = GetLogsResponse

/**
 * 级别配置 - 颜色、图标、样式
 */
const levelConfig: Record<LogLevel, {
  colors: { bg: string; text: string; badge: string; border: string }
  icon: typeof Bug
  label: string
}> = {
  debug: {
    colors: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      badge: 'bg-muted text-muted-foreground border-border',
      border: 'border-l-muted-foreground/50',
    },
    icon: Bug,
    label: 'DEBUG',
  },
  info: {
    colors: {
      bg: 'bg-info/10',
      text: 'text-info',
      badge: 'bg-info/10 text-info border-info/30',
      border: 'border-l-info',
    },
    icon: Info,
    label: 'INFO',
  },
  warn: {
    colors: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      badge: 'bg-warning/10 text-warning border-warning/30',
      border: 'border-l-warning',
    },
    icon: AlertTriangle,
    label: 'WARN',
  },
  error: {
    colors: {
      bg: 'bg-error/10',
      text: 'text-error',
      badge: 'bg-error/10 text-error border-error/30',
      border: 'border-l-error',
    },
    icon: AlertCircle,
    label: 'ERROR',
  },
}

/**
 * 格式化时间为本地时间
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

/**
 * 格式化完整日期时间
 */
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

/**
Function: formatJsonForDisplay

Description: 将未知对象格式化为可阅读的 JSON 文本

Parameters:
	value(unknown): 待格式化的数据

Returns:
	text(string): 格式化后的文本
*/
function formatJsonForDisplay(value: unknown): string {
  try {
    if (typeof value === 'string') {
      return value
    }

    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
Function: LogItem

Description: 单条日志显示组件，使用 memo 优化避免不必要的重渲染

Parameters:
	log(LogEntry): 日志条目数据

Returns:
	element(React.ReactElement): 日志条目组件
*/
const LogItem = memo(function LogItem({ log }: { log: LogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = levelConfig[log.level]
  const Icon = config.icon
  const methodLabel = log.method ?? '-'
  const pathLabel = log.pathname ?? '-'
  const statusCode = typeof log.statusCode === 'number' ? log.statusCode : null
  const durationMs = typeof log.durationMs === 'number' ? log.durationMs : null

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded((prev) => !prev)
    }
  }, [])

  return (
    <div
      className={cn(
        'group relative border-l-2 pl-3 pr-2 py-2 transition-colors duration-200 cursor-pointer',
        'hover:bg-muted/50',
        config.colors.bg,
        config.colors.border,
        // 使用 content-visibility 优化长列表渲染
        'content-visibility-auto',
        '[contain-intrinsic-size:0_60px]'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* 主行 */}
      <div className="flex items-center gap-2.5">
        {/* 时间 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {formatTime(log.time)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-mono">
            {formatDateTime(log.time)}
          </TooltipContent>
        </Tooltip>

        {/* 级别徽章 */}
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0 h-5 shrink-0 border',
            config.colors.badge
          )}
        >
          <Icon className="h-2.5 w-2.5 mr-1" />
          {config.label}
        </Badge>

        {/* 路径与状态摘要 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono shrink-0">
            {methodLabel}
          </Badge>
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-foreground/80 flex-1 min-w-0 truncate">
            {pathLabel}
          </code>
          {statusCode !== null && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-5 font-mono shrink-0',
                statusCode >= 500
                  ? 'border-error/30 text-error'
                  : statusCode >= 400
                    ? 'border-warning/30 text-warning'
                    : 'border-success/30 text-success'
              )}
            >
              {statusCode}
            </Badge>
          )}
          {durationMs !== null && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono shrink-0">
              {durationMs}ms
            </Badge>
          )}
        </div>

        {/* 消息（右侧） */}
        <span
          className={cn(
            'text-xs font-mono leading-relaxed shrink-0 max-w-[40%] truncate text-right',
            config.colors.text
          )}
          title={log.msg}
        >
          {log.msg}
        </span>

        {/* 展开指示器 */}
        <span
          className={cn(
            'text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
            isExpanded && 'opacity-100'
          )}
        >
          {isExpanded ? '收起' : '展开'}
        </span>
      </div>

      {/* 展开的详情 - 使用 content-visibility 延迟渲染 */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5 text-xs font-mono text-muted-foreground">
          {/* 元数据网格 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {log.traceId && (
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 shrink-0" />
                <span className="text-foreground/70">traceId:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{log.traceId}</code>
              </div>
            )}
            {log.userId && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                <span className="text-foreground/70">userId:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{log.userId}</code>
              </div>
            )}
            {log.method && log.pathname && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Globe className="h-3 w-3 shrink-0" />
                <code className="bg-muted/50 px-1 rounded text-foreground/90">
                  {log.method} {log.pathname}
                </code>
              </div>
            )}
            {statusCode !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-foreground/70">status:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{statusCode}</code>
              </div>
            )}
            {durationMs !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-foreground/70">duration:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{durationMs}ms</code>
              </div>
            )}
            {log.ip && (
              <div className="flex items-center gap-1.5">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="text-foreground/70">ip:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{log.ip}</code>
              </div>
            )}
            {log.action && (
              <div className="flex items-center gap-1.5">
                <Play className="h-3 w-3 shrink-0" />
                <span className="text-foreground/70">action:</span>
                <code className="bg-muted/50 px-1 rounded text-foreground/90">{log.action}</code>
              </div>
            )}
          </div>

          {/* 错误详情 */}
          {log.err && (
            <div className="mt-2 p-2 rounded-md bg-error/10 border border-error/20">
              <div className="flex items-start gap-2 text-error">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{log.err.message}</p>
                  {log.err.stack && (
                    <pre className="mt-1.5 text-[10px] overflow-x-auto whitespace-pre-wrap text-error/80 leading-relaxed">
                      {log.err.stack.split('\n').slice(0, 8).join('\n')}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 请求详情 */}
          {log.request !== undefined && (
            <div className="mt-2 p-2 rounded-md bg-info/10 border border-info/20">
              <div className="flex items-center gap-1.5 text-info mb-1">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Request</span>
              </div>
              <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap text-info/90 leading-relaxed">
                {formatJsonForDisplay(log.request)}
              </pre>
            </div>
          )}

          {/* 响应详情 */}
          {log.response !== undefined && (
            <div className="mt-2 p-2 rounded-md bg-success/10 border border-success/20">
              <div className="flex items-center gap-1.5 text-success mb-1">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Response</span>
              </div>
              <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap text-success/90 leading-relaxed">
                {formatJsonForDisplay(log.response)}
              </pre>
            </div>
          )}

          {/* 动作时间线 */}
          {Array.isArray(log.actions) && log.actions.length > 0 && (
            <div className="mt-2 p-2 rounded-md bg-muted/40 border border-border/60">
              <div className="flex items-center gap-1.5 mb-2">
                <List className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground/90">Actions</span>
              </div>
              <div className="space-y-1.5">
                {log.actions.map((item, index) => (
                  <div
                    key={`${item.time}-${item.msg}-${index}`}
                    className="grid grid-cols-[72px_56px_1fr] gap-2 items-start text-[10px]"
                  >
                    <span className="text-muted-foreground">{formatTime(item.time)}</span>
                    <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase justify-center">
                      {item.level}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-foreground/90 break-all">{item.msg}</p>
                      <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                        {item.action && <span>action: {item.action}</span>}
                        {item.layer && <span>layer: {item.layer}</span>}
                        {typeof item.statusCode === 'number' && <span>status: {item.statusCode}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * 获取日志配置
 */
async function fetchLogConfig(): Promise<LogConfig> {
  const response = await fetch('/api/v1/admin/logs/config')
  const data = await response.json()
  if (!data.success) throw new Error(data.error?.message)
  return data.data
}

/**
 * 获取日志列表
 */
async function fetchLogs(level?: LogLevel): Promise<LogsResponse> {
  const params = new URLSearchParams()
  if (level) {
    params.set('level', level)
  }
  params.set('limit', '200')

  const response = await fetch(`/api/v1/admin/logs?${params.toString()}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error?.message)
  return data.data
}

/**
 * 更新日志级别
 */
async function updateLogLevel(level: LogLevel): Promise<{ previousLevel: LogLevel; currentLevel: LogLevel }> {
  const response = await fetch('/api/v1/admin/logs/level', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error?.message)
  return data.data
}

/**
Function: LogViewer

Description: 日志查看器主组件，使用 TanStack Query 优化数据获取

Parameters:

Returns:
	element(React.ReactElement): 日志查看器组件
*/
export function LogViewer() {
  const queryClient = useQueryClient()
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isPending, startTransitionFn] = useTransition()

  // 使用 TanStack Query 获取日志配置
  const { data: config } = useQuery({
    queryKey: ['admin', 'logs', 'config'],
    queryFn: fetchLogConfig,
    staleTime: 30 * 1000, // 30 秒内不重新获取
  })

  // 使用 TanStack Query 获取日志列表
  const {
    data: logsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'logs', filterLevel === 'all' ? undefined : filterLevel],
    queryFn: () => fetchLogs(filterLevel === 'all' ? undefined : filterLevel),
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 2 * 1000, // 2 秒内不重新获取
  })

  // 使用 mutation 更新日志级别
  const levelMutation = useMutation({
    mutationFn: updateLogLevel,
    onSuccess: (data) => {
      // 更新本地缓存
      queryClient.setQueryData(['admin', 'logs', 'config'], (old: LogConfig | undefined) =>
        old ? { ...old, currentLevel: data.currentLevel } : old
      )
      toast.success(`日志级别已更新为 ${data.currentLevel}`, {
        description: `原级别: ${data.previousLevel}`,
      })
    },
    onError: (error: Error) => {
      toast.error('更新日志级别失败', { description: error.message })
    },
  })

  // 使用 startTransition 处理筛选变更，保持 UI 响应
  const handleFilterChange = useCallback((value: string) => {
    startTransitionFn(() => {
      setFilterLevel(value as LogLevel | 'all')
    })
  }, [startTransitionFn])

  // 使用 startTransition 处理自动刷新切换
  const handleAutoRefreshChange = useCallback((checked: boolean) => {
    startTransitionFn(() => {
      setAutoRefresh(checked)
    })
  }, [startTransitionFn])

  // 手动刷新
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // 更新日志级别
  const handleLevelChange = useCallback((level: string) => {
    levelMutation.mutate(level as LogLevel)
  }, [levelMutation])

  // 计算派生数据
  const logs = useMemo(() => logsData?.logs ?? [], [logsData?.logs])
  const logFile = logsData?.logFile ?? ''
  const totalRead = logsData?.totalRead ?? 0
  const currentLevel = config?.currentLevel ?? 'info'

  // 使用 useMemo 缓存过滤结果和统计
  const filteredLogs = useMemo(
    () => (filterLevel === 'all' ? logs : logs.filter((log) => log.level === filterLevel)),
    [logs, filterLevel]
  )

  // 统计各级别数量
  const levelCounts = useMemo(
    () => ({
      debug: logs.filter((l) => l.level === 'debug').length,
      info: logs.filter((l) => l.level === 'info').length,
      warn: logs.filter((l) => l.level === 'warn').length,
      error: logs.filter((l) => l.level === 'error').length,
    }),
    [logs]
  )

  const isRefreshing = isFetching || isPending

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* 控制面板 */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  日志管理
                </CardTitle>
                <CardDescription className="mt-1">
                  查看系统运行日志，动态调整日志级别
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* 刷新按钮 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="gap-1.5"
                    >
                      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                      刷新
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>手动刷新日志列表</TooltipContent>
                </Tooltip>

                {/* 自动刷新开关 */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 bg-muted/30">
                  {autoRefresh ? (
                    <Pause className="h-4 w-4 text-warning" />
                  ) : (
                    <Play className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                    自动
                  </Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={handleAutoRefreshChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-4">
              {/* 日志级别调整 */}
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">运行时级别:</Label>
                <Select value={currentLevel} onValueChange={handleLevelChange}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">debug</SelectItem>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warn">warn</SelectItem>
                    <SelectItem value="error">error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-px h-6 bg-border/50 hidden sm:block" />

              {/* 筛选 */}
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">显示级别:</Label>
                <Select value={filterLevel} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="debug">debug</SelectItem>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warn">warn</SelectItem>
                    <SelectItem value="error">error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 状态栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">
                {logFile || '无日志文件'}
              </code>
            </span>
            <span>
              显示 <strong className="text-foreground">{filteredLogs.length}</strong> 条
              {filterLevel !== 'all' && ` (共 ${totalRead} 条)`}
            </span>
          </div>

          {/* 级别统计 - 可点击筛选 */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-[10px] cursor-pointer transition-colors hover:bg-muted', levelConfig.debug.colors.badge)}
              onClick={() => handleFilterChange(filterLevel === 'debug' ? 'all' : 'debug')}
            >
              debug: {levelCounts.debug}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] cursor-pointer transition-colors hover:bg-info/20', levelConfig.info.colors.badge)}
              onClick={() => handleFilterChange(filterLevel === 'info' ? 'all' : 'info')}
            >
              info: {levelCounts.info}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] cursor-pointer transition-colors hover:bg-warning/20', levelConfig.warn.colors.badge)}
              onClick={() => handleFilterChange(filterLevel === 'warn' ? 'all' : 'warn')}
            >
              warn: {levelCounts.warn}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-[10px] cursor-pointer transition-colors hover:bg-error/20', levelConfig.error.colors.badge)}
              onClick={() => handleFilterChange(filterLevel === 'error' ? 'all' : 'error')}
            >
              error: {levelCounts.error}
            </Badge>
          </div>
        </div>

        {/* 日志列表 */}
        <Card className="overflow-hidden border-border/50">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">暂无日志记录</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {filterLevel !== 'all' ? '尝试切换筛选条件' : '日志文件可能为空'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-150">
              <div className="divide-y divide-border/30">
                {filteredLogs.map((log, index) => (
                  <LogItem key={`${log.time}-${index}`} log={log} />
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* 底部提示 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground/70 px-1">
          <span>点击日志条目展开详情</span>
          <span>最多显示 500 条记录</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
