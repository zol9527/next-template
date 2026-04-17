import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } from '@/repositories/factory'
import { createUserDocumentService } from '@/services/core/user-document.service'
import type { DocumentStatus, DocumentType } from '@/contracts/dtos/user-document.dto'

export const GET = withV1Route({
  action: 'admin:user_documents:list_all',
  schemas: {},
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  handler: async ({ req, serviceContext }) => {
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const documentType = searchParams.get('documentType') || undefined
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const service = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext!)

    const result = await service.getAllDocuments({
      status: status as DocumentStatus | null | undefined,
      documentType: documentType as DocumentType | null | undefined,
      limit,
      offset,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
