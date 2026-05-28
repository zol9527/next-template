import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOptionsResponse } from '@/lib/http/response'
import { createUserDocumentService } from '@/services/core/user-document.service'
import { createServiceContext } from '@/types/service/service-context'

/**
Function: GET

Description: 获取用户文档文件（需要认证和权限校验）

Parameters:
	req(NextRequest): Next.js 请求对象
	id(string): 文档 ID（从路径参数获取）

Returns:
	NextResponse: 文件流或错误响应

Notes:
	- 需要用户认证
	- 只有本人或管理员（有 user_document:read 权限）可以访问
	- 返回文件流，Content-Type 根据文档的 mimeType 设置
	- 1 年缓存策略（私有资源）
*/
export const GET = withV1Route({
  action: 'internal:user_document:read_file',
  requireAuth: true,
  schemas: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  handler: async ({ req, params, traceId, logger, userId, auth }) => {
    // 创建 ServiceContext
    const serviceCtx = createServiceContext(traceId, logger, req)

    // 创建 Service
    const { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } = await import(
      '@/repositories/factory'
    )
    const userDocumentsRepo = await createUserDocumentRepository()
    const documentVersionsRepo = await createDocumentVersionRepository()
    const usersRepo = await createUserRepository()

    const userDocumentService = createUserDocumentService(
      { userDocuments: userDocumentsRepo, documentVersions: documentVersionsRepo, users: usersRepo },
      serviceCtx,
    )

    // 检查权限（管理员或拥有 user_document:read 权限）
    const isAdmin = auth!.roles.includes('admin')
    const hasDocAccess = auth!.access.has({ action: 'read', scope: 'user-documents' })

    try {
      const result = await userDocumentService.getDocumentFile(
        params.id,
        userId,
        isAdmin,
        hasDocAccess,
      )

      logger.info(
        { documentId: params.id, mimeType: result.mimeType, size: result.buffer.length },
        'Document file served successfully',
      )

      // 返回文件流（Buffer 转换为 Uint8Array）
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          'Content-Type': result.mimeType || 'application/octet-stream',
          'Cache-Control': 'private, max-age=31536000, immutable',
          'Content-Length': result.buffer.length.toString(),
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Document not found') {
          logger.warn({ documentId: params.id }, 'Document not found')
          return new NextResponse('Document not found', { status: 404 })
        }
        if (error.message.includes('Forbidden')) {
          logger.warn({ documentId: params.id, userId }, 'Forbidden access to document')
          return new NextResponse('Forbidden', { status: 403 })
        }
      }

      logger.error({ err: error, documentId: params.id }, 'Error serving document file')
      return new NextResponse('Internal server error', { status: 500 })
    }
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
