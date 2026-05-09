import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createUserDocumentRepository } from '@/repositories/factory'
import { fileStorage } from '@/lib/file-storage'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'


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

export function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}
