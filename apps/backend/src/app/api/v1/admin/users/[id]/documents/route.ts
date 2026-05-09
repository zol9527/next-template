import type { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } from '@/repositories/factory'
import { createUserDocumentService } from '@/services/core/user-document.service'

export const GET = withV1Route({
  action: 'admin:user_documents:list',
  requireAccess: { action: 'read' as Action, scope: 'users' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ serviceContext, params, req }) => {
    const userId = params.id

    const service = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext!)

    const documents = await service.getUserDocuments(userId)

    return createJsonApiResponse(req, ok({ documents }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
