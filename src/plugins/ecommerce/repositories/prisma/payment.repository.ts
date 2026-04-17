import { prisma } from '@/lib/prisma'
import type { PaymentRepository } from '@/plugins/ecommerce/repositories/interfaces/payment.interface'
import type { Payment } from '@/plugins/ecommerce/contracts/payment.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapPayment(r: Record<string, unknown>): Payment {
  const channel = r.channel as string
  const status = r.status as string
  const createdAt = r.createdAt
  const confirmedAt = r.confirmedAt
  const updatedAt = r.updatedAt

  const normalizedCreatedAt = createdAt instanceof Date
    ? createdAt.toISOString()
    : (typeof createdAt === 'string' ? createdAt : '')

  const normalizedConfirmedAt = confirmedAt instanceof Date
    ? confirmedAt.toISOString()
    : (typeof confirmedAt === 'string' ? confirmedAt : null)

  const normalizedUpdatedAt = updatedAt instanceof Date
    ? updatedAt.toISOString()
    : (typeof updatedAt === 'string' ? updatedAt : '')

  return {
    id: r.id as string,
    orderId: r.orderId as string,
    channel: (channel === 'wechat_pay' ? 'wechat_pay' : 'wechat_pay') as 'wechat_pay',
    status: (status === 'succeeded' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending') as 'pending' | 'succeeded' | 'failed',
    amount: String(r.amount),
    currencyCode: r.currencyCode as string,
    providerTradeNo: (r.providerTradeNo as string | null) ?? null,
    providerPayerId: (r.providerPayerId as string | null) ?? null,
    createdAt: normalizedCreatedAt,
    confirmedAt: normalizedConfirmedAt,
    updatedAt: normalizedUpdatedAt,
  }
}

export function createPrismaPaymentRepository(): PaymentRepository {
  return {
    async createPayment(ctx: RepoContext, params: { orderId: string; channel: string; status: string; amount: string; currencyCode: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_payment', orderId: params.orderId, channel: params.channel })

      const payment = await prisma.payment.create({
        data: {
          orderId: params.orderId,
          channel: params.channel,
          status: params.status,
          amount: params.amount,
          currencyCode: params.currencyCode,
        },
      })
      return mapPayment(payment)
    },

    async getPaymentById(ctx: RepoContext, params: { paymentId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payment_by_id', paymentId: params.paymentId })

      const payment = await prisma.payment.findUnique({ where: { id: params.paymentId } })
      return payment ? mapPayment(payment) : null
    },

    async getLatestPaymentByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_latest_payment_by_order_id', orderId: params.orderId })

      const payment = await prisma.payment.findFirst({
        where: { orderId: params.orderId },
        orderBy: { createdAt: 'desc' },
      })
      return payment ? mapPayment(payment) : null
    },

    async getPaymentByProviderTradeNo(ctx: RepoContext, params: { providerTradeNo: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payment_by_provider_trade_no', providerTradeNo: params.providerTradeNo })

      const payment = await prisma.payment.findUnique({ where: { providerTradeNo: params.providerTradeNo } })
      return payment ? mapPayment(payment) : null
    },

    async confirmPaymentSucceeded(ctx: RepoContext, params: { paymentId: string; providerTradeNo: string; providerPayerId?: string | null; confirmedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'confirm_payment_succeeded', paymentId: params.paymentId, providerTradeNo: params.providerTradeNo })

      const payment = await prisma.payment.update({
        where: { id: params.paymentId, status: { not: 'succeeded' } },
        data: {
          status: 'succeeded',
          providerTradeNo: params.providerTradeNo,
          providerPayerId: params.providerPayerId ?? null,
          confirmedAt: new Date(params.confirmedAt),
        },
      })
      return payment ? mapPayment(payment) : null
    },
  }
}
