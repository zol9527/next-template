import path from 'node:path'

import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { env } from '@/config/env.mjs'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { streamFileToPath } from '@/lib/utils/file-stream'

/**
Function: POST

Description: 本地文件上传 API（仅管理员），使用流式传输避免全量加载到内存

Parameters:
	serviceContext(V1RouteContext): 路由上下文对象

Returns:
	response(NextResponse): JSON 响应，包含文件 URL 和路径
*/
export const POST = withV1Route({
  action: 'admin:storage:upload_local',
  requireAccess: { action: 'write' as Action, scope: 'storage' as Scope },
  handler: async ({ req, serviceContext }) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const key = formData.get('key') as string | null

    if (!file) {
      return createJsonApiResponse(req, { success: false, error: { code: 'INVALID_INPUT', message: 'No file uploaded' } }, { status: 400 })
    }

    let finalKey = key
    if (!finalKey) {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin'
      finalKey = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`
    }

    // 解析目标文件路径（与 local storage provider 路径逻辑一致）
    const absoluteBaseDir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR)
    const relativeKey = finalKey.startsWith('uploads/') ? finalKey.slice('uploads/'.length) : finalKey
    const destinationPath = path.resolve(absoluteBaseDir, relativeKey)

    const maxBytes = 200 * 1024 * 1024 // 200MB

    // 流式写入：先读取头部校验 magic bytes，再流式写入剩余数据
    const streamResult = await streamFileToPath(file, destinationPath, maxBytes)
    const validationResult = streamResult.validation

    if (!validationResult.isValid) {
      serviceContext.logger.warn({
        action: 'admin:storage:upload_local',
        warning: 'file_validation_failed',
        errorCode: validationResult.error?.code,
        errorMessage: validationResult.error?.message,
        detectedMime: validationResult.detectedMime,
      })
      return createJsonApiResponse(
        req,
        {
          success: false,
          error: {
            code: validationResult.error?.code ?? 'INVALID_INPUT',
            message: validationResult.error?.message ?? 'File validation failed',
          },
        },
        { status: 400 }
      )
    }

    // 检查声明的 Content-Type 是否与检测出的类型一致
    if (file.type && validationResult.detectedMime && file.type !== validationResult.detectedMime) {
      serviceContext.logger.warn({
        action: 'admin:storage:upload_local',
        warning: 'content_type_mismatch',
        declaredType: file.type,
        detectedType: validationResult.detectedMime,
        message: '使用检测出的文件类型替代声明类型',
      })
    }

    let resultKey = finalKey
    if (!key && validationResult.detectedExtension) {
      const detectedExt = `.${validationResult.detectedExtension}`
      const originalExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin'
      if (detectedExt !== originalExt) {
        const newKey = finalKey.replace(/\.[^.]+$/, detectedExt)
        const newRelativeKey = newKey.startsWith('uploads/') ? newKey.slice('uploads/'.length) : newKey
        const newPath = path.resolve(absoluteBaseDir, newRelativeKey)
        const { rename } = await import('node:fs/promises')
        await rename(destinationPath, newPath)
        resultKey = newKey
      }
    }

    // 生成文件 URL（与 local storage provider 的 getFileUrl 逻辑一致）
    const isUserDoc = resultKey.startsWith('user-documents/')
    const fileUrl = isUserDoc
      ? `/api/v1/internal/user-documents/${resultKey.replace(/^user-documents\//, '')}/file`
      : `/api/v1/public/files/${resultKey}`

    return createJsonApiResponse(req, ok({ url: fileUrl, key: resultKey }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
