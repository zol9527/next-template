/**
 * 文件恢复引擎
 *
 * 职责：从 ZIP 备份文件中提取媒体文件并上传到目标存储后端
 * 支持任意 ObjectStorageProvider 实现（本地 / 阿里云 OSS / 腾讯云 COS 等）
 *
 * 设计要点：
 * - 通过 manifest.json 校验备份格式
 * - 读取 mapping.json 获取 objectKey → ZIP 路径的映射关系
 * - 逐文件提取并上传，单文件失败不中断整体恢复
 * - 集成 StatsTracker 实时追踪进度和 StatsTracker 速率控制
 */

import { parseManifestFromZip, extractFileFromZip } from './integrity-check'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ============================================================
// 类型定义
// ============================================================

/**
 * 文件恢复参数
 */
export interface FileRestoreParams {
  /** ZIP 备份文件路径 */
  zipPath: string
  /** 目标存储提供者 */
  provider: ObjectStorageProvider
  /** 进度追踪器 */
  statsTracker: StatsTracker
  /** 速率控制器 */
  rateController: RateController
}

/**
 * 文件恢复结果
 */
export interface FileRestoreResult {
  /** 文件总数 */
  totalFiles: number
  /** 成功恢复文件数 */
  restoredFiles: number
  /** 失败文件数 */
  failedFiles: number
  /** 失败文件列表（objectKey） */
  failedFileList: string[]
  /** 总传输字节数 */
  totalBytes: number
}

// ============================================================
// 恢复引擎
// ============================================================

/**
 * Function: restoreFiles
 *
 * Description: 从 ZIP 备份文件中恢复所有媒体文件到目标存储后端。
 * 解析 manifest.json 校验备份格式，读取 mapping.json 获取文件映射，
 * 逐文件提取并上传到目标 provider。单文件失败不中断整体恢复。
 *
 * Parameters:
 *   params(FileRestoreParams): 恢复参数集合
 *
 * Returns:
 *   Promise<FileRestoreResult>: 恢复结果（含统计信息和失败列表）
 */
export async function restoreFiles(
  params: FileRestoreParams,
): Promise<FileRestoreResult> {
  const { zipPath, provider, statsTracker, rateController } = params

  // 1. 从 ZIP 解析 manifest.json 校验备份格式
  await parseManifestFromZip(zipPath)

  // 2. 读取 mapping.json（objectKey → ZIP 路径映射）
  const mappingBuffer = await extractFileFromZip(zipPath, 'mapping.json')
  const mapping: Record<string, string> = JSON.parse(
    mappingBuffer.toString('utf8'),
  )

  const objectKeys = Object.keys(mapping)
  const failedFileList: string[] = []
  let totalBytes = 0

  // 构建反向映射：ZIP 路径 → objectKey
  const reverseMapping: Record<string, string> = {}
  for (const [objectKey, zipEntryPath] of Object.entries(mapping)) {
    reverseMapping[zipEntryPath] = objectKey
  }

  // 初始化进度追踪
  statsTracker.update({
    phase: 'file-restore',
    filesTotal: objectKeys.length,
    filesCompleted: 0,
    failedFiles: 0,
    failedFileList: [],
    bytesTransferred: 0,
  })

  // 3. 遍历 mapping 中的每个文件
  for (const objectKey of objectKeys) {
    const zipEntryPath = mapping[objectKey]

    try {
      // 3a. 从 ZIP 提取文件内容
      const buffer = await extractFileFromZip(zipPath, zipEntryPath)

      // 3c. 调用 provider 上传文件
      await provider.uploadFile({
        file: buffer,
        key: objectKey,
        contentType: 'application/octet-stream',
      })

      totalBytes += buffer.length
    } catch {
      // 4. 失败的文件记录错误，继续后续文件
      failedFileList.push(objectKey)
    }

    // 3d. 更新 statsTracker
    statsTracker.update({
      filesCompleted: (statsTracker.getStats().filesCompleted ?? 0) + 1,
      failedFiles: failedFileList.length,
      failedFileList: [...failedFileList],
      bytesTransferred: totalBytes,
    })

    // 3e. 速率控制
    await rateController.waitForFile()
  }

  // 5. 返回结果
  return {
    totalFiles: objectKeys.length,
    restoredFiles: objectKeys.length - failedFileList.length,
    failedFiles: failedFileList.length,
    failedFileList,
    totalBytes,
  }
}
