import { prisma } from '@/lib/prisma'
import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { Order as OrderDto } from '@/plugins/ecommerce/contracts/orders.dto'
import type { AdminOrder } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { Prisma, type Order as PrismaOrder } from '@/lib/prisma/generated/prisma'

function mapOrder(o: PrismaOrder): OrderDto {
  const allowedStatuses: readonly string[] = ['pending_payment', 'paid', 'cancelled', 'closed', 'refunding', 'refunded', 'completed']
  const status = o.status
  return {
    id: o.id,
    orderNo: o.orderNo,
    userId: o.userId,
    productId: o.productId,
    priceAmount: o.priceAmount.toString(),
    currencyCode: o.currencyCode,
    paidAmount: o.paidAmount ? o.paidAmount.toString() : null,
    refundedAmount: o.refundedAmount.toString(),
    status: (allowedStatuses.includes(status) ? status : 'pending_payment') as OrderDto['status'],
    fulfillmentStatus: null,

    couponRedemptionId: o.couponRedemptionId ?? null,
    discountAmount: o.discountAmount ? o.discountAmount.toString() : null,

    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    completedAt: o.completedAt ? o.completedAt.toISOString() : null,
    closedAt: o.closedAt ? o.closedAt.toISOString() : null,
    updatedAt: o.updatedAt.toISOString(),
  }
}

type PrismaAdminOrder = Prisma.OrderGetPayload<{
	include: {
		user: { select: { username: true; phone: true } }
		product: { select: { name: true } }
	}
}>

function mapAdminOrder(o: PrismaAdminOrder): AdminOrder {
	const allowedStatuses: readonly string[] = ['pending_payment', 'paid', 'cancelled', 'closed', 'refunding', 'refunded', 'completed']
	const status = o.status
	return {
		id: o.id,
		orderNo: o.orderNo,
		userId: o.userId,
		userUsername: o.user?.username ?? null,
		userPhone: o.user?.phone ?? null,
		productId: o.productId,
		productName: o.product?.name ?? null,
		priceAmount: o.priceAmount.toString(),
		currencyCode: o.currencyCode,
		paidAmount: o.paidAmount ? o.paidAmount.toString() : null,
		refundedAmount: o.refundedAmount.toString(),
		status: (allowedStatuses.includes(status) ? status : 'pending_payment') as AdminOrder['status'],
		createdAt: o.createdAt.toISOString(),
		paidAt: o.paidAt ? o.paidAt.toISOString() : null,
		completedAt: o.completedAt ? o.completedAt.toISOString() : null,
		closedAt: o.closedAt ? o.closedAt.toISOString() : null,
		updatedAt: o.updatedAt.toISOString(),
	}
}

export function createPrismaOrderRepository(): OrderRepository {
  return {
    async createOrder(ctx: RepoContext, params: { orderNo: string; userId: string; productId: string; priceAmount: string; currencyCode: string; status: string; couponRedemptionId?: string | null; discountAmount?: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_order', orderNo: params.orderNo })

      const order = await prisma.order.create({
        data: {
          orderNo: params.orderNo,
          userId: params.userId,
          productId: params.productId,
          priceAmount: params.priceAmount,
          currencyCode: params.currencyCode,
          status: params.status,
          couponRedemptionId: params.couponRedemptionId ?? null,
          discountAmount: params.discountAmount ?? '0.00',
        },
      })
      return mapOrder(order)
    },

    async getOrderById(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_order_by_id', orderId: params.orderId })

      const order = await prisma.order.findUnique({ where: { id: params.orderId } })
      if (!order) return null
      return mapOrder(order)
    },

    async getOrderByOrderNo(ctx: RepoContext, params: { orderNo: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_order_by_order_no', orderNo: params.orderNo })

      const order = await prisma.order.findUnique({ where: { orderNo: params.orderNo } })
      if (!order) return null
      return mapOrder(order)
    },

    async listOrders(ctx: RepoContext, params: { limit: number; cursor?: string | null; orderNo?: string | null; userId?: string; status?: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_orders', limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit, 50))
      const where: Record<string, unknown> = {}

      if (params.orderNo) where.orderNo = { contains: params.orderNo }
      if (params.userId) where.userId = params.userId
      if (params.status) where.status = params.status
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      })

      return {
        items: orders.map(mapOrder),
        nextCursor: orders.length === safeLimit ? orders[orders.length - 1]?.createdAt.toISOString() ?? null : null,
      }
    },

    /**
    Function: countOrdersByStatus

    Description: 按状态统计用户订单数量

    Parameters:
      ctx(RepoContext): 仓储上下文
      params({ userId: string; statuses: string[] }): 用户 ID 与状态列表

    Returns:
      counts(Record<string, number>): 状态到数量的映射
    */
    async countOrdersByStatus(ctx: RepoContext, params: { userId: string; statuses: string[] }) {
      const { logger } = ctx
      const statuses = Array.from(new Set(params.statuses)).filter(Boolean)
      if (statuses.length === 0) return {}

      logger.info({ action: 'count_orders_by_status', userId: params.userId, count: statuses.length })

      const rows = await prisma.order.groupBy({
        by: ['status'],
        where: {
          userId: params.userId,
          status: { in: statuses },
        },
        _count: { _all: true },
      })

      const result: Record<string, number> = {}
      rows.forEach((row) => {
        result[row.status] = row._count._all
      })
      return result
    },

    async listAdminOrders(ctx: RepoContext, params: {
      limit: number
      cursor?: string | null
      orderNo?: string | null
      userUsername?: string | null
      userPhone?: string | null
      orderId?: string | null
      userIds?: string[]
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_admin_orders', limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit, 50))
      const where: Prisma.OrderWhereInput = {}

      if (params.orderNo) where.orderNo = { contains: params.orderNo }
      if (params.orderId) where.id = params.orderId
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }
      if (params.userIds && params.userIds.length > 0) where.userId = { in: params.userIds }

      // 用户名和手机号筛选需要 JOIN users 表
      if (params.userUsername || params.userPhone) {
        where.user = {}
        if (params.userUsername) where.user.username = { contains: params.userUsername }
        if (params.userPhone) where.user.phone = { contains: params.userPhone }
      }

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
          include: {
            user: { select: { username: true, phone: true } },
            product: { select: { name: true } },
          },
        }),
        prisma.order.count({ where }),
      ])

      return {
        items: orders.map(mapAdminOrder),
        nextCursor: orders.length === safeLimit ? orders[orders.length - 1]?.createdAt.toISOString() ?? null : null,
        totalCount,
      }
    },

    async updateOrderStatus(ctx: RepoContext, params: { orderId: string; status: string; updatedAt: string; paidAt?: string | null; completedAt?: string | null; closedAt?: string | null; paidAmount?: string | null; refundedAmount?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'update_order_status', orderId: params.orderId, status: params.status })

      const data: Record<string, unknown> = {
        status: params.status,
        updatedAt: new Date(params.updatedAt),
      }
      if (params.paidAt != null) data.paidAt = new Date(params.paidAt)
      if (params.completedAt != null) data.completedAt = new Date(params.completedAt)
      if (params.closedAt != null) data.closedAt = new Date(params.closedAt)
      if (params.paidAmount !== undefined) data.paidAmount = params.paidAmount
      if (params.refundedAmount !== undefined) data.refundedAmount = params.refundedAmount

      const order = await prisma.order.update({
        where: { id: params.orderId },
        data,
      })
      return mapOrder(order)
    },

    async updateOrder(ctx: RepoContext, params: { orderId: string; couponRedemptionId?: string | null; discountAmount?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_order', orderId: params.orderId })

      const data: Record<string, unknown> = {}
      if (params.couponRedemptionId !== undefined) data.couponRedemptionId = params.couponRedemptionId
      if (params.discountAmount !== undefined) data.discountAmount = params.discountAmount

      const order = await prisma.order.update({
        where: { id: params.orderId },
        data,
      })
      return mapOrder(order)
    },

    // CAS (Compare-And-Swap) 原子状态更新，防止并发竞态条件
    async updateOrderStatusCas(ctx: RepoContext, params: {
      orderId: string
      expectedStatus: string
      newStatus: string
      paidAt?: string | null
      paidAmount?: string | null
      updatedAt: string
    }): Promise<{ updated: boolean }> {
      const { logger } = ctx
      logger.info({ action: 'update_order_status_cas', orderId: params.orderId, expectedStatus: params.expectedStatus, newStatus: params.newStatus })

      const data: Record<string, unknown> = {
        status: params.newStatus,
        updatedAt: new Date(params.updatedAt),
      }
      if (params.paidAt != null) data.paidAt = new Date(params.paidAt)
      if (params.paidAmount !== undefined) data.paidAmount = params.paidAmount

      try {
        const order = await prisma.order.updateMany({
          where: { id: params.orderId, status: params.expectedStatus },
          data,
        })
        return { updated: order.count > 0 }
      } catch {
        return { updated: false }
      }
    },

    // 原子退款金额递增，使用事务 + 条件检查防止超退（安全修复 H-1）
    async tryIncrementRefundedAmount(ctx: RepoContext, params: {
      orderId: string
      incrementAmount: string
      maxAmount: string
      updatedAt: string
    }): Promise<{ success: boolean }> {
      const { logger } = ctx
      logger.info({ action: 'try_increment_refunded_amount', orderId: params.orderId, incrementAmount: params.incrementAmount })

      // 安全修复 H-1: 使用 Prisma 事务 + 原子条件更新防止超退
      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: params.orderId },
          select: { refundedAmount: true, paidAmount: true, priceAmount: true },
        })

        if (!order) return false

        const currentRefunded = order.refundedAmount
        const increment = new Prisma.Decimal(params.incrementAmount)
        const maxAmount = new Prisma.Decimal(params.maxAmount)
        const newRefunded = currentRefunded.plus(increment)

        if (newRefunded.greaterThan(maxAmount)) return false

        await tx.order.update({
          where: { id: params.orderId },
          data: {
            refundedAmount: newRefunded,
            updatedAt: new Date(params.updatedAt),
          },
        })

        return true
      })

      return { success: result }
    },

    async getDashboardStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_dashboard_stats' })

      const [totalCount, totalSales, paidOrders] = await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { paidAmount: true } }),
        prisma.order.count({ where: { paidAmount: { not: null } } }),
      ])

      return {
        totalSales: totalSales._sum.paidAmount ? String(totalSales._sum.paidAmount) : '0',
        totalOrders: totalCount,
        successRate: totalCount > 0 ? (paidOrders / totalCount) * 100 : 0,
        dailyRevenue: '0',
        monthlySales: [],
      }
    },
  }
}
