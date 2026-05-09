import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { Writable } from 'node:stream'

import pino, { type DestinationStream } from 'pino'

import { cleanupLogDir } from '@/lib/logger/retention'
import type { RetentionPolicy, RotationPolicy } from '@/lib/logger/policy'

export const DEFAULT_LOG_FILENAME = 'app.log'

const MIN_CLEANUP_INTERVAL_MS = 5 * 60 * 1000

function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function exists(fullPath: string): Promise<boolean> {
  try {
    await fsPromises.access(fullPath)
    return true
  } catch {
    return false
  }
}

async function findNextRotatedPath(params: {
  logDir: string
  baseName: string
  extName: string
  date: string
}): Promise<string> {
  const base = path.join(params.logDir, `${params.baseName}-${params.date}`)
  const plain = `${base}${params.extName}`
  if (!(await exists(plain))) return plain

  for (let i = 1; i < 10_000; i += 1) {
    const candidate = `${base}.${i}${params.extName}`
    if (!(await exists(candidate))) return candidate
  }

  // 极端情况下避免死循环：退化为时间戳
  return `${base}.${Date.now()}${params.extName}`
}

class RollingFileSink extends Writable implements DestinationStream {
  private readonly logDir: string
  private readonly filename: string
  private readonly baseName: string
  private readonly extName: string
  private readonly rotation: RotationPolicy
  private readonly retention: RetentionPolicy
  private readonly activePath: string

  private currentDate: string
  private currentBytes: number
  private currentStream: fs.WriteStream

  private queue: Promise<void> = Promise.resolve()
  private rotating = false

  private lastCleanupAtMs = 0
  private degradedToStderr = false
  private wroteDegradeWarning = false

  constructor(params: {
    logDir: string
    filename: string
    rotation: RotationPolicy
    retention: RetentionPolicy
  }) {
    super({ decodeStrings: false })

    this.logDir = params.logDir
    this.filename = params.filename
    this.rotation = params.rotation
    this.retention = params.retention

    const parsed = path.parse(this.filename)
    this.baseName = parsed.name
    this.extName = parsed.ext

    this.activePath = path.join(this.logDir, this.filename)
    this.currentDate = formatLocalDateYYYYMMDD(new Date())
    this.currentBytes = 0

    fs.mkdirSync(this.logDir, { recursive: true })

    try {
      const stat = fs.statSync(this.activePath)
      this.currentBytes = stat.isFile() ? stat.size : 0
    } catch {
      this.currentBytes = 0
    }

    this.currentStream = fs.createWriteStream(this.activePath, { flags: 'a' })
    this.currentStream.on('error', () => {
      this.degradedToStderr = true
    })
  }

  private shouldRotateForDate(nowDate: string): boolean {
    return this.rotation.rotateDaily && nowDate !== this.currentDate
  }

  private async rotate(params: { reason: 'size' | 'date'; nowDate: string }): Promise<void> {
    if (this.rotating) return

    this.rotating = true
    const rotateDate = params.reason === 'date' ? this.currentDate : params.nowDate

    try {
      const rotatedPath = await findNextRotatedPath({
        logDir: this.logDir,
        baseName: this.baseName,
        extName: this.extName,
        date: rotateDate,
      })

      await new Promise<void>((resolve) => {
        this.currentStream.end(() => resolve())
      })

      try {
        await fsPromises.rename(this.activePath, rotatedPath)
      } catch (error: unknown) {
        if ((error as { code?: string }).code !== 'ENOENT') throw error
      }

      this.currentDate = params.nowDate
      this.currentBytes = 0

      this.currentStream = fs.createWriteStream(this.activePath, { flags: 'a' })
      this.currentStream.on('error', () => {
        this.degradedToStderr = true
      })

      await this.maybeCleanup()
    } finally {
      this.rotating = false
    }
  }

  private async maybeCleanup(): Promise<void> {
    const now = Date.now()
    if (now - this.lastCleanupAtMs < MIN_CLEANUP_INTERVAL_MS) return
    this.lastCleanupAtMs = now

    try {
      const summary = await cleanupLogDir({
        logDir: this.logDir,
        baseName: this.baseName,
        extName: this.extName,
        retention: this.retention,
        excludePaths: [this.activePath],
      })

      const line =
        JSON.stringify({
          level: 30,
          time: Date.now(),
          msg: 'logger.retention.cleanup',
          ...summary,
        }) + '\n'

      // 内部日志：直接写入当前文件，不再触发滚动判定
      this.currentStream.write(line)
      this.currentBytes += Buffer.byteLength(line)
    } catch {
      // 清理失败不得影响请求/日志主流程
    }
  }

  private writeToStderrIfError(chunk: string | Buffer): void {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')

    // 仅保留关键错误日志（error/fatal）。pino 默认 level 为数字。
    if (!text.includes('"level":50') && !text.includes('"level":60')) return

    if (!this.wroteDegradeWarning) {
      this.wroteDegradeWarning = true
      process.stderr.write('[logger] file sink degraded; writing error logs to stderr\n')
    }

    process.stderr.write(text)
  }

  _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    const data = chunk instanceof Buffer ? chunk : Buffer.from(String(chunk))
    const nowDate = formatLocalDateYYYYMMDD(new Date())

    this.queue = this.queue
      .then(async () => {
        if (this.degradedToStderr) {
          this.writeToStderrIfError(data)
          return
        }

        if (this.shouldRotateForDate(nowDate)) {
          await this.rotate({ reason: 'date', nowDate })
        }

        await new Promise<void>((resolve) => {
          this.currentStream.write(data, (err) => {
            if (err) {
              this.degradedToStderr = true
              this.writeToStderrIfError(data)
            } else {
              this.currentBytes += data.byteLength
            }
            resolve()
          })
        })

        if (!this.degradedToStderr && this.currentBytes >= this.rotation.rotateSizeBytes) {
          await this.rotate({ reason: 'size', nowDate })
        }
      })
      .catch(() => {
        this.degradedToStderr = true
        this.writeToStderrIfError(data)
      })
      .finally(() => {
        callback(null)
      })
  }
}

/**
Function: createFileSink

Description: 创建 Node 侧文件写入流（支持按大小 + 按日期滚动，并在滚动点限频触发保留清理；落盘失败会降级到 stderr）

Parameters:
	params(object): 创建参数
	params.logDir(string): 日志目录
	params.filename(string | undefined): 日志文件名（可选）
  params.rotation(RotationPolicy): 滚动策略
  params.retention(RetentionPolicy): 保留策略

Returns:
	sink(DestinationStream): Pino 目标写入流
*/
export function createFileSink(params: {
  logDir: string
  filename?: string
  rotation: RotationPolicy
  retention: RetentionPolicy
}): DestinationStream {
  try {
    return new RollingFileSink({
      logDir: params.logDir,
      filename: params.filename ?? DEFAULT_LOG_FILENAME,
      rotation: params.rotation,
      retention: params.retention,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error'
    process.stderr.write(`[logger] failed to create file sink: ${message}\n`)

    // 降级：避免影响请求处理。此处使用 stderr 作为兜底输出。
    return pino.destination(2)
  }
}
