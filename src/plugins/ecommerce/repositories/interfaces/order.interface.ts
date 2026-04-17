import type { RepoContext } from '@/types/repo/repo-context'
import type { Order } from '@/plugins/ecommerce/contracts/orders.dto'
import type { AdminOrder } from '@/plugins/ecommerce/contracts/admin-orders.dto'

export interface OrderRepository {
	createOrder(ctx: RepoContext, params: {
		orderNo: string
		userId: string
		productId: string
		priceAmount: string
		currencyCode: string
		status: string
		couponRedemptionId?: string | null
		discountAmount?: string
	}): Promise<Order>

	getOrderById(ctx: RepoContext, params: { orderId: string }): Promise<Order | null>
	getOrderByOrderNo(ctx: RepoContext, params: { orderNo: string }): Promise<Order | null>

	listOrders(ctx: RepoContext, params: {
		limit: number
		cursor?: string | null
		orderNo?: string | null
		userId?: string
		status?: string
	}): Promise<{ items: Order[]; nextCursor: string | null }>

	countOrdersByStatus(ctx: RepoContext, params: {
		userId: string
		statuses: string[]
	}): Promise<Record<string, number>>

	listAdminOrders(ctx: RepoContext, params: {
		limit: number
		cursor?: string | null
		orderNo?: string | null
		userUsername?: string | null
		userPhone?: string | null
		orderId?: string | null
		userIds?: string[]
	}): Promise<{ items: AdminOrder[]; nextCursor: string | null; totalCount: number }>

	updateOrderStatus(ctx: RepoContext, params: {
		orderId: string
		status: string
		updatedAt: string
		paidAt?: string | null
		completedAt?: string | null
		closedAt?: string | null
		paidAmount?: string | null
		refundedAmount?: string | null
	}): Promise<Order | null>

	updateOrder(ctx: RepoContext, params: {
		orderId: string
		couponRedemptionId?: string | null
		discountAmount?: string
	}): Promise<Order | null>

	getDashboardStats(ctx: RepoContext): Promise<{
		totalSales: string
		totalOrders: number
		successRate: number
		dailyRevenue: string
		monthlySales: { name: string; value: number }[]
	}>
}
