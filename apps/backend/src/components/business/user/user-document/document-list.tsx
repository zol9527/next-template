'use client'

import * as React from 'react'
import { type UserDocument } from './use-user-documents'
import { DocumentCard } from './document-card'
import type { DocumentType } from '@/contracts/dtos/user-document.dto'
import { DocumentTypeLabels } from '@/contracts/dtos/user-document.dto'

interface DocumentListProps {
  documentsByType: Record<DocumentType, UserDocument | null>
}

export function DocumentList({ documentsByType }: DocumentListProps) {
  const documentTypes: DocumentType[] = ['id_card', 'unemployment_proof', 'medical_insurance']

  return (
    <div className="space-y-6">
      {documentTypes.map((type) => (
        <DocumentTypeSection
          key={type}
          type={type}
          document={documentsByType[type]}
        />
      ))}
    </div>
  )
}

interface DocumentTypeSectionProps {
  type: DocumentType
  document: UserDocument | null
}

function DocumentTypeSection({ type, document }: DocumentTypeSectionProps) {
  const typeLabel = DocumentTypeLabels[type]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {typeLabel}
        </h3>
        {document?.hasFile && (
          <span className="text-xs text-muted-foreground">
            {formatDate(document.updatedAt)}
          </span>
        )}
      </div>

      <DocumentCard document={document} typeLabel={typeLabel} />
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
