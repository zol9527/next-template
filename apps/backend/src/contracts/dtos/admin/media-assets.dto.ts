import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminMediaProviderSchema = z.enum(['aliyun_oss', 'tencent_cos', 'local']).openapi({ description: '媒体存储提供方' })

export type AdminMediaProvider = z.infer<typeof AdminMediaProviderSchema>

export const AdminMediaAssetStatusSchema = z.enum(['active', 'archived']).openapi({ description: '媒体状态' })

export type AdminMediaAssetStatus = z.infer<typeof AdminMediaAssetStatusSchema>

export const AdminMediaAssetSortBySchema = z
  .enum(['createdAt', 'sizeBytes'])
  .openapi({ description: '排序字段（白名单）' })

export type AdminMediaAssetSortBy = z.infer<typeof AdminMediaAssetSortBySchema>

export const AdminSortOrderSchema = z.enum(['asc', 'desc']).openapi({ description: '排序方向' })

export type AdminSortOrder = z.infer<typeof AdminSortOrderSchema>

export const AdminMediaContentTypeSchema = z
  .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/octet-stream'])
  .openapi({ description: 'Content-Type（白名单）' })

export type AdminMediaContentType = z.infer<typeof AdminMediaContentTypeSchema>

export const AdminMediaAssetTypeSchema = z
  .enum(['image', 'video'])
  .openapi({ description: '媒体类型过滤（按 contentType 前缀映射）' })

export type AdminMediaAssetType = z.infer<typeof AdminMediaAssetTypeSchema>

/**
 * 媒体资源元数据 Schema
 * 用于存储图片分辨率、视频时长等信息
 */
export const AdminMediaAssetMetadataSchema = z
  .object({
    width: z.number().int().positive().optional().openapi({ description: '图片/视频宽度 (px)' }),
    height: z.number().int().positive().optional().openapi({ description: '图片/视频高度 (px)' }),
    duration: z.number().positive().optional().openapi({ description: '视频时长 (秒)' }),
  })
  .passthrough()
  .openapi({ description: '媒体资源元数据（分辨率、时长等）' })

export type AdminMediaAssetMetadata = z.infer<typeof AdminMediaAssetMetadataSchema>

export const AdminMediaAssetSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '媒体 ID' }),
    provider: AdminMediaProviderSchema.openapi({ description: '提供方' }),
    bucket: z.string().openapi({ description: 'Bucket' }),
    objectKey: z.string().openapi({ description: '对象 Key' }),
    url: z.string().nullable().openapi({ description: '可选 URL（可由 objectKey 推导）' }),
    contentType: z.string().openapi({ description: 'Content-Type' }),
    sizeBytes: z.number().int().openapi({ description: '大小（字节）' }),
    etag: z.string().nullable().openapi({ description: 'ETag（可选）' }),
    status: AdminMediaAssetStatusSchema.openapi({ description: '状态' }),
    metadata: AdminMediaAssetMetadataSchema.nullable().optional().openapi({ description: '媒体元数据（分辨率、时长等）' }),
    createdBy: z.string().uuid().nullable().optional().openapi({ description: '创建者 ID' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
    updatedAt: z.string().datetime().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '后台媒体资源' })

export type AdminMediaAsset = z.infer<typeof AdminMediaAssetSchema>

export const AdminMediaAssetListResponseSchema = z
  .object({
    items: z.array(AdminMediaAssetSchema).openapi({ description: '媒体资源列表' }),
    total: z.number().int().min(0).openapi({ description: '满足条件的总数' }),
    page: z.number().int().min(1).openapi({ description: '当前页码（从 1 开始）' }),
    pageSize: z.number().int().min(1).max(50).openapi({ description: '分页大小' }),
  })
  .openapi({ description: '后台媒体资源列表响应' })

export type AdminMediaAssetListResponse = z.infer<typeof AdminMediaAssetListResponseSchema>

export const AdminMediaAssetListQuerySchema = z
  .object({
    page: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .openapi({ description: '页码（从 1 开始，默认 1）' }),
    ),
    pageSize: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .openapi({ description: '分页大小（默认 20，最大 50）' }),
    ),

    status: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaAssetStatusSchema.optional().openapi({ description: '媒体状态过滤（可选）' }),
    ),

    provider: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaProviderSchema.optional().openapi({ description: '提供方过滤（可选）' }),
    ),

    contentType: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaContentTypeSchema.optional().openapi({ description: 'Content-Type 过滤（可选）' }),
    ),

    search: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      z.string().trim().min(1).max(200).optional().openapi({ description: '搜索关键词（可选）' }),
    ),

    type: z.preprocess(
      (v) => (v === undefined ? undefined : (Array.isArray(v) ? v : [v])),
      z.array(AdminMediaAssetTypeSchema).optional().default([]).openapi({ description: '媒体类型过滤（可选）' }),
    ),

    sortBy: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaAssetSortBySchema.optional().default('createdAt').openapi({ description: '排序字段（默认 createdAt）' }),
    ),

    sortOrder: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminSortOrderSchema.optional().default('desc').openapi({ description: '排序方向（默认 desc）' }),
    ),
  })
  .openapi({ description: '后台媒体资源列表查询参数' })

export type AdminMediaAssetListQuery = z.infer<typeof AdminMediaAssetListQuerySchema>

export const AdminCreateMediaAssetRequestSchema = z
  .object({
    provider: AdminMediaProviderSchema.openapi({ description: '提供方' }),
    bucket: z.string().min(1).openapi({ description: 'Bucket' }),
    objectKey: z.string().min(1).openapi({ description: '对象 Key' }),
    url: z.string().nullable().optional().openapi({ description: '可选 URL' }),
    contentType: z.string().min(1).openapi({ description: 'Content-Type' }),
    sizeBytes: z.number().int().nonnegative().openapi({ description: '大小（字节）' }),
    etag: z.string().nullable().optional().openapi({ description: 'ETag（可选）' }),
    metadata: AdminMediaAssetMetadataSchema.optional().openapi({ description: '媒体元数据（可选）' }),
  })
  .openapi({ description: '登记媒体资源请求（上传成功后写入元数据）' })

export type AdminCreateMediaAssetRequest = z.infer<typeof AdminCreateMediaAssetRequestSchema>

/**
 * 游标分页相关类型定义
 * 用于支持与传统页码分页不同的游标分页模式
 */

export const AdminMediaAssetCursorListQuerySchema = z
  .object({
    cursor: z.string().optional().openapi({ description: '游标，用于获取下一页数据' }),
    pageSize: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(12)
        .openapi({ description: '分页大小（默认 12，最大 50）' }),
    ),
    status: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaAssetStatusSchema.optional().openapi({ description: '媒体状态过滤（可选）' }),
    ),
    provider: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaProviderSchema.optional().openapi({ description: '提供方过滤（可选）' }),
    ),
    contentType: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaContentTypeSchema.optional().openapi({ description: 'Content-Type 过滤（可选）' }),
    ),

    search: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      z.string().trim().min(1).max(200).optional().openapi({ description: '搜索关键词（可选）' }),
    ),

    type: z.preprocess(
      (v) => (v === undefined ? undefined : (Array.isArray(v) ? v : [v])),
      z.array(AdminMediaAssetTypeSchema).optional().default([]).openapi({ description: '媒体类型过滤（可选）' }),
    ),
    sortBy: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminMediaAssetSortBySchema.optional().default('createdAt').openapi({ description: '排序字段（默认 createdAt）' }),
    ),
    sortOrder: z.preprocess(
      (v) => (Array.isArray(v) ? v[0] : v),
      AdminSortOrderSchema.optional().default('desc').openapi({ description: '排序方向（默认 desc）' }),
    ),
  })
  .openapi({ description: '后台媒体资源游标分页查询参数' })

export type AdminMediaAssetCursorListQuery = z.infer<typeof AdminMediaAssetCursorListQuerySchema>

export const AdminMediaAssetCursorListResponseSchema = z
  .object({
    items: z.array(AdminMediaAssetSchema).openapi({ description: '媒体资源列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标，null 表示没有更多数据' }),
    totalRecords: z.number().int().min(0).openapi({ description: '总记录数' }),
  })
  .openapi({ description: '后台媒体资源游标分页响应' })

export type AdminMediaAssetCursorListResponse = z.infer<typeof AdminMediaAssetCursorListResponseSchema>

/**
 * 媒体引用相关类型定义
 * 用于检查媒体资产是否被其他资源引用
 */
export const AdminMediaAssetReferenceTypeSchema = z
  .enum(['product', 'category', 'announcement'])
  .openapi({ description: '引用类型' })

export type AdminMediaAssetReferenceType = z.infer<typeof AdminMediaAssetReferenceTypeSchema>

export const AdminMediaAssetReferenceSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '引用资源的 ID' }),
    type: AdminMediaAssetReferenceTypeSchema.openapi({ description: '引用类型' }),
    title: z.string().openapi({ description: '引用资源的标题' }),
  })
  .openapi({ description: '媒体资产引用信息' })

export type AdminMediaAssetReference = z.infer<typeof AdminMediaAssetReferenceSchema>

export const AdminMediaAssetReferencesResponseSchema = z
  .object({
    references: z.array(AdminMediaAssetReferenceSchema).openapi({ description: '引用列表' }),
    count: z.number().int().min(0).openapi({ description: '引用总数' }),
  })
  .openapi({ description: '媒体资产引用列表响应' })

export type AdminMediaAssetReferencesResponse = z.infer<typeof AdminMediaAssetReferencesResponseSchema>
