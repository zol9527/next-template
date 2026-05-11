import path from 'node:path'

import type { NextRequest } from 'next/server'

import { BACKEND_ROOT_DIR, env } from '@/config/env.mjs'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { streamFileToPath } from '@/lib/utils/file-stream'

/**
 * 用户图片上传 API
 *
 * POST /api/v1/user/upload/image
 *
 * 供小程序端上传反馈截图等图片文件。
 * - 仅允许图片类型（image/jpeg, image/png, image/webp）
 * - 单文件大小上限 10 MB
 * - 文件存储到 LOCAL_UPLOAD_DIR，通过 /api/v1/public/files/ 公开访问
 */

// 允许的图片 MIME 类型
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// 单文件大小上限（10 MB）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export const POST = withV1Route({
  action: 'user:upload_image',
  requireAuth: true,
  rateLimit: {
    max: 20,
    windowMs: 60 * 1000,
    message: '图片上传过于频繁，请稍后再试',
  },
  handler: async ({ req, serviceContext }) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INVALID_INPUT', message: '请选择要上传的图片' } },
        { status: 400 },
      )
    }

    // 校验文件大小
    if (file.size > MAX_IMAGE_SIZE) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INVALID_INPUT', message: '图片大小不能超过 10MB' } },
        { status: 400 },
      )
    }

    // 校验文件类型（仅做初步检查，streamFileToPath 内部会做 magic bytes 验证）
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INVALID_INPUT', message: '仅支持 JPG、PNG、WEBP 格式的图片' } },
        { status: 400 },
      )
    }

    // 生成存储路径：uploads/feedback/{date}/{uuid}.{ext}
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '.jpg'
    const datePrefix = new Date().toISOString().slice(0, 10)
    const storageKey = `uploads/feedback/${datePrefix}/${crypto.randomUUID()}${ext}`

    // 解析目标文件路径：必须与 public/files 读取路由共用后端根目录。
    // 如果使用 process.cwd()，从 monorepo 根目录启动时会写入根 uploads，
    // 但公开读取路由会去 apps/backend/uploads 查找，导致后台图片 404。
    const absoluteBaseDir = path.resolve(BACKEND_ROOT_DIR, env.LOCAL_UPLOAD_DIR)
    const relativeKey = storageKey.startsWith('uploads/') ? storageKey.slice('uploads/'.length) : storageKey
    const destinationPath = path.resolve(absoluteBaseDir, relativeKey)

    // 流式写入：校验 magic bytes + 写入文件
    const streamResult = await streamFileToPath(file, destinationPath, MAX_IMAGE_SIZE)
    const validationResult = streamResult.validation

    if (!validationResult.isValid) {
      serviceContext.logger.warn({
        action: 'user:upload_image',
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
            message: validationResult.error?.message ?? '文件校验失败',
          },
        },
        { status: 400 },
      )
    }

    // 如果检测出的扩展名与原始不同，重命名文件
    let resultKey = storageKey
    if (validationResult.detectedExtension) {
      const detectedExt = `.${validationResult.detectedExtension}`
      const originalExt = ext
      if (detectedExt !== originalExt) {
        const newKey = storageKey.replace(/\.[^.]+$/, detectedExt)
        const newRelativeKey = newKey.startsWith('uploads/') ? newKey.slice('uploads/'.length) : newKey
        const newPath = path.resolve(absoluteBaseDir, newRelativeKey)
        const { rename } = await import('node:fs/promises')
        await rename(destinationPath, newPath)
        resultKey = newKey
      }
    }

    // 生成公开访问 URL
    const fileUrl = `/api/v1/public/files/${resultKey}`

    serviceContext.logger.info({
      action: 'user:upload_image',
      key: resultKey,
      size: file.size,
    })

    return createJsonApiResponse(req, ok({ url: fileUrl, key: resultKey }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
