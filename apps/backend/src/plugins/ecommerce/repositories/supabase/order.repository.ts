import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { Order } from '@/plugins/ecommerce/contracts/orders.dto'
import type { AdminOrder } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const ORDER_SELECT =
  'id,order_no,user_id,product_id,price_amount,currency_code,paid_amount,refunded_amount,status,created_at,paid_at,completed_at,closed_at,updated_at'

const ADMIN_ORDER_SELECT =
  'id,order_no,user_id,product_id,price_amount,currency_code,paid_amount,refunded_amount,status,created_at,paid_at,completed_at,closed_at,updated_at,user:users!inner(username,phone),product:products!inner(name)'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getStringOrNumberAsString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function mapOrder(row: Record<string, unknown>): Order {
  const id = getString(row, 'id')
  const orderNo = getString(row, 'order_no')
  const userId = getString(row, 'user_id')
  const productId = getString(row, 'product_id')
  const priceAmount = getStringOrNumberAsString(row, 'price_amount')
  const currencyCode = getString(row, 'currency_code')
  const refundedAmount = getStringOrNumberAsString(row, 'refunded_amount')
  const status = getString(row, 'status')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')

  if (!id || !orderNo || !userId || !productId || !priceAmount || !currencyCode || !refundedAmount || !status || !createdAt || !updatedAt) {
    throw new Error('Invalid orders row')
  }

  const allowedStatuses: readonly string[] = ['pending_payment', 'paid', 'cancelled', 'closed', 'refunding', 'refunded', 'completed']

  return {
    id,
    orderNo,
    userId,
    productId,
    priceAmount,
    currencyCode,
    paidAmount: getStringOrNumberAsString(row, 'paid_amount'),
    refundedAmount,
    status: (allowedStatuses.includes(status) ? status : 'pending_payment') as Order['status'],
    fulfillmentStatus: null,
    createdAt,
    paidAt: getString(row, 'paid_at'),
    completedAt: getString(row, 'completed_at'),
    closedAt: getString(row, 'closed_at'),
    updatedAt,
  }
}

interface AdminOrderRow extends Record<string, unknown> {
  id: string
  order_no: string
  user_id: string
  product_id: string
  price_amount: string | number
  currency_code: string
  paid_amount: string | number | null
  refunded_amount: string | number
  status: string
  created_at: string
  paid_at: string | null
  completed_at: string | null
  closed_at: string | null
  updated_at: string
  user: { username: string | null; phone: string | null } | null
  product: { name: string } | null
}

function mapAdminOrder(row: AdminOrderRow): AdminOrder {
  const allowedStatuses: readonly string[] = ['pending_payment', 'paid', 'cancelled', 'closed', 'refunding', 'refunded', 'completed']

  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    userUsername: row.user?.username ?? null,
    userPhone: row.user?.phone ?? null,
    productId: row.product_id,
    productName: row.product?.name ?? null,
    priceAmount: String(row.price_amount),
    currencyCode: row.currency_code,
    paidAmount: row.paid_amount !== null ? String(row.paid_amount) : null,
    refundedAmount: String(row.refunded_amount),
    status: (allowedStatuses.includes(row.status) ? row.status : 'pending_payment') as AdminOrder['status'],
    createdAt: row.created_at,
    paidAt: row.paid_at,
    completedAt: row.completed_at,
    closedAt: row.closed_at,
    updatedAt: row.updated_at,
  }
}

/**
Function: createSupabaseOrderRepository

Description: 创建基于 Supabase（Service Role）的订单仓储实现，负责 orders 表的读写

Parameters:

Returns:
    repository(OrderRepository): OrderRepository 的 Supabase 实现
*/
export function createSupabaseOrderRepository(): OrderRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async createOrder(ctx: RepoContext, params: { orderNo: string; userId: string; productId: string; priceAmount: string; currencyCode: string; status: string; couponRedemptionId?: string | null; discountAmount?: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_order', orderNo: params.orderNo })

      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_no: params.orderNo,
          user_id: params.userId,
          product_id: params.productId,
          price_amount: params.priceAmount,
          currency_code: params.currencyCode,
          status: params.status,
          coupon_redemption_id: params.couponRedemptionId ?? null,
          discount_amount: params.discountAmount ?? '0.00',
        })
        .select(ORDER_SELECT)
        .single()

      if (error) throw error
      return mapOrder(data as unknown as Record<string, unknown>)
    },

    async getOrderById(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_order_by_id', orderId: params.orderId })

      const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', params.orderId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapOrder(data as unknown as Record<string, unknown>)
    },

    async getOrderByOrderNo(ctx: RepoContext, params: { orderNo: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_order_by_order_no', orderNo: params.orderNo })

      const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('order_no', params.orderNo).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapOrder(data as unknown as Record<string, unknown>)
    },

    async listOrders(ctx: RepoContext, params: { limit: number; cursor?: string | null; orderNo?: string | null; userId?: string; status?: string }) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit, 50))

      logger.info({ action: 'list_orders', limit: safeLimit, userId: params.userId })

      let query = supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false })

      if (params.orderNo) {
        query = query.ilike('order_no', `%${params.orderNo}%`)
      }

      if (params.userId) {
        query = query.eq('user_id', params.userId)
      }

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query.limit(safeLimit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>))
      const nextCursor = items.length === safeLimit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor }
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

      const pairs = await Promise.all(
        statuses.map(async (status) => {
          const { count, error } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', params.userId)
            .eq('status', status)

          if (error) throw error

          return [status, count ?? 0] as const
        }),
      )

      return pairs.reduce<Record<string, number>>((acc, [status, count]) => {
        acc[status] = count
        return acc
      }, {})
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
      const safeLimit = Math.max(1, Math.min(params.limit, 50))

      logger.info({ action: 'list_admin_orders', limit: safeLimit })

      let query = supabase.from('orders').select(ADMIN_ORDER_SELECT, { count: 'exact' }).order('created_at', { ascending: false })

      if (params.orderNo) {
        query = query.ilike('order_no', `%${params.orderNo}%`)
      }

      if (params.orderId) {
        query = query.eq('id', params.orderId)
      }

      if (params.userUsername) {
        query = query.ilike('user.username', `%${params.userUsername}%`)
      }

      if (params.userPhone) {
        query = query.ilike('user.phone', `%${params.userPhone}%`)
      }

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      if (params.userIds && params.userIds.length > 0) {
        query = query.in('user_id', params.userIds)
      }

      const { data, error, count } = await query.limit(safeLimit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapAdminOrder(r as unknown as AdminOrderRow))
      const nextCursor = items.length === safeLimit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor, totalCount: count ?? 0 }
    },

    async updateOrderStatus(ctx: RepoContext, params: {
      orderId: string
      status: string
      updatedAt: string
      paidAt?: string | null
      completedAt?: string | null
      closedAt?: string | null
      paidAmount?: string | null
      refundedAmount?: string | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_order_status', orderId: params.orderId, status: params.status })

      const updates: Record<string, unknown> = {
        status: params.status,
        updated_at: params.updatedAt,
      }

      if (params.paidAt !== undefined) updates.paid_at = params.paidAt
      if (params.completedAt !== undefined) updates.completed_at = params.completedAt
      if (params.closedAt !== undefined) updates.closed_at = params.closedAt
      if (params.paidAmount !== undefined) updates.paid_amount = params.paidAmount
      if (params.refundedAmount !== undefined) updates.refunded_amount = params.refundedAmount

      const { data, error } = await supabase.from('orders').update(updates).eq('id', params.orderId).select(ORDER_SELECT).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapOrder(data as unknown as Record<string, unknown>)
    },

    async updateOrder(ctx: RepoContext, params: { orderId: string; couponRedemptionId?: string | null; discountAmount?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_order', orderId: params.orderId })

      const updates: Record<string, unknown> = {}
      if (params.couponRedemptionId !== undefined) updates.coupon_redemption_id = params.couponRedemptionId
      if (params.discountAmount !== undefined) updates.discount_amount = params.discountAmount

      const { data, error } = await supabase.from('orders').update(updates).eq('id', params.orderId).select(ORDER_SELECT).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapOrder(data as unknown as Record<string, unknown>)
    },

    async getDashboardStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_dashboard_stats' })

      const { count: totalCount, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      const { data: allPaidOrders, error: salesError } = await supabase
        .from('orders')
        .select('paid_amount, status')
        .not('paid_amount', 'is', null)

      if (salesError) throw salesError

      let totalSales = 0
      const paidOrdersCount = allPaidOrders?.length ?? 0
      allPaidOrders?.forEach((o) => {
        totalSales += parseFloat((o.paid_amount as string) || '0')
      })

      const successRate = totalCount && totalCount > 0
        ? (paidOrdersCount / totalCount) * 100
        : 0

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('paid_amount')
        .gte('paid_at', startOfToday.toISOString())

      if (todayError) throw todayError
      let dailyRevenue = 0
      todayOrders?.forEach((o) => {
        dailyRevenue += parseFloat((o.paid_amount as string) || '0')
      })

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthlyData: { name: string; value: number }[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const name = months[d.getMonth()]
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

        const { data: monthOrders, error: monthError } = await supabase
          .from('orders')
          .select('paid_amount')
          .gte('paid_at', startOfMonth.toISOString())
          .lte('paid_at', endOfMonth.toISOString())

        if (monthError) throw monthError
        let monthTotal = 0
        monthOrders?.forEach((o) => {
          monthTotal += parseFloat((o.paid_amount as string) || '0')
        })
        monthlyData.push({ name, value: monthTotal })
      }

      return {
        totalSales: totalSales.toFixed(2),
        totalOrders: totalCount ?? 0,
        successRate,
        dailyRevenue: dailyRevenue.toFixed(2),
        monthlySales: monthlyData,
      }
    },
  }
}
