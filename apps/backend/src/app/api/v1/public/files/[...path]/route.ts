import path from 'node:path'
import fs from 'node:fs/promises'

import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { NextResponse } from 'next/server'
import { env } from '@/config'

/**
Function: GET

Description: 获取本地存储的公开文件（无需认证）

Parameters:
	req(NextRequest): Next.js 请求对象，包含文件路径参数

Returns:
	response(NextResponse): 文件流或错误响应

Notes:
	- 路径格式：/api/v1/public/files/uploads/2026-01-10/xxx.png
	- 映射到：{process.cwd()}/uploads/2026-01-10/xxx.png
	- 防止路径穿越攻击
	- 根据文件扩展名设置 Content-Type
	- 1 年缓存策略
*/
export const GET = withV1Route({
  action: 'public:storage:read',
  handler: async ({ req, logger }) => {
    // 获取请求的路径参数
    // 对于 /api/v1/public/files/uploads/2026-01-10/xxx.png
    const url = new URL(req.url)
    const pathname = url.pathname

    // 移除 /api/v1/public/files/ 前缀
    const filePathInQuery = pathname.replace(/^\/api\/v1\/public\/files\//, '')

    // 防止路径穿越攻击：检查路径中是否包含 ..
    if (filePathInQuery.includes('..') || path.isAbsolute(filePathInQuery)) {
      logger.warn({ action: 'public:storage:read', reason: 'path_traversal_attempt', path: filePathInQuery }, '路径穿越攻击被阻止')
      return new NextResponse('Invalid path', { status: 400 })
    }

    // 检查是否尝试访问用户文档目录（需要认证）
    if (filePathInQuery.startsWith('user-documents/')) {
      logger.warn({ action: 'public:storage:read', reason: 'user_document_access_attempt', path: filePathInQuery }, '尝试通过公开路由访问用户文档')
      return new NextResponse('Access denied: user documents require authentication', { status: 403 })
    }

    // 构建完整的文件系统路径
    const uploadsDir = env.LOCAL_UPLOAD_DIR
    // 标准化上传目录路径（移除 "./" 前缀）
    const normalizedUploadsDir = uploadsDir.replace(/^\.\//, '')

    // 如果 filePathInQuery 已经包含目录前缀（如 "uploads/2026-01-10/xxx.png"）
    // 则直接使用 uploadsDir 作为基础目录
    // 否则拼接 uploadsDir 和 filePathInQuery
    let relativePath: string
    if (filePathInQuery.startsWith(normalizedUploadsDir.split('/')[0] + '/')) {
      // filePathInQuery 已经包含目录前缀，只取 uploadsDir 的第一级目录
      relativePath = filePathInQuery
    } else {
      // filePathInQuery 不包含目录前缀，需要添加
      relativePath = `${normalizedUploadsDir}/${filePathInQuery}`
    }

    const fullPath = path.join(process.cwd(), relativePath)

    // 验证文件路径是否在允许的目录内
    const resolvedFullPath = path.resolve(fullPath)
    const resolvedUploadsDir = path.resolve(process.cwd(), normalizedUploadsDir)
    if (!resolvedFullPath.startsWith(resolvedUploadsDir)) {
      logger.warn({ action: 'public:storage:read', reason: 'path_outside_allowed_dir', path: filePathInQuery }, '文件路径在允许的目录之外')
      return new NextResponse('Access denied', { status: 403 })
    }

    try {
      // 检查文件是否存在
      await fs.access(resolvedFullPath)

      // 读取文件
      const fileBuffer = await fs.readFile(resolvedFullPath)

      // 根据文件扩展名确定 Content-Type
      const ext = path.extname(resolvedFullPath).toLowerCase()
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
      }

      const contentType = contentTypeMap[ext] || 'application/octet-stream'

      // 返回文件流
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 年缓存
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn({ action: 'public:storage:read', path: filePathInQuery }, '文件不存在')
        return new NextResponse('File not found', { status: 404 })
      }
      logger.error({ action: 'public:storage:read', error }, '读取文件失败')
      return new NextResponse('Internal server error', { status: 500 })
    }
  },
})
