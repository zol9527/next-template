import { createPrismaDocumentVersionRepository } from '@/repositories/prisma/core/document-version.repo'

export async function createDocumentVersionRepository() {
  return await createPrismaDocumentVersionRepository()
}
