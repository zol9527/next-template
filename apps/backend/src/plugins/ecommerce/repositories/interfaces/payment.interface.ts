import type { RepoContext } from '@/types/repo/repo-context'
import type { Payment } from '@/plugins/ecommerce/contracts/payment.dto'

export interface PaymentRepository {
  createPayment(ctx: RepoContext, params: {
    orderId: string
    channel: string
    status: string
    amount: string
    currencyCode: string
  }): Promise<Payment>

  getPaymentById(ctx: RepoContext, params: { paymentId: string }): Promise<Payment | null>

  getLatestPaymentByOrderId(ctx: RepoContext, params: { orderId: string }): Promise<Payment | null>

  getPaymentByProviderTradeNo(ctx: RepoContext, params: { providerTradeNo: string }): Promise<Payment | null>

  confirmPaymentSucceeded(ctx: RepoContext, params: {
    paymentId: string
    providerTradeNo: string
    providerPayerId?: string | null
    confirmedAt: string
  }): Promise<Payment | null>
}
