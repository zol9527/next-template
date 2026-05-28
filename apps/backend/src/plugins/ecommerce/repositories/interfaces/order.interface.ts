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

	/**
	 * 安全修复 M-1: CAS（Compare-And-Swap）原子状态更新
	 *
	 * 仅当订单当前状态等于 expectedStatus 时才更新为 newStatus，
	 * 防止并发回调导致重复状态推进和重复履约任务创建。
	 *
	 * @returns updated - true 表示更新成功，false 表示状态已变更（CAS 失败）
	 */
	updateOrderStatusCas(ctx: RepoContext, params: {
		orderId: string
		expectedStatus: string
		newStatus: string
		paidAt?: string | null
		paidAmount?: string | null
		updatedAt: string
	}): Promise<{ updated: boolean }>

	/**
	 * 安全修复 H-1: 原子退款金额递增（防超退）
	 *
	 * 使用数据库层面的原子操作确保退款金额不会超过订单实付金额：
	 * UPDATE orders SET refunded_amount = refunded_amount + increment
	 * WHERE id = orderId AND (refunded_amount + increment) <= paid_amount
	 *
	 * @returns success - true 表示递增成功，false 表示超过实付金额（拒绝退款）
	 */
	tryIncrementRefundedAmount(ctx: RepoContext, params: {
		orderId: string
		incrementAmount: string
		maxAmount: string
		updatedAt: string
	}): Promise<{ success: boolean }>

	getDashboardStats(ctx: RepoContext): Promise<{
		totalSales: string
		totalOrders: number
		successRate: number
		dailyRevenue: string
		monthlySales: { name: string; value: number }[]
	}>
}
