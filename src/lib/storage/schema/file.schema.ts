import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 列出文件请求 Schema
 */
export const ListFilesRequestSchema = z
  .object({
    prefix: z.string().optional().openapi({ description: '前缀路径' }),
    maxKeys: z.number().int().positive().max(1000).optional().default(100).openapi({ description: '最大返回数量' }),
    continuationToken: z.string().optional().openapi({ description: '翻页令牌' }),
  })
  .openapi({ description: '列出文件请求' })

export type ListFilesRequest = z.infer<typeof ListFilesRequestSchema>

/**
 * 文件元数据 Schema
 */
export const FileMetadataSchema = z
  .object({
    key: z.string().openapi({ description: '文件键' }),
    size: z.number().int().openapi({ description: '文件大小（字节）' }),
    lastModified: z.string().datetime().openapi({ description: '最后修改时间' }),
    etag: z.string().nullable().openapi({ description: 'ETag' }),
    contentType: z.string().openapi({ description: 'Content-Type' }),
  })
  .openapi({ description: '文件元数据' })

export type FileMetadata = z.infer<typeof FileMetadataSchema>

/**
 * 列出文件响应 Schema
 */
export const ListFilesResponseSchema = z
  .object({
    files: z.array(FileMetadataSchema).openapi({ description: '文件列表' }),
    nextContinuationToken: z.string().nullable().openapi({ description: '下一页令牌' }),
    isTruncated: z.boolean().openapi({ description: '是否有更多文件' }),
    prefix: z.string().nullable().openapi({ description: '查询前缀' }),
  })
  .openapi({ description: '列出文件响应' })

export type ListFilesResponse = z.infer<typeof ListFilesResponseSchema>

/**
 * 搜索文件请求 Schema
 */
export const SearchFilesRequestSchema = z
  .object({
    query: z.string().min(1).openapi({ description: '搜索关键词' }),
    maxResults: z.number().int().positive().max(100).optional().default(20).openapi({ description: '最大返回数量' }),
  })
  .openapi({ description: '搜索文件请求' })

export type SearchFilesRequest = z.infer<typeof SearchFilesRequestSchema>

/**
 * 搜索文件响应 Schema
 */
export const SearchFilesResponseSchema = z
  .object({
    files: z.array(FileMetadataSchema).openapi({ description: '匹配的文件列表' }),
    totalCount: z.number().int().openapi({ description: '匹配总数' }),
  })
  .openapi({ description: '搜索文件响应' })

export type SearchFilesResponse = z.infer<typeof SearchFilesResponseSchema>
