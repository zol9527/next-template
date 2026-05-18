import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import type {
  AdminMediaProvider,
  AdminMediaAssetReference,
  AdminMediaAssetType,
} from '@/contracts/dtos/admin/media-assets.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const ASSET_SELECT = 'id,provider,bucket,object_key,url,content_type,size_bytes,status,etag,metadata,created_by,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

function mapAsset(row: Record<string, unknown>) {
  return {
    id: getString(row, 'id')!,
    provider: getString(row, 'provider')! as 'aliyun_oss',
    bucket: getString(row, 'bucket')!,
    objectKey: getString(row, 'object_key')!,
    url: getString(row, 'url'),
    contentType: getString(row, 'content_type')!,
    sizeBytes: getNumber(row, 'size_bytes') ?? 0,
    status: getString(row, 'status') as 'active' | 'archived',
    etag: getString(row, 'etag'),
    // 元数据：存储图片分辨率、视频时长等信息（Json 字段，可为 null）
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    createdBy: getString(row, 'created_by'),
    createdAt: getString(row, 'created_at')!,
    updatedAt: getString(row, 'updated_at')!,
  }
}

/**
Function: createSupabaseMediaAssetRepository

Description: 创建基于 Supabase（Service Role）的媒体资源仓储实现

Parameters:

Returns:
    repository(MediaAssetRepository): MediaAssetRepository 的 Supabase 实现
*/
export function createSupabaseMediaAssetRepository(): MediaAssetRepository {
  const supabase = createSupabaseServiceRoleClient()

  const normalizeTypes = (type: AdminMediaAssetType[] | undefined) => Array.from(new Set(type ?? [])).sort()

  const applyTypeFilter = <Q extends { or: (filters: string) => unknown }>(
    query: Q,
    type: AdminMediaAssetType[] | undefined
  ) => {
    const types = normalizeTypes(type)
    if (types.length === 0) return query

    const ors: string[] = []
    if (types.includes('image')) ors.push('content_type.ilike.image/%')
    if (types.includes('video')) ors.push('content_type.ilike.video/%')
    if (ors.length === 0) return query

    return query.or(ors.join(',')) as Q
  }

  const applySearchFilter = <Q extends { or: (filters: string) => unknown }>(query: Q, search: string | undefined) => {
    const q = (search ?? '').trim()
    if (q === '') return query
    const pattern = `%${q}%`
    return query.or(`object_key.ilike.${pattern},url.ilike.${pattern}`) as Q
  }

  return {
    /**
     * Function: listMediaAssetsCursor
     *
     * Description: 游标分页查询媒体资源列表
     */
    async listMediaAssetsCursor(ctx: RepoContext, params: {
      cursor?: string | null
      limit: number
      status?: string
      provider?: AdminMediaProvider
      contentType?: string
      search?: string
      type?: AdminMediaAssetType[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_media_assets_cursor', limit: params.limit, cursor: params.cursor })

      let query = supabase.from('media_assets').select('*', { count: 'exact' })

      if (params.status) query = query.eq('status', params.status)
      if (params.provider) query = query.eq('provider', params.provider)
      if (params.contentType) query = query.ilike('content_type', `%${params.contentType}%`)

      query = applyTypeFilter(query, params.type)
      query = applySearchFilter(query, params.search)

      // 游标过滤
      if (params.cursor) {
        const cursorDate = new Date(params.cursor).toISOString()
        if (params.sortOrder === 'asc') {
          query = query.gt('created_at', cursorDate)
        } else {
          query = query.lt('created_at', cursorDate)
        }
      }

      // Supabase 使用 snake_case 列名，需要转换
      const sortBy = (params.sortBy ?? 'created_at').replace(/([A-Z])/g, '_$1').toLowerCase()
      const sortOrder = params.sortOrder ?? 'desc'

      logger.info({ action: 'list_media_assets_cursor_query', limit: params.limit, sortBy, sortOrder })

      try {
        const { data, error, count } = await query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .limit(params.limit)

        if (error) {
          logger.error({ error }, 'list_media_assets_cursor query error')
          throw error
        }

        logger.info({ dataCount: data?.length, count }, 'list_media_assets_cursor result')

        const items = (data ?? []).map((r) => mapAsset(r as unknown as Record<string, unknown>))

        // 计算下一页游标
        let nextCursor: string | null = null
        if (items.length === params.limit && items.length > 0) {
          const lastItem = items[items.length - 1]
          nextCursor = lastItem.createdAt
        }

        return { items, nextCursor, total: count ?? 0 }
      } catch (err) {
        logger.error({ error: err }, 'list_media_assets_cursor failed')
        throw err
      }
    },

    async listMediaAssets(ctx: RepoContext, params: {
      limit: number
      offset: number
      status?: string
      provider?: AdminMediaProvider
      contentType?: string
      search?: string
      type?: AdminMediaAssetType[]
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_media_assets', limit: params.limit, offset: params.offset })

      let query = supabase.from('media_assets').select('*', { count: 'exact' })

      if (params.status) query = query.eq('status', params.status)
      if (params.provider) query = query.eq('provider', params.provider)
      if (params.contentType) query = query.ilike('content_type', `%${params.contentType}%`)

      query = applyTypeFilter(query, params.type)
      query = applySearchFilter(query, params.search)

      const from = params.offset
      const to = params.offset + params.limit - 1
      // Supabase 使用 snake_case 列名，需要转换
      const sortBy = (params.sortBy ?? 'created_at').replace(/([A-Z])/g, '_$1').toLowerCase()
      const sortOrder = params.sortOrder ?? 'desc'
      
      logger.info({ action: 'list_media_assets_query', from, to, sortBy, sortOrder })

      try {
        const { data, error, count } = await query.range(from, to).order(sortBy, { ascending: sortOrder === 'asc' })
        
        if (error) {
          logger.error({ error }, 'list_media_assets query error')
          throw error
        }
        
        logger.info({ dataCount: data?.length, count }, 'list_media_assets result')
        
        const items = (data ?? []).map((r) => mapAsset(r as unknown as Record<string, unknown>))
        return { items, total: count ?? 0 }
      } catch (err) {
        logger.error({ error: err }, 'list_media_assets failed')
        throw err
      }
    },

    async getMediaAssetById(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_asset_by_id', assetId: params.assetId })

      const { data, error } = await supabase.from('media_assets').select(ASSET_SELECT).eq('id', params.assetId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapAsset(data as unknown as Record<string, unknown>)
    },

    async getMediaAssetsByIds(ctx: RepoContext, params: { assetIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_assets_by_ids', count: params.assetIds.length })

      if (params.assetIds.length === 0) return []

      const { data, error } = await supabase.from('media_assets').select(ASSET_SELECT).in('id', params.assetIds)
      if (error) throw error
      return (data ?? []).map((r) => mapAsset(r as unknown as Record<string, unknown>))
    },

    async createMediaAsset(ctx: RepoContext, params: { provider: AdminMediaProvider; bucket: string; objectKey: string; url?: string | null; contentType: string; sizeBytes: number; etag?: string | null; metadata?: Record<string, unknown>; createdBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_media_asset', provider: params.provider, objectKey: params.objectKey })

      const { data, error } = await supabase
        .from('media_assets')
        .insert({
          provider: params.provider,
          bucket: params.bucket,
          object_key: params.objectKey,
          url: params.url,
          content_type: params.contentType,
          size_bytes: params.sizeBytes,
          etag: params.etag,
          metadata: params.metadata ?? undefined,
          created_by: params.createdBy,
          status: 'active',
        })
        .select(ASSET_SELECT)
        .single()

      if (error) throw error
      return mapAsset(data as unknown as Record<string, unknown>)
    },

    /**
     * Function: updateMediaAsset
     *
     * Description: 更新媒体资源记录（部分字段）
     */
    async updateMediaAsset(ctx: RepoContext, params: {
      assetId: string
      objectKey?: string
      url?: string | null
      contentType?: string
      sizeBytes?: number
      status?: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_media_asset', assetId: params.assetId })

      // 构建动态更新数据对象，仅包含传入的字段（Supabase 使用 snake_case 列名）
      const data: Record<string, unknown> = {}
      if (params.objectKey !== undefined) data.object_key = params.objectKey
      if (params.url !== undefined) data.url = params.url
      if (params.contentType !== undefined) data.content_type = params.contentType
      if (params.sizeBytes !== undefined) data.size_bytes = params.sizeBytes
      if (params.status !== undefined) data.status = params.status

      const { data: updated, error } = await supabase
        .from('media_assets')
        .update(data)
        .eq('id', params.assetId)
        .select(ASSET_SELECT)
        .single()

      if (error) throw error
      return mapAsset(updated as unknown as Record<string, unknown>)
    },

    /**
     * Function: getStorageBreakdown
     *
     * Description: 按 contentType 前缀分组统计存储空间使用量
     */
    async getStorageBreakdown(ctx: RepoContext): Promise<Record<string, number>> {
      const { logger } = ctx
      logger.info({ action: 'get_storage_breakdown' })

      const { data, error } = await supabase
        .from('media_assets')
        .select('content_type, size_bytes')
        .eq('status', 'active')

      if (error) throw error

      const breakdown: Record<string, number> = {}
      for (const row of data ?? []) {
        const r = row as unknown as Record<string, unknown>
        const ct = (r.content_type as string) ?? ''
        let category: string
        if (ct.startsWith('image/')) category = 'image'
        else if (ct.startsWith('video/')) category = 'video'
        else if (ct.startsWith('audio/')) category = 'audio'
        else category = 'document'

        const bytes = (r.size_bytes as number) ?? 0
        breakdown[category] = (breakdown[category] ?? 0) + bytes
      }

      return breakdown
    },

    async deleteMediaAsset(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_media_asset', assetId: params.assetId })

      const { error } = await supabase.from('media_assets').delete().eq('id', params.assetId)
      if (error) throw error
    },

    /**
     * Function: getMediaReferences
     *
     * Description: 查询指定媒体资产的所有引用关系
     *              通过 product_media_attachments 关联表查询产品引用
     */
    async getMediaReferences(ctx: RepoContext, params: { assetId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_media_references', assetId: params.assetId })

      // 查询产品媒体关联表
      const { data: attachments, error } = await supabase
        .from('product_media_attachments')
        .select('product_id,products(id,name)')
        .eq('asset_id', params.assetId)

      if (error) {
        logger.error({ error }, 'get_media_references query error')
        throw error
      }

      // 去重并转换为统一的引用格式
      const uniqueProducts = new Map<string, { id: string; name: string }>()
      for (const row of attachments ?? []) {
        const product = (row as Record<string, unknown>).products as Record<string, unknown> | null
        if (product) {
          const productId = getString(product, 'id')
          const productName = getString(product, 'name')
          if (productId && productName && !uniqueProducts.has(productId)) {
            uniqueProducts.set(productId, {
              id: productId,
              name: productName,
            })
          }
        }
      }

      const references: AdminMediaAssetReference[] = Array.from(uniqueProducts.values()).map((p) => ({
        id: p.id,
        type: 'product',
        title: p.name,
      }))

      return references
    },
  }
}
