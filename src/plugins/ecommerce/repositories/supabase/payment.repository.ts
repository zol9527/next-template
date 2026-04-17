import type { PaymentRepository } from '@/plugins/ecommerce/repositories/interfaces/payment.interface'
import type { Payment } from '@/plugins/ecommerce/contracts/payment.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const PAYMENT_SELECT =
  'id,order_id,channel,status,amount,currency_code,provider_trade_no,provider_payer_id,created_at,confirmed_at,updated_at'

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

function mapPayment(row: Record<string, unknown>): Payment {
  const id = getString(row, 'id')
  const orderId = getString(row, 'order_id')
  const channel = getString(row, 'channel')
  const status = getString(row, 'status')
  const amount = getStringOrNumberAsString(row, 'amount')
  const currencyCode = getString(row, 'currency_code')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')

  if (!id || !orderId || !channel || !status || !amount || !currencyCode || !createdAt || !updatedAt) {
    throw new Error('Invalid payments row')
  }

  const allowedChannels: readonly string[] = ['wechat_pay']
  const allowedStatuses: readonly string[] = ['pending', 'succeeded', 'failed']

  return {
    id,
    orderId,
    channel: (allowedChannels.includes(channel) ? channel : 'wechat_pay') as Payment['channel'],
    status: (allowedStatuses.includes(status) ? status : 'pending') as Payment['status'],
    amount,
    currencyCode,
    providerTradeNo: getString(row, 'provider_trade_no'),
    providerPayerId: getString(row, 'provider_payer_id'),
    createdAt,
    confirmedAt: getString(row, 'confirmed_at'),
    updatedAt,
  }
}

/**
Function: createSupabasePaymentRepository

Description: 创建基于 Supabase（Service Role）的支付仓储实现，负责 payments 表的读写与幂等确认

Parameters:

Returns:
    repository(PaymentRepository): PaymentRepository 的 Supabase 实现
*/
export function createSupabasePaymentRepository(): PaymentRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async createPayment(ctx: RepoContext, params: { orderId: string; channel: string; status: string; amount: string; currencyCode: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_payment', orderId: params.orderId, channel: params.channel })

      const { data, error } = await supabase
        .from('payments')
        .insert({
          order_id: params.orderId,
          channel: params.channel,
          status: params.status,
          amount: params.amount,
          currency_code: params.currencyCode,
        })
        .select(PAYMENT_SELECT)
        .single()

      if (error) throw error
      return mapPayment(data as unknown as Record<string, unknown>)
    },

    async getPaymentById(ctx: RepoContext, params: { paymentId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payment_by_id', paymentId: params.paymentId })

      const { data, error } = await supabase.from('payments').select(PAYMENT_SELECT).eq('id', params.paymentId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapPayment(data as unknown as Record<string, unknown>)
    },

    async getLatestPaymentByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_latest_payment_by_order_id', orderId: params.orderId })

      const { data, error } = await supabase
        .from('payments')
        .select(PAYMENT_SELECT)
        .eq('order_id', params.orderId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      const row = (data ?? [])[0]
      if (!row) return null
      return mapPayment(row as unknown as Record<string, unknown>)
    },

    async getPaymentByProviderTradeNo(ctx: RepoContext, params: { providerTradeNo: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payment_by_provider_trade_no', providerTradeNo: params.providerTradeNo })

      const { data, error } = await supabase.from('payments').select(PAYMENT_SELECT).eq('provider_trade_no', params.providerTradeNo).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapPayment(data as unknown as Record<string, unknown>)
    },

    async confirmPaymentSucceeded(ctx: RepoContext, params: { paymentId: string; providerTradeNo: string; providerPayerId?: string | null; confirmedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'confirm_payment_succeeded', paymentId: params.paymentId, providerTradeNo: params.providerTradeNo })

      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          provider_trade_no: params.providerTradeNo,
          provider_payer_id: params.providerPayerId ?? null,
          confirmed_at: params.confirmedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.paymentId)
        .neq('status', 'succeeded')
        .select(PAYMENT_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapPayment(data as unknown as Record<string, unknown>)
    },
  }
}
