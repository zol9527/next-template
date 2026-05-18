import type { RepoContext } from '@/types/repo/repo-context'
import type {
  AdminMediaAsset,
  AdminMediaProvider,
  AdminMediaAssetReference,
  AdminMediaAssetType,
} from '@/contracts/dtos/admin/media-assets.dto'

export interface MediaAssetRepository {
  getMediaAssetById(ctx: RepoContext, params: { assetId: string }): Promise<AdminMediaAsset | null>

  /**
   * Function: getMediaAssetsByIds
   *
   * Description: 批量查询媒体资源
   */
  getMediaAssetsByIds(ctx: RepoContext, params: { assetIds: string[] }): Promise<AdminMediaAsset[]>

  /**
   * Function: listMediaAssetsCursor
   *
   * Description: 游标分页查询媒体资源列表
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     cursor(string, optional): 游标值
   *     limit(number): 每页数量
   *     status(string, optional): 状态筛选
   *     provider(AdminMediaProvider, optional): 提供商筛选
   *     contentType(string, optional): 内容类型筛选
   *     sortBy(string, optional): 排序字段
   *     sortOrder('asc' | 'desc', optional): 排序方向
   *
   * Returns:
   *   items(AdminMediaAsset[]): 媒体资源列表
   *   nextCursor(string | null): 下一页游标
   *   total(number): 总记录数
   */
  listMediaAssetsCursor(ctx: RepoContext, params: {
    cursor?: string | null
    limit: number
    status?: string
    provider?: AdminMediaProvider
    contentType?: string
    search?: string
    type?: AdminMediaAssetType[]
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{ items: AdminMediaAsset[]; nextCursor: string | null; total: number }>

  /**
   * Function: listMediaAssets
   *
   * Description: 传统分页查询媒体资源列表（保留向后兼容）
   */
  listMediaAssets(ctx: RepoContext, params: {
    limit: number
    offset: number
    status?: string
    provider?: AdminMediaProvider
    contentType?: string
    search?: string
    type?: AdminMediaAssetType[]
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{ items: AdminMediaAsset[]; total: number }>

  createMediaAsset(ctx: RepoContext, params: {
    provider: AdminMediaProvider
    bucket: string
    objectKey: string
    url?: string | null
    contentType: string
    sizeBytes: number
    etag?: string | null
    metadata?: Record<string, unknown>
    createdBy: string
  }): Promise<AdminMediaAsset>

  /**
   * Function: updateMediaAsset
   *
   * Description: 更新媒体资源记录（部分字段）
   */
  updateMediaAsset(ctx: RepoContext, params: {
    assetId: string
    objectKey?: string
    url?: string | null
    contentType?: string
    sizeBytes?: number
    status?: string
  }): Promise<AdminMediaAsset>

  /**
   * Function: getStorageBreakdown
   *
   * Description: 按 contentType 前缀分组统计存储空间使用量
   *
   * Returns:
   *   Record<string, number>: 按类型分组的字节数（key 为 image/video/document/audio）
   */
  getStorageBreakdown(ctx: RepoContext): Promise<Record<string, number>>

  /**
   * Function: deleteMediaAsset
   *
   * Description: 删除指定的媒体资源记录
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 删除参数对象
   *     assetId(string): 待删除的媒体资源 ID
   *
   * Returns:
   *   void: 无返回值
   */
  deleteMediaAsset(ctx: RepoContext, params: { assetId: string }): Promise<void>

  /**
   * Function: getMediaReferences
   *
   * Description: 查询指定媒体资产的所有引用关系
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     assetId(string): 媒体资产 ID
   *
   * Returns:
   *   references(AdminMediaAssetReference[]): 引用列表
   */
  getMediaReferences(ctx: RepoContext, params: { assetId: string }): Promise<AdminMediaAssetReference[]>
}
