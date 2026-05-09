import fs from 'node:fs/promises'
import path from 'node:path'

import type { RetentionPolicy } from '@/lib/logger/policy'

type FileEntry = {
  name: string
  fullPath: string
  sizeBytes: number
  mtimeMs: number
}

function isLogFileName(params: { filename: string; baseName: string; extName: string }): boolean {
  const { filename, baseName, extName } = params

  if (!filename.startsWith(`${baseName}-`)) return false
  if (!filename.endsWith(extName)) return false

  // app-YYYY-MM-DD.log
  // app-YYYY-MM-DD.1.log
  const middle = filename.slice(baseName.length + 1, filename.length - extName.length)
  return /^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/.test(middle)
}

function isWithinRetentionDays(params: { nowMs: number; mtimeMs: number; retentionDays: number }): boolean {
  const { nowMs, mtimeMs, retentionDays } = params
  const cutoffMs = nowMs - retentionDays * 24 * 60 * 60 * 1000
  return mtimeMs >= cutoffMs
}

async function listLogFiles(params: {
  logDir: string
  baseName: string
  extName: string
  excludeFullPaths?: Set<string>
}): Promise<FileEntry[]> {
  const exclude = params.excludeFullPaths ?? new Set<string>()

  let entries: string[]
  try {
    entries = await fs.readdir(params.logDir)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENOENT') return []
    throw error
  }

  const results: FileEntry[] = []

  await Promise.all(
    entries.map(async (name) => {
      if (!isLogFileName({ filename: name, baseName: params.baseName, extName: params.extName })) return

      const fullPath = path.join(params.logDir, name)
      if (exclude.has(fullPath)) return

      try {
        const stat = await fs.stat(fullPath)
        if (!stat.isFile()) return

        results.push({
          name,
          fullPath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
        })
      } catch (error: unknown) {
        if ((error as { code?: string }).code === 'ENOENT') return
        throw error
      }
    }),
  )

  return results
}

/**
Function: cleanupLogDir

Description: 按“保留天数 + 最大总占用”策略清理日志目录中的旧日志文件（避免删除当前活跃文件）

Parameters:
	params(object): 清理参数
	params.logDir(string): 日志目录
	params.baseName(string): 日志文件基名（不含日期后缀）
	params.extName(string): 文件扩展名（包含点，例如 .log）
	params.retention(RetentionPolicy): 保留策略
	params.excludePaths(string[] | undefined): 需要排除的文件绝对路径列表（通常是当前活跃文件）

Returns:
	summary(object): 清理摘要
	summary.deletedCount(number): 删除文件数
	summary.deletedBytes(number): 删除字节数
	summary.remainingCount(number): 剩余文件数
	summary.remainingBytes(number): 剩余字节数
*/
export async function cleanupLogDir(params: {
  logDir: string
  baseName: string
  extName: string
  retention: RetentionPolicy
  excludePaths?: string[]
}): Promise<{
  deletedCount: number
  deletedBytes: number
  remainingCount: number
  remainingBytes: number
}> {
  const nowMs = Date.now()

  const exclude = new Set<string>((params.excludePaths ?? []).map((p) => path.resolve(p)))
  const files = await listLogFiles({
    logDir: params.logDir,
    baseName: params.baseName,
    extName: params.extName,
    excludeFullPaths: exclude,
  })

  const deleted: FileEntry[] = []
  const kept: FileEntry[] = []

  for (const file of files) {
    if (isWithinRetentionDays({ nowMs, mtimeMs: file.mtimeMs, retentionDays: params.retention.retentionDays })) {
      kept.push(file)
    } else {
      deleted.push(file)
    }
  }

  let deletedCount = 0
  let deletedBytes = 0

  for (const file of deleted) {
    try {
      await fs.unlink(file.fullPath)
      deletedCount += 1
      deletedBytes += file.sizeBytes
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'ENOENT') continue
      throw error
    }
  }

  // 再按总占用裁剪（从最旧开始删）
  kept.sort((a, b) => a.mtimeMs - b.mtimeMs)

  const remaining: FileEntry[] = []
  let totalBytes = kept.reduce((sum, f) => sum + f.sizeBytes, 0)

  for (const file of kept) {
    if (totalBytes <= params.retention.retentionMaxTotalBytes) {
      remaining.push(file)
      continue
    }

    try {
      await fs.unlink(file.fullPath)
      deletedCount += 1
      deletedBytes += file.sizeBytes
      totalBytes -= file.sizeBytes
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'ENOENT') {
        totalBytes -= file.sizeBytes
        continue
      }
      throw error
    }
  }

  return {
    deletedCount,
    deletedBytes,
    remainingCount: remaining.length,
    remainingBytes: totalBytes,
  }
}
