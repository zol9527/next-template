import path from 'node:path'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOptionsResponse } from '@/lib/http/response'
import { env, BACKEND_ROOT_DIR } from '@/config'

// ============================================================
// 常量定义
// ============================================================

/**
 * 文件扩展名 → Content-Type 映射（不可变）
 *
 * ⚠️ 安全：不包含 .html / .js / .css，防止存储型 XSS（同源 JS 执行）
 * 未知扩展名回退到 application/octet-stream（浏览器不会渲染）
 */
const CONTENT_TYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml', // 注意：SVG 可内嵌 JS，通过 CSP sandbox 防护
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
})

/**
 * 需要强制下载而非内联渲染的文件类型
 * - PDF 可内嵌 JavaScript，浏览器内联渲染有风险
 */
const FORCE_DOWNLOAD_EXTENSIONS = new Set(['.pdf'])

/**
 * Function: GET
 *
 * Description: 获取本地存储的公开文件（无需认证）
 *
 * Parameters:
 * 	req(NextRequest): Next.js 请求对象，包含文件路径参数
 *
 * Returns:
 * 	response(NextResponse): 文件流或错误响应
 *
 * Notes:
 * 	- 路径格式：/api/v1/public/files/uploads/2026-01-10/xxx.png
 * 	- 映射到：{BACKEND_ROOT_DIR}/uploads/2026-01-10/xxx.png
 * 	- 三层路径安全防护：字符串过滤 → resolve 规范化 → realpath 跟随符号链接
 * 	- 根据文件扩展名设置 Content-Type（白名单映射）
 * 	- 1 年缓存策略 + ETag 条件请求 + Range 分块传输
 * 	- 使用流式响应（fs.createReadStream），避免全量读入内存
 * 	- 安全头：X-Content-Type-Options + SVG CSP sandbox + PDF 强制下载
 */
/**
 * Function: OPTIONS
 *
 * Description: 标准预检请求响应
 * 仅允许 GET 方法（公开文件下载为只读端点）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req, 'GET,OPTIONS')
}

export const GET = withV1Route({
  action: 'public:storage:read',

  // 公开路由速率限制：防止无限制洪泛和路径枚举攻击
  rateLimit: {
    max: 200,         // 每个时间窗口最大请求数
    windowMs: 60_000, // 1 分钟窗口
  },

  handler: async ({ req, logger }) => {
    // 获取请求的路径参数
    // 对于 /api/v1/public/files/uploads/2026-01-10/xxx.png
    const url = new URL(req.url)
    const pathname = url.pathname

    // 移除 /api/v1/public/files/ 前缀
    const filePathInQuery = pathname.replace(/^\/api\/v1\/public\/files\//, '')

    // ── 第一层防护：字符串级路径穿越检查 ──
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

    const fullPath = path.join(BACKEND_ROOT_DIR, relativePath)

    // ── 第二层防护：resolve 规范化 + 目录边界检查 ──
    // 使用 path.sep 确保目录边界（防止 /app/uploads 匹配 /app/uploads-private）
    const resolvedFullPath = path.resolve(fullPath)
    const resolvedUploadsDir = path.resolve(BACKEND_ROOT_DIR, normalizedUploadsDir)
    const uploadDirWithSep = resolvedUploadsDir.endsWith(path.sep)
      ? resolvedUploadsDir
      : resolvedUploadsDir + path.sep

    if (resolvedFullPath !== resolvedUploadsDir && !resolvedFullPath.startsWith(uploadDirWithSep)) {
      logger.warn({ action: 'public:storage:read', reason: 'path_outside_allowed_dir', path: filePathInQuery }, '文件路径在允许的目录之外')
      return new NextResponse('Access denied', { status: 403 })
    }

    try {
      // 使用 fs.stat() 一次性获取文件元信息（存在性 + 大小 + 修改时间）
      const stat = await fs.stat(resolvedFullPath)

      // 拒绝目录请求（stat 成功但 createReadStream 会抛 EISDIR）
      if (stat.isDirectory()) {
        return new NextResponse('Not a file', { status: 404 })
      }

      // ── 第三层防护：realpath 跟随符号链接，防止 symlink 穿越 ──
      // path.resolve 只做字符串拼接，不跟随 symlink
      // 攻击者如果在 uploads 中创建了指向 /etc/shadow 的 symlink，
      // 前两层检查会通过（字符串前缀匹配），但 realpath 会解析到真实路径
      const realFullPath = await fs.realpath(resolvedFullPath)
      const realUploadsDir = await fs.realpath(resolvedUploadsDir)
      const realUploadDirWithSep = realUploadsDir.endsWith(path.sep)
        ? realUploadsDir
        : realUploadsDir + path.sep

      if (realFullPath !== realUploadsDir && !realFullPath.startsWith(realUploadDirWithSep)) {
        logger.warn({ action: 'public:storage:read', reason: 'symlink_escape', path: filePathInQuery, realPath: realFullPath }, '符号链接穿越攻击被阻止')
        return new NextResponse('Access denied', { status: 403 })
      }

      // 根据文件扩展名确定 Content-Type
      const ext = path.extname(realFullPath).toLowerCase()
      const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream'

      // 使用 SHA-256 哈希生成 ETag（避免泄露精确的文件大小和毫秒级修改时间）
      const etagRaw = `${stat.size}-${Math.floor(stat.mtimeMs / 1000)}`
      const etag = `W/"${createHash('sha256').update(etagRaw).digest('hex').slice(0, 16)}"`
      const lastModified = stat.mtime.toUTCString()

      // 公共响应头
      const commonHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 年缓存
        'Accept-Ranges': 'bytes', // 声明支持 Range 请求
        'ETag': etag,
        'Last-Modified': lastModified,
        // 防止浏览器 MIME 嗅探（防止 .jpg 实际是 HTML 时被渲染为 HTML）
        'X-Content-Type-Options': 'nosniff',
      }

      // SVG 文件添加 CSP sandbox（防止内嵌 <script> 执行）
      if (ext === '.svg') {
        commonHeaders['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'"
      }

      // 危险文件类型强制下载（防止浏览器内联渲染执行嵌入脚本）
      if (FORCE_DOWNLOAD_EXTENSIONS.has(ext)) {
        const filename = path.basename(realFullPath)
        commonHeaders['Content-Disposition'] = `attachment; filename="${filename}"`
      }

      // === ETag 条件请求检查 ===
      // 客户端缓存未过期时，返回 304 Not Modified（无需传输文件体）
      const ifNoneMatch = req.headers.get('if-none-match')
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: commonHeaders,
        })
      }

      // 支持 If-Modified-Since 条件请求（容错：畸形日期静默忽略）
      const ifModifiedSince = req.headers.get('if-modified-since')
      if (ifModifiedSince) {
        const clientDate = new Date(ifModifiedSince)
        if (!isNaN(clientDate.getTime()) && clientDate.getTime() >= stat.mtime.getTime()) {
          return new NextResponse(null, {
            status: 304,
            headers: commonHeaders,
          })
        }
      }

      // === Range 请求处理 ===
      // 支持分块传输，客户端可以只请求文件的一部分（适用于大文件/视频/断点续传）
      const rangeHeader = req.headers.get('range')

      if (rangeHeader) {
        // 解析 Range 头，格式为 "bytes=start-end"
        const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d*)$/)
        if (!rangeMatch) {
          // Range 格式无效，返回 416
          return new NextResponse('Range Not Satisfiable', {
            status: 416,
            headers: {
              ...commonHeaders,
              'Content-Range': `bytes */${stat.size}`,
            },
          })
        }

        const start = parseInt(rangeMatch[1], 10)
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : stat.size - 1

        // 校验 Range 范围的合法性
        if (start >= stat.size || end >= stat.size || start > end) {
          return new NextResponse('Range Not Satisfiable', {
            status: 416,
            headers: {
              ...commonHeaders,
              'Content-Range': `bytes */${stat.size}`,
            },
          })
        }

        const contentLength = end - start + 1

        // 创建只读取指定范围的文件流（附带错误处理防止进程 crash）
        const rangeStream = createReadStream(realFullPath, { start, end })
        rangeStream.on('error', (err) => {
          logger.error({ action: 'public:storage:read', error: err, path: filePathInQuery }, 'Range 流读取错误')
          rangeStream.destroy()
        })

        return new NextResponse(Readable.toWeb(rangeStream) as ReadableStream, {
          status: 206, // Partial Content
          headers: {
            ...commonHeaders,
            'Content-Length': contentLength.toString(),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          },
        })
      }

      // === 完整文件流式响应 ===
      // 使用 createReadStream 避免将整个文件读入内存
      const fileStream = createReadStream(realFullPath)
      fileStream.on('error', (err) => {
        logger.error({ action: 'public:storage:read', error: err, path: filePathInQuery }, '文件流读取错误')
        fileStream.destroy()
      })

      return new NextResponse(Readable.toWeb(fileStream) as ReadableStream, {
        status: 200,
        headers: {
          ...commonHeaders,
          'Content-Length': stat.size.toString(),
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
