import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

const CarouselImageUrlSchema = z
	.string()
	.refine(
		(value) => value.startsWith('/') || /^https?:\/\//i.test(value),
		'图片URL格式不正确'
	)

// ============================================================================
// Types
// ============================================================================

/**
 * Type: MiniprogramCarouselDto
 *
 * Description: 小程序轮播图 DTO
 */
export type MiniprogramCarouselDto = {
	id: string
	title: string
	imageUrl: string
	sortOrder: number
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Type: MiniprogramCarouselListResponse
 *
 * Description: 轮播图列表响应
 */
export type MiniprogramCarouselListResponse = {
	items: MiniprogramCarouselDto[]
	total: number
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema: CreateMiniprogramCarouselRequestSchema
 *
 * Description: 创建轮播图请求 Schema
 */
export const CreateMiniprogramCarouselRequestSchema = z
	.object({
		title: z.string().min(1, '标题不能为空').max(100, '标题最多100字符').openapi({
			description: '轮播图标题',
			example: '春季课程优惠活动',
		}),
		imageUrl: CarouselImageUrlSchema.openapi({
			description: '图片 URL（从媒体库选择）',
			example: 'https://example.com/media/carousel.jpg',
		}),
		sortOrder: z.number().int().min(0, '排序序号不能为负数').default(0).openapi({
			description: '排序序号（越小越靠前）',
			example: 0,
		}),
		isActive: z.boolean().default(true).openapi({
			description: '是否启用',
			example: true,
		}),
	})
	.openapi({ description: '创建小程序轮播图请求' })

/**
 * Schema: UpdateMiniprogramCarouselRequestSchema
 *
 * Description: 更新轮播图请求 Schema
 */
export const UpdateMiniprogramCarouselRequestSchema = z
	.object({
		title: z.string().min(1).max(100).optional().openapi({
			description: '轮播图标题',
		}),
		imageUrl: CarouselImageUrlSchema.optional().openapi({
			description: '图片 URL',
		}),
		sortOrder: z.number().int().min(0).optional().openapi({
			description: '排序序号',
		}),
		isActive: z.boolean().optional().openapi({
			description: '是否启用',
		}),
	})
	.openapi({ description: '更新小程序轮播图请求' })

/**
 * Schema: ReorderCarouselsRequestSchema
 *
 * Description: 批量排序请求 Schema
 */
export const ReorderCarouselsRequestSchema = z
	.object({
		carouselOrders: z
			.array(
				z.object({
					id: z.string().uuid('ID 格式不正确').openapi({
						description: '轮播图 ID',
					}),
					sortOrder: z.number().int().min(0).openapi({
						description: '新的排序序号',
					}),
				}),
			)
			.min(1, '至少需要一个轮播图')
			.max(3, '最多支持3个轮播图')
			.openapi({ description: '轮播图排序列表' }),
	})
	.openapi({ description: '批量排序请求' })

/**
 * Schema: MiniprogramCarouselListQuerySchema
 *
 * Description: 列表查询 Schema
 */
export const MiniprogramCarouselListQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1).openapi({
			description: '页码',
		}),
		pageSize: z.coerce.number().int().min(1).max(100).default(20).openapi({
			description: '每页数量',
		}),
		isActive: z.coerce.boolean().optional().openapi({
			description: '筛选启用状态',
		}),
	})
	.openapi({ description: '轮播图列表查询参数' })

/**
 * Schema: MiniprogramCarouselIdParamSchema
 *
 * Description: 路径参数 Schema
 */
export const MiniprogramCarouselIdParamSchema = z
	.object({
		id: z.string().uuid('ID 格式不正确').openapi({
			description: '轮播图 ID',
		}),
	})
	.openapi({ description: '轮播图 ID 路径参数' })
