import type { Action, Scope } from '@/config/access'
/**
 * 数据导入 API 路由
 *
 * @module api/v1/admin/data-management/import
 * @description 上传备份 ZIP 文件并启动恢复流程
 *
 * =============================================================================
 *
 * 端点说明:
 * - POST /api/v1/admin/data-management/import - 上传 ZIP 文件并创建恢复任务
 *
 * 权限要求:
 * - 需要 admin 角色
 * - 需要 admin:backup:import 权限
 *
 * =============================================================================
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getBackupJobRepository } from '@/repositories/factory'
import { createBackupService } from '@/services/core/backup.service'
import { getStorageProvider } from '@/lib/storage/helper'
import { AppError } from '@/lib/errors/app-error'

/** ZIP 文件的 magic bytes（PK\x03\x04） */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

/** 导入文件最大大小：500MB */
const MAX_IMPORT_FILE_SIZE = 500 * 1024 * 1024

/**
 * POST /api/v1/admin/data-management/import
 *
 * 上传备份 ZIP 文件并创建恢复任务。
 * 流程：解析文件 → 验证格式 → 上传到存储 → 调用 createRestore → 返回任务信息
 *
 * @action admin:backup:import
 *
 * Request: multipart/form-data
 *   - file: 备份 ZIP 文件（必需）
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "job-id",
 *     "jobType": "full_restore",
 *     "status": "pending",
 *     ...
 *   }
 * }
 */
export const POST = withV1Route({
  action: 'admin:backup:import',
  requireAccess: { action: 'write' as Action, scope: 'backup' as Scope },
  handler: async ({ req, serviceContext, userId }) => {
    serviceContext.logger.info(
      { action: 'backup:import', userId },
      '收到数据导入请求',
    )

    // 1. 解析 FormData
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      throw new AppError(400, 'INVALID_INPUT', '请上传有效的 ZIP 文件')
    }

    // 2. 验证文件大小
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new AppError(400, 'FILE_TOO_LARGE', `文件大小超过限制（最大 ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB）`)
    }

    // 3. 读取文件内容并验证 ZIP 格式
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    if (fileBuffer.length < 4 || !fileBuffer.subarray(0, 4).equals(ZIP_MAGIC)) {
      throw new AppError(400, 'INVALID_FILE_FORMAT', '文件格式无效，请上传有效的 ZIP 备份文件')
    }

    // 4. 生成存储 key 并上传
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const storageKey = `imports/${timestamp}_${crypto.randomUUID().slice(0, 8)}.zip`

    serviceContext.logger.info(
      { action: 'backup:import:upload', storageKey, fileSize: fileBuffer.length },
      '上传导入文件到存储',
    )

    const provider = getStorageProvider()
    await provider.uploadFile({
      file: fileBuffer,
      key: storageKey,
      contentType: 'application/zip',
    })

    // 5. 创建恢复任务（复用现有恢复引擎，自动开启/关闭维护模式）
    const backupJobs = await getBackupJobRepository()
    const service = createBackupService({ backupJobs }, serviceContext)
    const job = await service.createRestore({
      jobType: 'full_restore',
      backupFileKey: storageKey,
      requestedBy: userId!,
    })

    serviceContext.logger.info(
      { action: 'backup:import:created', jobId: job.id, storageKey },
      '导入恢复任务已创建',
    )

    return createJsonApiResponse(req, ok(job), { status: 201 })
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
