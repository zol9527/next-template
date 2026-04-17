import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createUserDocumentRepository, createDocumentVersionRepository, createUserRepository } from '@/repositories/factory'
import { createUserDocumentService } from '@/services/core/user-document.service'
import type { DocumentType } from '@/contracts/dtos/user-document.dto'

export const GET = withV1Route({
  requireAuth: true,
  action: 'user_documents:list',
  schemas: {},
  handler: async ({ req, serviceContext, userId }) => {

    const service = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext)

    const documents = await service.getUserDocuments(userId)

    return createJsonApiResponse(req, ok({ documents }))
  },
})

export const POST = withV1Route({
  requireAuth: true,
  action: 'user_documents:upload',
  handler: async ({ req, serviceContext, userId }) => {

    const service = createUserDocumentService({
      userDocuments: await createUserDocumentRepository(),
      documentVersions: await createDocumentVersionRepository(),
      users: await createUserRepository(),
    }, serviceContext)

    const formData = await req.formData()
    const documentType = formData.get('documentType') as string | null
    const documentName = formData.get('documentName') as string | null
    const file = formData.get('file') as File | null

    if (!documentType) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', 'Missing documentType'), { status: 400 })
    }

    if (!file) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', 'Missing file'), { status: 400 })
    }

    const document = await service.uploadUserDocument(userId, {
      documentType: documentType as DocumentType,
      documentName,
      file,
      mimeType: file.type,
      fileSize: file.size,
    })

    return createJsonApiResponse(req, ok(document))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
