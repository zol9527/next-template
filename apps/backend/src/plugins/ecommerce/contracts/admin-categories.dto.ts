import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminCategoryStatusSchema = z.enum(['active', 'disabled']).openapi({ description: '分类状态' })

export type AdminCategoryStatus = z.infer<typeof AdminCategoryStatusSchema>

export const AdminCategorySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '分类 ID' }),
    parentId: z.string().uuid().nullable().openapi({ description: '父分类 ID' }),
    name: z.string().openapi({ description: '分类名称' }),
    slug: z.string().nullable().optional().openapi({ description: 'URL 友好标识' }),
    status: AdminCategoryStatusSchema.openapi({ description: '状态' }),
    sortOrder: z.number().int().openapi({ description: '排序（越小越靠前）' }),
    createdAt: z.string().datetime().optional().openapi({ description: '创建时间' }),
    updatedAt: z.string().datetime().optional().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '后台分类' })

export type AdminCategory = z.infer<typeof AdminCategorySchema>

export const AdminCategoryTreeResponseSchema = z
  .object({
    items: z.array(AdminCategorySchema).openapi({ description: '扁平分类列表（由前端渲染树）' }),
  })
  .openapi({ description: '后台分类树响应' })

export type AdminCategoryTreeResponse = z.infer<typeof AdminCategoryTreeResponseSchema>

export const AdminCategoryListQuerySchema = z
  .object({
    search: z.string().optional().openapi({ description: '搜索关键词' }),
  })
  .openapi({ description: '分类列表查询参数' })

export type AdminCategoryListQuery = z.infer<typeof AdminCategoryListQuerySchema>

export const AdminCreateCategoryRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '分类名称' }),
    slug: z.string().nullable().optional().openapi({ description: 'URL 友好标识（可选，留空则自动生成）' }),
    parentId: z.string().uuid().nullable().optional().openapi({ description: '父分类 ID' }),
    sortOrder: z.number().int().optional().openapi({ description: '排序（可选）' }),
  })
  .openapi({ description: '创建分类请求' })

export type AdminCreateCategoryRequest = z.infer<typeof AdminCreateCategoryRequestSchema>

export const AdminUpdateCategoryRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '分类名称' }),
    slug: z.string().nullable().optional().openapi({ description: 'URL 友好标识（可选）' }),
    parentId: z.string().uuid().nullable().optional().openapi({ description: '父分类 ID' }),
    status: AdminCategoryStatusSchema.optional().openapi({ description: '状态' }),
    sortOrder: z.number().int().optional().openapi({ description: '排序' }),
  })
  .openapi({ description: '更新分类请求' })

export type AdminUpdateCategoryRequest = z.infer<typeof AdminUpdateCategoryRequestSchema>

export const AdminDeleteCategoryResponseSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '已删除的分类 ID' }),
  })
  .openapi({ description: '删除分类响应' })

export type AdminDeleteCategoryResponse = z.infer<typeof AdminDeleteCategoryResponseSchema>
