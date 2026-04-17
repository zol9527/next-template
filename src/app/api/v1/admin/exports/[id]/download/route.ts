import type { Action, Scope } from '@/config/access'
/**
 * Export File Download Route
 *
 * @module api/v1/admin/exports/[id]/download
 * @description 导出文件下载接口（签名 URL 验证）
 *
 * =============================================================================
 *
 * 端点说明:
 * - GET /api/v1/admin/exports/:id/download?token={signedToken} - 下载导出文件
 *
 * 权限要求:
 * - 需要 admin 角色 + admin:export:read 权限
 * - 签名 token 必须有效且未过期（30 分钟）
 * - 仅任务请求者或管理员可下载
 *
 * =============================================================================
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { getExportJobRepository } from '@/repositories/factory'
import { createDataExportService } from '@/services/core/data-export.service'
import { ExportJobIdParamsSchema, ExportDownloadQuerySchema } from '@/contracts/dtos/export.dto'
import { env } from '@/config'

const LOCAL_UPLOAD_DIR_DEFAULT = 'uploads'

/**
 * Function: GET
 *
 * Description: 下载导出文件
 *   委托 Service 层验证签名 token 和用户权限，然后根据存储类型返回文件
 *   - 云存储（阿里云/腾讯云）：302 重定向到 OSS 签名 URL
 *   - 本地存储：流式返回文件内容
 *
 * Parameters:
 *   params(object): 路径参数
 *     id(string): 导出任务 ID
 *   query(object): 查询参数
 *     token(string): HMAC 签名 token
 *
 * Returns:
 *   response(NextResponse): 302 重定向或文件流
 */
export const GET = withV1Route({
  action: 'admin:export:download',
  requireAccess: { action: 'read' as Action, scope: 'exports' as Scope },
  schemas: {
    params: ExportJobIdParamsSchema,
    query: ExportDownloadQuerySchema,
  },
  handler: async ({ req, serviceContext, params, query, userId, auth }) => {
    const isAdmin = auth?.roles.includes('admin') ?? false

    const exportJobs = await getExportJobRepository()
    const service = createDataExportService({ exportJobs }, serviceContext)

    const downloadInfo = await service.resolveDownloadFile({
      jobId: params.id,
      token: query.token,
      userId: userId!,
      isAdmin,
    })

    if (downloadInfo.signedUrl) {
      return NextResponse.redirect(downloadInfo.signedUrl)
    }

    const uploadDir = env.LOCAL_UPLOAD_DIR ?? LOCAL_UPLOAD_DIR_DEFAULT
    const absoluteBaseDir = path.resolve(process.cwd(), uploadDir)
    const localPath = path.resolve(absoluteBaseDir, downloadInfo.storageKey)

    const baseDirWithSep = absoluteBaseDir.endsWith(path.sep) ? absoluteBaseDir : `${absoluteBaseDir}${path.sep}`
    if (localPath !== absoluteBaseDir && !localPath.startsWith(baseDirWithSep)) {
      throw new Error('Invalid file path: Access denied')
    }

    const fileBuffer = await fs.readFile(localPath)
    const encodedFileName = encodeURIComponent(downloadInfo.fileName)
    const contentDisposition = `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-store',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  },
})

/**
 * OPTIONS 处理器（CORS 预检请求）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
