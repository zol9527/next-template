'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminMediaAsset,
  AdminMediaAssetCursorListResponse,
  AdminMediaAssetReferencesResponse,
  AdminMediaAssetType,
  AdminMediaProvider,
  AdminMediaAssetStatus,
  AdminMediaAssetSortBy,
  AdminSortOrder,
} from '@/contracts/dtos/admin/media-assets.dto'
import type { AdminOssUploadPolicyResponse } from '@/contracts/dtos/admin/oss-upload-policy.dto'

export interface AdminMediaUploadProgressInfo {
  percent: number
  loadedBytes: number
  totalBytes: number
}

export interface AdminMediaAssetsListQueryParams {
  enabled?: boolean
  cursor?: string | null
  pageSize?: number
  sortBy?: AdminMediaAssetSortBy
  sortOrder?: AdminSortOrder
  status?: AdminMediaAssetStatus
  provider?: AdminMediaProvider
  contentType?: string
  search?: string
  type?: AdminMediaAssetType[]
}

export interface AdminMediaAssetsReferencesQueryParams {
  assetId?: string | null
  enabled?: boolean
}

export interface StorageUsage {
  used: number
  total: number
  breakdown?: Record<string, number>
}

export interface MediaListPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface UseAdminMediaAssetsParams {
  list?: AdminMediaAssetsListQueryParams
  references?: AdminMediaAssetsReferencesQueryParams
}

export interface AdminMediaAssetsContextValue {
  invalidateList: () => Promise<void>
  uploadAsset: (
    file: File,
    options?: {
      onProgress?: (info: AdminMediaUploadProgressInfo) => void
    },
  ) => Promise<AdminMediaAsset>
  removeAsset: (assetId: string) => Promise<{ id: string }>
  // 新增方法
  renameAsset: (id: string, name: string) => Promise<void>
  fetchStorageUsage: () => Promise<StorageUsage>
}

const AdminMediaAssetsContext = createContext<AdminMediaAssetsContextValue | undefined>(undefined)

/**
Function: AdminMediaAssetsProvider

Description: 后台媒体资产 Provider，提供统一的上传/删除/刷新能力，并约束媒体相关缓存统一挂在 ['admin','media-assets'] 下

Parameters:
	children(ReactNode): 子组件

Returns:
	element(React.ReactElement): Provider 节点
*/
export function AdminMediaAssetsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'media-assets', 'list'] })
  }

  const removeAsset = async (assetId: string) => {
    const res = await fetch(`/api/v1/admin/media-assets/${assetId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: '操作失败' } }))
      throw new Error(error.error?.message || '删除媒体失败')
    }

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || '删除媒体失败')
    }

    await invalidateList()

    return json.data as { id: string }
  }

  const uploadAsset = async (
    file: File,
    options?: {
      onProgress?: (info: AdminMediaUploadProgressInfo) => void
    },
  ) => {
    const policyRes = await fetch('/api/v1/admin/storage/oss/upload-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      }),
    })

    if (!policyRes.ok) {
      const error = await policyRes.json().catch(() => ({ error: { message: '获取签名失败' } }))
      throw new Error(error.error?.message || '获取上传签名失败')
    }

    const policyJson = await policyRes.json()
    if (!policyJson.success) {
      throw new Error(policyJson.error?.message || '获取上传签名失败')
    }

    const policy = policyJson.data as AdminOssUploadPolicyResponse

    const formFields = Object.fromEntries(
      Object.entries(policy.formFields).map(([k, v]) => [k, String(v)]),
    ) as Record<string, string>

    const objectKey = await uploadToObjectStorage({
      uploadUrl: policy.uploadUrl,
      formFields,
      file,
      onProgress: options?.onProgress,
    })

    const bucket = formFields.bucket ?? ''
    const registerRes = await fetch('/api/v1/admin/media-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        provider: policy.provider,
        bucket,
        objectKey,
        url: policy.fileUrl ?? null,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        etag: null,
      }),
    })

    if (!registerRes.ok) {
      const error = await registerRes.json().catch(() => ({ error: { message: '登记失败' } }))
      throw new Error(error.error?.message || '登记媒体失败')
    }

    const registerJson = await registerRes.json()
    if (!registerJson.success) {
      throw new Error(registerJson.error?.message || '登记媒体失败')
    }

    await invalidateList()

    return registerJson.data as AdminMediaAsset
  }

  // 重命名媒体资产
  const renameAsset = async (id: string, name: string) => {
    const res = await fetch(`/api/v1/admin/media-assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: '操作失败' } }))
      throw new Error(error.error?.message || '重命名失败')
    }

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || '重命名失败')
    }

    await invalidateList()
  }

  // 获取存储空间使用情况
  const fetchStorageUsage = async () => {
    const res = await fetch('/api/v1/admin/storage/usage', {
      credentials: 'include',
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: '获取存储信息失败' } }))
      throw new Error(error.error?.message || '获取存储信息失败')
    }

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || '获取存储信息失败')
    }

    return json.data as StorageUsage
  }

  const contextValue: AdminMediaAssetsContextValue = {
    invalidateList,
    uploadAsset,
    removeAsset,
    renameAsset,
    fetchStorageUsage,
  }

  return (
    <AdminMediaAssetsContext.Provider value={contextValue}>
      {children}
    </AdminMediaAssetsContext.Provider>
  )
}

/**
Function: useAdminMediaAssets

Description: 获取后台媒体资产 Provider 的 Hook，用于调用统一的上传/删除/刷新能力

Parameters:
	void(void): 无参数

Returns:
	value(AdminMediaAssetsContextValue): Provider 暴露的能力集合
*/
export function useAdminMediaAssets(params?: UseAdminMediaAssetsParams) {
  const ctx = useContext(AdminMediaAssetsContext)
  if (!ctx) {
    throw new Error('useAdminMediaAssets 必须在 AdminMediaAssetsProvider 内使用')
  }
  const list = params?.list
  const cursor = list?.cursor ?? null
  const pageSize = list?.pageSize ?? 12
  const sortBy = list?.sortBy ?? 'createdAt'
  const sortOrder = list?.sortOrder ?? 'desc'
  const status = list?.status
  const provider = list?.provider
  const contentType = list?.contentType

  const search = (list?.search ?? '').trim()
  const type = Array.from(new Set(list?.type ?? [])).sort()

  const listQuery = useQuery<AdminMediaAssetCursorListResponse>({
    queryKey: ['admin', 'media-assets', 'list', { cursor, pageSize, sortBy, sortOrder, status, provider, contentType, search, type }],
    enabled: list?.enabled ?? false,
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (cursor) searchParams.set('cursor', cursor)
      searchParams.set('pageSize', String(pageSize))
      searchParams.set('sortBy', sortBy)
      searchParams.set('sortOrder', sortOrder)
      if (status) searchParams.set('status', status)
      if (provider) searchParams.set('provider', provider)
      if (contentType) searchParams.set('contentType', contentType)
      if (search) searchParams.set('search', search)
      for (const t of type) {
        searchParams.append('type', t)
      }

      const res = await fetch(`/api/v1/admin/media-assets?${searchParams.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取媒体列表失败')
      }

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error?.message || '获取媒体列表失败')
      }

      return json.data as AdminMediaAssetCursorListResponse
    },
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  })

  const references = params?.references
  const assetId = references?.assetId ?? null

  const referencesQuery = useQuery<AdminMediaAssetReferencesResponse>({
    queryKey: ['admin', 'media-assets', 'references', assetId],
    enabled: (references?.enabled ?? true) && !!assetId,
    queryFn: async () => {
      if (!assetId) {
        return { references: [], count: 0 }
      }

      const res = await fetch(`/api/v1/admin/media-assets/${assetId}/references`, {
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 404) {
          return { references: [], count: 0 }
        }

        const error = await res.json().catch(() => ({ error: { message: '查询失败' } }))
        throw new Error(error.error?.message || '获取引用列表失败')
      }

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error?.message || '获取引用列表失败')
      }

      return json.data as AdminMediaAssetReferencesResponse
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    ...ctx,
    listQuery,
    referencesQuery,
  }
}

/**
 * Function: useAdminMediaAssetsPaginated
 *
 * Description: 使用传统分页查询媒体资产的 Hook
 *
 * Parameters:
 *   params: {
 *     page: number
 *     pageSize: number
 *     search?: string
 *     type?: AdminMediaAssetType[]
 *     sortBy?: string
 *     sortOrder?: 'asc' | 'desc'
 *     enabled?: boolean
 *   }
 *
 * Returns:
 *   listQuery and context methods
 */
export function useAdminMediaAssetsPaginated(params?: {
  page?: number
  pageSize?: number
  search?: string
  type?: AdminMediaAssetType[]
  sortBy?: AdminMediaAssetSortBy
  sortOrder?: AdminSortOrder
  enabled?: boolean
}) {
  const ctx = useContext(AdminMediaAssetsContext)
  if (!ctx) {
    throw new Error('useAdminMediaAssetsPaginated 必须在 AdminMediaAssetsProvider 内使用')
  }

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const search = (params?.search ?? '').trim()
  const type = Array.from(new Set(params?.type ?? [])).sort()
  const sortBy = params?.sortBy ?? 'createdAt'
  const sortOrder = params?.sortOrder ?? 'desc'

  const listQuery = useQuery<{
    items: AdminMediaAsset[]
    pagination: MediaListPagination
  }>({
    queryKey: ['admin', 'media-assets', 'paginated', { page, pageSize, search, type, sortBy, sortOrder }],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('pageSize', String(pageSize))
      searchParams.set('sortBy', sortBy)
      searchParams.set('sortOrder', sortOrder)
      if (search) searchParams.set('search', search)
      for (const t of type) {
        searchParams.append('type', t)
      }

      const res = await fetch(`/api/v1/admin/media-assets?${searchParams.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取媒体列表失败')
      }

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error?.message || '获取媒体列表失败')
      }

      return json.data as { items: AdminMediaAsset[]; pagination: MediaListPagination }
    },
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  })

  return {
    ...ctx,
    listQuery,
  }
}

async function uploadToObjectStorage(params: {
  uploadUrl: string
  formFields: Record<string, string>
  file: File
  onProgress?: (info: AdminMediaUploadProgressInfo) => void
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()

    for (const [k, v] of Object.entries(params.formFields)) {
      form.append(k, v)
    }
    form.append('file', params.file)

    if (params.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return

        const loadedBytes = e.loaded
        const totalBytes = e.total
        const percent = Math.round((loadedBytes / totalBytes) * 100)

        params.onProgress!({
          percent,
          loadedBytes,
          totalBytes,
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const objectKey = params.formFields.key
        if (!objectKey) {
          reject(new Error('Missing object key'))
        } else {
          resolve(objectKey)
        }
      } else {
        reject(new Error(`OSS upload failed: ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during OSS upload'))

    xhr.open('POST', params.uploadUrl, true)
    xhr.send(form)
  })
}
