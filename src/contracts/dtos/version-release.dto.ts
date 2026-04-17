import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 版本发布响应 DTO
 */
export const VersionReleaseResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '版本发布 ID' }),
    version: z.string().openapi({ description: '版本号，如 1.0.1' }),
    title: z.string().openapi({ description: '版本标题' }),
    description: z.string().openapi({ description: '详细更新内容（Markdown）' }),
    releasedAt: z.string().datetime().openapi({ description: '发布时间' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
  })
  .openapi({ description: '版本发布响应' })

/**
 * 同步版本请求 DTO
 */
export const SyncVersionRequestSchema = z
  .object({
    version: z.string().openapi({ description: '版本号' }),
    title: z.string().openapi({ description: '版本标题' }),
    description: z.string().openapi({ description: '详细更新内容' }),
    releasedAt: z.string().datetime().openapi({ description: '发布时间' }),
  })
  .openapi({ description: '同步版本请求' })

/**
 * 版本列表查询参数 DTO
 */
export const VersionReleaseListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1).openapi({ description: '页码' }),
    pageSize: z.coerce.number().int().positive().max(100).default(20).openapi({ description: '每页数量' }),
  })
  .openapi({ description: '版本列表查询参数' })

// 类型导出
export type VersionReleaseResponse = z.infer<typeof VersionReleaseResponseSchema>
export type SyncVersionRequest = z.infer<typeof SyncVersionRequestSchema>
export type VersionReleaseListQuery = z.infer<typeof VersionReleaseListQuerySchema>
