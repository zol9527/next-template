import type { NextRequest } from 'next/server'

import { z } from 'zod'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } from '@/repositories/factory'
import { createUserDocumentService } from '@/services/core/user-document.service'

export const DELETE = withV1Route({
  requireAuth: true,
  action: 'user_documents:delete',
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, params, serviceContext, userId }) => {
        const documentId = params.id

    const service = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext)

    await service.deleteUserDocument(documentId, userId)

    return createJsonApiResponse(req, ok({ id: documentId }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}

