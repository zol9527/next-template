import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { getLogLevel, getLogConfig, setLogLevel } from '@/lib/logger/level-manager'
import type { LogLevel, LogEntry, GetLogsResponse, SetLogLevelResponse, LogConfigResponse } from '@/contracts/dtos/admin/logs.dto'
import type { ServiceContext } from '@/types/service/service-context'

const TERMINAL_REQUEST_MESSAGES = new Set([
  'request.completed',
  'request.failed',
  'request.validation_failed',
])

const APP_LOG_FILE_PATTERN = /^app(?:-\d{4}-\d{2}-\d{2}(?:\.\d+)?)?\.log$/

/**
Function: toIsoTime

Description: 将日志时间值标准化为 ISO 字符串

Parameters:
  value(unknown): 原始时间值

Returns:
  isoTime(string): 标准化后的 ISO 时间
*/
function toIsoTime(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  return new Date().toISOString()
}

/**
Function: toTimestamp

Description: 将时间字符串转换为时间戳，失败时返回 0

Parameters:
  isoTime(string): ISO 时间字符串

Returns:
  timestamp(number): 毫秒级时间戳
*/
function toTimestamp(isoTime: string): number {
  const value = Date.parse(isoTime)
  return Number.isNaN(value) ? 0 : value
}

/**
Function: aggregateLogsByRequest

Description: 将原始日志按 traceId 聚合为单请求日志项，并生成动作时间线

Parameters:
  logs(LogEntry[]): 原始日志列表

Returns:
  aggregated(LogEntry[]): 聚合后的请求日志列表
*/
function aggregateLogsByRequest(logs: LogEntry[]): LogEntry[] {
  const traceBuckets = new Map<string, LogEntry[]>()
  const standaloneLogs: LogEntry[] = []

  for (const log of logs) {
    if (!log.traceId) {
      standaloneLogs.push(log)
      continue
    }

    const existing = traceBuckets.get(log.traceId)
    if (existing) {
      existing.push(log)
    } else {
      traceBuckets.set(log.traceId, [log])
    }
  }

  const aggregated: LogEntry[] = []

  for (const [, events] of traceBuckets) {
    if (events.length === 0) continue

    const orderedEvents = [...events].sort((a, b) => toTimestamp(a.time) - toTimestamp(b.time))
    const firstEvent = orderedEvents[0]!

    const terminalEvent = [...orderedEvents]
      .reverse()
      .find((item) => TERMINAL_REQUEST_MESSAGES.has(item.msg))

    const summaryEvent = terminalEvent ?? orderedEvents[orderedEvents.length - 1]!

    const mergedRequest = summaryEvent.request
      ?? [...orderedEvents].reverse().find((item) => item.request !== undefined)?.request
    const mergedResponse = summaryEvent.response
      ?? [...orderedEvents].reverse().find((item) => item.response !== undefined)?.response

    const actions = orderedEvents.map((item) => ({
      time: item.time,
      level: item.level,
      action: item.action,
      msg: item.msg,
      layer: item.layer,
      statusCode: item.statusCode,
    }))

    aggregated.push({
      ...summaryEvent,
      time: summaryEvent.time ?? firstEvent.time,
      level: summaryEvent.level ?? firstEvent.level,
      msg: summaryEvent.msg ?? firstEvent.msg,
      traceId: summaryEvent.traceId ?? firstEvent.traceId,
      userId: summaryEvent.userId ?? firstEvent.userId,
      method: summaryEvent.method ?? firstEvent.method,
      pathname: summaryEvent.pathname ?? firstEvent.pathname,
      ip: summaryEvent.ip ?? firstEvent.ip,
      action: summaryEvent.action ?? firstEvent.action,
      statusCode: summaryEvent.statusCode,
      durationMs: summaryEvent.durationMs,
      errorCode: summaryEvent.errorCode,
      errorMessage: summaryEvent.errorMessage,
      request: mergedRequest,
      response: mergedResponse,
      actions,
    })
  }

  const normalizedStandalone = standaloneLogs.map((item) => ({
    ...item,
    actions: item.actions ?? [
      {
        time: item.time,
        level: item.level,
        action: item.action,
        msg: item.msg,
        layer: item.layer,
        statusCode: item.statusCode,
      },
    ],
  }))

  return [...aggregated, ...normalizedStandalone].sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time))
}

/**
Function: createLogViewerService

Description: 创建日志查看服务实例，提供日志读取和级别管理功能

Parameters:
	ctx(ServiceContext): 服务上下文

Returns:
	service(object): 日志查看服务实例
*/
export function createLogViewerService(ctx: ServiceContext) {
  const { logger } = ctx
  const { logDir } = getLogConfig()

  return {
    /**
    Function: getConfig

    Description: 获取当前日志配置信息

    Parameters:

    Returns:
      config(LogConfigResponse): 日志配置信息
    */
    getConfig(): LogConfigResponse {
      const currentLogFile = this.getCurrentLogFile()
      return {
        currentLevel: getLogLevel(),
        availableLevels: ['debug', 'info', 'warn', 'error'],
        logDirectory: logDir,
        currentLogFile: currentLogFile ?? '无日志文件',
      }
    },

    /**
    Function: getCurrentLogFile

    Description: 获取当前活跃的日志文件路径（处理文件轮转）

    Parameters:

    Returns:
      filePath(string | null): 当前日志文件名，如果没有则返回 null
    */
    getCurrentLogFile(): string | null {
      try {
        // 检查日志目录是否存在
        if (!fs.existsSync(logDir)) {
          logger.warn({ logDir }, '日志目录不存在')
          return null
        }

        // 读取目录下所有 .log 文件
        const files = fs.readdirSync(logDir).filter((f) => f.endsWith('.log'))

        if (files.length === 0) {
          return null
        }

        // 优先选择结构化应用日志，避免读到 PM2 的 out/error 文本日志导致解析为空
        const appFiles = files.filter((f) => APP_LOG_FILE_PATTERN.test(f))
        const candidates = appFiles.length > 0 ? appFiles : files

        // 按修改时间排序，返回最新的文件
        const sortedFiles = candidates
          .map((f) => {
            try {
              return {
                name: f,
                mtime: fs.statSync(path.join(logDir, f)).mtime.getTime(),
              }
            } catch {
              return null
            }
          })
          .filter((item): item is { name: string; mtime: number } => item !== null)
          .sort((a, b) => b.mtime - a.mtime)

        return sortedFiles[0]?.name ?? null
      } catch (error) {
        logger.error({ error, logDir }, '获取日志文件失败')
        return null
      }
    },

    /**
    Function: getRecentLogs

    Description: 读取最近的日志条目

    Parameters:
      level(LogLevel | undefined): 可选的日志级别过滤
      limit(number): 返回条数限制

    Returns:
      result(GetLogsResponse): 日志列表和元数据
    */
    async getRecentLogs(level?: LogLevel, limit = 200): Promise<GetLogsResponse> {
      const currentLogFile = this.getCurrentLogFile()

      if (!currentLogFile) {
        return {
          logs: [],
          currentLevel: getLogLevel(),
          logFile: '无日志文件',
          totalRead: 0,
        }
      }

      const filePath = path.join(logDir, currentLogFile)
      const rawLogs = await this.readLastNLogs(filePath, undefined, Math.min(limit * 12, 2000))
      const aggregatedLogs = aggregateLogsByRequest(rawLogs)
      const filteredLogs = level
        ? aggregatedLogs.filter((log) => log.level === level)
        : aggregatedLogs
      // 最新日志已在数组前面，取前 limit 条
      const logs = filteredLogs.slice(0, limit)

      return {
        logs,
        currentLevel: getLogLevel(),
        logFile: currentLogFile,
        totalRead: logs.length,
      }
    },

    /**
    Function: readLastNLogs

    Description: 从文件流式读取最后 N 条有效日志，使用有界循环缓冲区避免内存溢出

    Parameters:
      filePath(string): 日志文件路径
      level(LogLevel | undefined): 可选的日志级别过滤
      limit(number): 返回条数限制

    Returns:
      logs(LogEntry[]): 日志条目数组
    */
    async readLastNLogs(filePath: string, level?: LogLevel, limit = 200): Promise<LogEntry[]> {
      return new Promise((resolve) => {
        // 使用有界循环缓冲区，只保留最后 limit * 2 条匹配的日志
        // 乘以 2 是为了在过滤时有足够的候选条目
        const bufferSize = Math.min(limit * 2, 6000)
        const buffer: LogEntry[] = []

        try {
          // 使用 readline 逐行读取
          const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
          const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
          })

          rl.on('line', (line) => {
            const parsed = this.parseLogLine(line)

            if (parsed) {
              // 如果指定了级别过滤，只保留匹配的
              if (level && parsed.level !== level) {
                return
              }

              // 添加到缓冲区
              buffer.push(parsed)

              // 如果缓冲区超过大小，移除最旧的条目
              if (buffer.length > bufferSize) {
                buffer.shift()
              }
            }
          })

          rl.on('close', () => {
            // 缓冲区中的条目已经是最新的 limit * 2 条
            // 取最后 limit 条返回
            const results = buffer.slice(-limit)
            resolve(results)
          })

          rl.on('error', (error) => {
            logger.error({ error, filePath }, '读取日志文件失败')
            // 返回已读取的条目
            resolve(buffer.slice(-limit))
          })
        } catch (error) {
          logger.error({ error, filePath }, '打开日志文件失败')
          resolve([])
        }
      })
    },

    /**
    Function: parseLogLine

    Description: 解析单行 JSON 格式日志

    Parameters:
      line(string): 日志行内容

    Returns:
      entry(LogEntry | null): 解析后的日志条目，解析失败返回 null
    */
    parseLogLine(line: string): LogEntry | null {
      if (!line || !line.trim()) {
        return null
      }

      try {
        const parsed = JSON.parse(line)

        // 确保是有效的 pino 日志格式
        if (typeof parsed.level !== 'number' && typeof parsed.level !== 'string') {
          return null
        }

        // 将数字级别转换为字符串
        const levelStr = this.levelNumToString(parsed.level)

        return {
          time: toIsoTime(parsed.time),
          level: levelStr,
          msg: parsed.msg ?? '',
          traceId: parsed.traceId,
          userId: parsed.userId,
          method: parsed.method,
          pathname: parsed.pathname,
          ip: parsed.ip,
          action: parsed.action,
          layer: parsed.layer,
          statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : undefined,
          durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined,
          errorCode: typeof parsed.errorCode === 'string' ? parsed.errorCode : undefined,
          errorMessage: typeof parsed.errorMessage === 'string' ? parsed.errorMessage : undefined,
          request: parsed.request,
          response: parsed.response,
          err: parsed.err
            ? {
                message: parsed.err.message ?? String(parsed.err),
                stack: parsed.err.stack,
              }
            : undefined,
        }
      } catch {
        // 非 JSON 格式，返回 null
        return null
      }
    },

    /**
    Function: levelNumToString

    Description: 将 pino 数字级别转换为字符串

    Parameters:
      levelNum(number | string): 日志级别数字或字符串

    Returns:
      level(LogLevel): 日志级别字符串
    */
    levelNumToString(levelNum: number | string): LogLevel {
      if (typeof levelNum === 'string') {
        const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error']
        return validLevels.includes(levelNum as LogLevel) ? (levelNum as LogLevel) : 'info'
      }

      // Pino 数字级别映射
      const levelMap: Record<number, LogLevel> = {
        10: 'debug',
        20: 'debug',
        30: 'info',
        40: 'warn',
        50: 'error',
        60: 'error',
      }

      return levelMap[levelNum] ?? 'info'
    },

    /**
    Function: setLogLevel

    Description: 设置运行时日志级别

    Parameters:
      level(LogLevel): 新的日志级别

    Returns:
      result(SetLogLevelResponse): 级别变更结果
    */
    setLogLevel(level: LogLevel, options?: { actorId?: string }): SetLogLevelResponse {
      const previousLevel = setLogLevel(level)
      const now = new Date().toISOString()

      logger.info(
        {
          audit: true,
          actorId: options?.actorId ?? 'system',
          action: 'log_level.change',
          target: 'system.log_level',
          previousLevel,
          newLevel: level,
          effectiveAt: now,
        },
        '日志级别已更新',
      )

      return {
        previousLevel,
        currentLevel: level,
        effectiveAt: now,
      }
    },
  }
}
