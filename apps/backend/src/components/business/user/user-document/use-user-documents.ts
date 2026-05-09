'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DocumentType } from '@/contracts/dtos/user-document.dto'

export interface UserDocument {
  id: string
  documentType: DocumentType
  documentName: string | null
  hasFile: boolean
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  status: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface UserDocumentsResponse {
  success: boolean
  data: {
    documents: UserDocument[]
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function useUserDocuments() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<UserDocumentsResponse>({
    queryKey: ['user', 'documents'],
    queryFn: async () => {
      const res = await fetch('/api/v1/user/documents', {
        credentials: 'include',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '请求失败' }))
        throw new Error(errorData.message || `HTTP ${res.status}`)
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error((json as { error?: { message?: string } }).error?.message || '获取文档失败')
      }

      return json as UserDocumentsResponse
    },
    staleTime: 5 * 60 * 1000,
  })

  const uploadMutation = useMutation({
    mutationFn: async (params: {
      documentType: DocumentType
      documentName?: string
      file: File
    }) => {
      const { file, documentType, documentName } = params

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error('不支持的文件类型，仅支持 JPG、PNG、WebP 格式')
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('文件大小超过限制，最大支持 10MB')
      }

      const formData = new FormData()
      formData.append('documentType', documentType)
      if (documentName) {
        formData.append('documentName', documentName)
      }
      formData.append('file', file)

      const res = await fetch('/api/v1/user/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '上传失败' }))
        throw new Error(errorData.message || `HTTP ${res.status}`)
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error((json as { error?: { message?: string } }).error?.message || '上传失败')
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'documents'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await fetch(`/api/v1/user/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '删除失败' }))
        throw new Error(errorData.message || `HTTP ${res.status}`)
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error((json as { error?: { message?: string } }).error?.message || '删除失败')
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'documents'] })
    },
  })

  const updateDocumentNote = useMutation({
    mutationFn: async ({ documentId, note }: { documentId: string; note: string }) => {
      const res = await fetch(`/api/v1/user/documents/${documentId}/note`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '更新失败')
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error('更新失败')
      }

      queryClient.invalidateQueries({ queryKey: ['user', 'documents'] })
      return json.data
    },
  })

  const documentsByType = React.useMemo(() => {
    if (!data?.data?.documents) {
      return {
        id_card: null,
        unemployment_proof: null,
        medical_insurance: null,
      } as Record<DocumentType, UserDocument | null>
    }

    const grouped: Record<DocumentType, UserDocument | null> = {
      id_card: null,
      unemployment_proof: null,
      medical_insurance: null,
    }

    data.data.documents.forEach((doc) => {
      grouped[doc.documentType] = doc
    })

    return grouped
  }, [data])

  const stats = React.useMemo(() => {
    const total = data?.data?.documents.length ?? 0
    const uploaded = data?.data?.documents.filter((doc) => doc.hasFile).length ?? 0
    const pending = total - uploaded

    return { total, uploaded, pending }
  }, [data])

  return {
    documents: data?.data?.documents ?? [],
    documentsByType,
    stats,
    isLoading,
    isError,
    error,
    upload: uploadMutation,
    deleteDocument: deleteMutation,
    updateDocumentNote,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['user', 'documents'] }),
  }
}
