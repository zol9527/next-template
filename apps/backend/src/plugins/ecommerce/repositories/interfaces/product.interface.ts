import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminProduct } from '@/plugins/ecommerce/contracts/admin-products.dto'

export type ProductMediaAttachmentRecord = {
	id: string
	product_id: string
	asset_id: string
	usage: string
	sort_order: number
	created_at: string
}

export interface ProductRepository {
	listProducts(ctx: RepoContext, params: {
		limit: number
		cursor?: string | null
		keyword?: string
		status?: string
		kind?: string
		categoryIds?: string[]
		isFeatured?: boolean
	}): Promise<{ items: AdminProduct[]; nextCursor: string | null; totalCount: number }>

	getProductById(ctx: RepoContext, params: { productId: string }): Promise<AdminProduct | null>

	listProductsByIds(ctx: RepoContext, params: { productIds: string[] }): Promise<AdminProduct[]>

	createProduct(ctx: RepoContext, params: {
		name: string
		slug?: string | null
		summary?: string | null
		description?: string | null
		productKind: string
		status: string
		price: string
		originalPrice?: string | null
		stockQuantity?: number | null
		isFeatured?: boolean
		tags?: string[]
		serviceGuarantees?: string[]
		currencyCode: string
		createdBy: string
	}): Promise<AdminProduct>

	updateProduct(ctx: RepoContext, params: {
		productId: string
		name?: string
		slug?: string | null
		summary?: string | null
		description?: string | null
		price?: string
		originalPrice?: string | null
		stockQuantity?: number | null
		isFeatured?: boolean
		tags?: string[]
		serviceGuarantees?: string[]
		updatedBy: string
	}): Promise<AdminProduct | null>

	setProductStatus(ctx: RepoContext, params: { productId: string; status: string; updatedBy: string }): Promise<AdminProduct | null>

	deleteProduct(ctx: RepoContext, params: { productId: string; deletedAt?: string; deletedBy: string }): Promise<AdminProduct | null>

	isProductReferenced(ctx: RepoContext, params: { productId: string }): Promise<boolean>

	setProductCategories(ctx: RepoContext, params: { productId: string; categoryIds: string[] }): Promise<void>
	listProductCategoryIds(ctx: RepoContext, params: { productId: string }): Promise<string[]>
	listCategoriesForProducts(ctx: RepoContext, params: { productIds: string[] }): Promise<Map<string, string[]>>

	setProductMediaAttachments(ctx: RepoContext, params: { productId: string; attachments: Array<{ assetId: string; usage: string; sortOrder?: number }> }): Promise<void>
	listProductMediaAttachments(ctx: RepoContext, params: { productId: string }): Promise<ProductMediaAttachmentRecord[]>
	listAttachmentsForProducts(ctx: RepoContext, params: { productIds: string[] }): Promise<Map<string, ProductMediaAttachmentRecord[]>>

	getGlobalStats(ctx: RepoContext): Promise<{ totalProducts: number }>

	// 统计方法
	getProductStats(ctx: RepoContext): Promise<{
		totalProducts: number
		publishedCount: number
		draftCount: number
		featuredCount: number
		todayAdded: number
		lowStockCount: number
	}>
}
