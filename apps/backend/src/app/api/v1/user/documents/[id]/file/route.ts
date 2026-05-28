import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createUserDocumentRepository } from '@/repositories/factory'
import { fileStorage } from '@/lib/file-storage'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOptionsResponse } from '@/lib/http/response'


export const GET = withV1Route({
  action: 'user:document:file',
  requireAuth: true,
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ params, serviceContext, userId, auth }) => {

    const userDocsRepo = await createUserDocumentRepository()
    const doc = await userDocsRepo.findById(
      serviceContext,
      { id: params.id }
    )

    if (!doc || !doc.filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // 检查权限：只有文档所有者或管理员可以访问
    // auth 由 withV1Route 在 requireAuth: true 时保证存在
    if (doc.userId !== userId && !auth!.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const fileBuffer = await fileStorage.readFile(doc.filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName || 'document.jpg')}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 标准预检请求响应
 * 仅允许 GET 方法（文件下载为只读端点）
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req, 'GET,OPTIONS')
}
