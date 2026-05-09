import type { UserDocumentRepository } from '@/repositories/interfaces/core/user-document.interface'
import type { DocumentVersionRepository } from '@/repositories/interfaces/core/document-version.interface'
import { createPrismaUserDocumentRepository } from '@/repositories/prisma/core/user-document.repo'
import { createPrismaDocumentVersionRepository } from '@/repositories/prisma/core/document-version.repo'

export async function createUserDocumentRepository(): Promise<UserDocumentRepository> {
  return createPrismaUserDocumentRepository()
}

export async function createDocumentVersionRepository(): Promise<DocumentVersionRepository> {
  return createPrismaDocumentVersionRepository()
}
