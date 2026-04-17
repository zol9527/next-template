import type { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateDocumentStatusRequestSchema } from '@/contracts/dtos/user-document.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } from '@/repositories/factory'
import { createUserDocumentService } from '@/services/core/user-document.service'

export const PATCH = withV1Route({
  action: 'admin:user_document:update_status',
  requireAccess: { action: 'write' as Action, scope: 'users' as Scope },
  schemas: {
    params: z.object({
      id: z.string().uuid(),
      documentId: z.string().uuid()
    }),
    body: UpdateDocumentStatusRequestSchema
  },
  handler: async ({ serviceContext, params, body, req }) => {

    const userDocService = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext!)

    const updatedDocument = await userDocService.updateDocumentStatusByAdmin(
      params.documentId,
      body!.status,
      body!.rejectionReason
    )

    serviceContext!.logger.info({ documentId: params.documentId, status: body!.status }, 'Document status updated successfully by admin')

    return createJsonApiResponse(req, ok(updatedDocument))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
