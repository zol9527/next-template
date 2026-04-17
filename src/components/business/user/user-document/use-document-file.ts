'use client'

import * as React from 'react'
import type { UserDocument } from './use-user-documents'

/**
 * 获取用户文档文件的 Hook
 * 使用内部 API 获取文件，支持权限校验
 */
export function useDocumentFile(document: UserDocument | null) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchFile = React.useCallback(async () => {
    if (!document?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/v1/internal/user-documents/${document.id}/file`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('文档不存在')
        }
        if (res.status === 403) {
          throw new Error('无权访问此文档')
        }
        throw new Error('获取文件失败')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('获取文件失败'))
    } finally {
      setIsLoading(false)
    }
  }, [document?.id])

  // 清理 blob URL
  React.useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  return {
    blobUrl,
    isLoading,
    error,
    refetch: fetchFile,
  }
}
