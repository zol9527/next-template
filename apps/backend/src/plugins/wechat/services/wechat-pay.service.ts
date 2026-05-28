import crypto from 'node:crypto'
import type { WechatPayJsapiParams } from '@/plugins/wechat/contracts/wechat-pay.dto'
import { env } from '@/config'
import type { WechatPayTransaction } from '@/lib/wechat/pay'
import { createWechatPayJsapiTransaction, refundWechatPayTransaction } from '@/lib/wechat/pay'
import type { IdempotencyRepository } from '@/repositories/interfaces/core/idempotency.interface'
import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { PaymentRepository } from '@/plugins/ecommerce/repositories/interfaces/payment.interface'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class WechatPayServiceError extends Error {
  public readonly code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'INVALID_INPUT' | 'INVALID_STATE' | 'INTERNAL_ERROR'

  constructor(code: WechatPayServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export type WechatPayRefundOutcome = {
  applied: boolean
  outRefundNo: string
}

function hashText(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function isUniqueConstraintError(error: unknown): boolean {
  const e = error as { code?: unknown }
  return e.code === '23505' || e.code === 'P2002'
}

function extractOutRefundNoFromResponseBody(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const data = value as { outRefundNo?: unknown }
  return typeof data.outRefundNo === 'string' && data.outRefundNo.length > 0 ? data.outRefundNo : null
}

function decimalStringToFen(amount: string): number {
  const trimmed = amount.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('Invalid decimal amount')
  }

  const [intPart, fracPartRaw] = trimmed.split('.')
  const fracPart = (fracPartRaw ?? '').padEnd(2, '0').slice(0, 2)

  const fen = Number(intPart) * 100 + Number(fracPart)
  if (!Number.isSafeInteger(fen) || fen < 0) {
    throw new Error('Invalid amount fen')
  }

  return fen
}

/**
Function: createWechatPayService

Description: 创建微信支付业务服务，负责发起支付与处理支付回调（幂等确认与订单状态推进）

Parameters:
    deps({ orders: OrderRepository, payments: PaymentRepository, products: ProductRepository, wechatAccounts: WechatAccountRepository }): 依赖注入的订单/支付/商品/微信账户仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 createJsapiPayForOrder/handleNotify 等方法的服务对象
*/
export function createWechatPayService(
  deps: {
    orders: OrderRepository
    payments: PaymentRepository
    products: ProductRepository
    fulfillmentJobs: OrderFulfillmentJobRepository
    wechatAccounts: WechatAccountRepository
    idempotency?: IdempotencyRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async createJsapiPayForOrder(params: { userId: string; orderId: string; payerOpenId?: string }): Promise<{ prepayId: string; params: WechatPayJsapiParams }> {
      const order = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
      if (!order) throw new WechatPayServiceError('NOT_FOUND', 'Order not found')
      if (order.userId !== params.userId) throw new WechatPayServiceError('UNAUTHORIZED', 'Unauthorized')

      if (order.status !== 'pending_payment') {
        throw new WechatPayServiceError('INVALID_STATE', 'Order is not payable')
      }

      let openid = params.payerOpenId
      if (!openid) {
        const account = await deps.wechatAccounts.findByUserId(repoCtx, { userId: params.userId })
        if (!account) {
          throw new WechatPayServiceError('INVALID_STATE', 'Wechat account not found for user')
        }
        openid = account.openid
      }

      const product = await deps.products.getProductById(repoCtx, { productId: order.productId })
      const description = product?.name ?? '订单支付'

      const amountFen = decimalStringToFen(order.priceAmount)

      const payment = await deps.payments.createPayment(repoCtx, {
        orderId: order.id,
        channel: 'wechat_pay',
        status: 'pending',
        amount: order.priceAmount,
        currencyCode: order.currencyCode,
      })

      const created = await createWechatPayJsapiTransaction({
        outTradeNo: order.orderNo,
        description,
        amountFen,
        payerOpenId: openid,
      })

      logger.info({ action: 'wechat_pay.create', userId: params.userId, orderId: order.id, paymentId: payment.id })

      return { prepayId: created.prepayId, params: created.params }
    },

    async refund(params: { orderId: string; refundAmount: string; reason?: string; refundIntentId?: string }): Promise<WechatPayRefundOutcome> {
      if (!deps.idempotency) {
        throw new WechatPayServiceError('INVALID_STATE', 'Idempotency repository not configured')
      }

      const order = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
      if (!order) throw new WechatPayServiceError('NOT_FOUND', 'Order not found')

      // 只有已支付或已完成的订单可以退款
      if (order.status !== 'paid' && order.status !== 'completed') {
        throw new WechatPayServiceError('INVALID_STATE', 'Order status does not allow refund')
      }

      // 校验退款金额
      const totalAmountFen = decimalStringToFen(order.paidAmount || order.priceAmount)
      const refundAmountFen = decimalStringToFen(params.refundAmount)

      if (refundAmountFen > totalAmountFen) {
        throw new WechatPayServiceError('INVALID_STATE', 'Refund amount exceeds total paid amount')
      }

      /**
       * 安全修复 H-1: 使用原子递增退款金额，防止并发退款导致超退
       *
       * 原实现在应用层读取 refundedAmount 后做加法校验，存在 TOCTOU 竞态：
       * 两个并发退款请求可能同时读到相同的 refundedAmount=0，均通过校验。
       *
       * 修复方案：通过数据库层面的 CAS 原子操作（tryIncrementRefundedAmount）
       * 确保 refunded_amount + increment <= paid_amount，避免超退。
       * 若 CAS 冲突（其他并发请求已修改），返回 success=false，由调用方重试或拒绝。
       */
      const refundAmountStr = params.refundAmount
      const maxAmountStr = order.paidAmount || order.priceAmount

      const atomicResult = await deps.orders.tryIncrementRefundedAmount(repoCtx, {
        orderId: order.id,
        incrementAmount: refundAmountStr,
        maxAmount: maxAmountStr,
        updatedAt: new Date().toISOString(),
      })

      if (!atomicResult.success) {
        throw new WechatPayServiceError('INVALID_STATE', 'Refund amount exceeds total paid amount or concurrent modification detected')
      }

      const action = 'wechat_pay_refund'
      const requestHash = hashText(`${order.id}|${params.refundAmount}|${params.reason ?? ''}`)
      const refundIntentId = params.refundIntentId ?? hashText(`${order.id}|${params.refundAmount}|${params.reason ?? ''}`).slice(0, 24)
      const idempotencySeed = `${order.id}|${refundIntentId}`
      const idempotencyKey = `refund_${hashText(idempotencySeed).slice(0, 40)}`
      const nowIso = new Date().toISOString()
      const expiresAtIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      let request = await deps.idempotency.getRequest(repoCtx, {
        userId: order.userId,
        action,
        idempotencyKey,
      })

      if (request) {
        if (request.requestHash !== requestHash) {
          throw new WechatPayServiceError('INVALID_STATE', 'Refund idempotency key conflict')
        }

        if (request.status === 'pending') {
          throw new WechatPayServiceError('INVALID_STATE', 'Refund request in progress')
        }

        if (request.status === 'succeeded') {
          logger.info({ action: 'wechat_pay.refund.idempotent_hit', orderId: order.id, idempotencyKey })
          return {
            applied: false,
            outRefundNo: extractOutRefundNoFromResponseBody(request.responseBody)
              ?? `REF${idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)}`,
          }
        }
      } else {
        try {
          request = await deps.idempotency.createRequest(repoCtx, {
            userId: order.userId,
            action,
            idempotencyKey,
            requestHash,
            expiresAt: expiresAtIso,
            createdAt: nowIso,
          })
        } catch (error: unknown) {
          if (isUniqueConstraintError(error)) {
            request = await deps.idempotency.getRequest(repoCtx, {
              userId: order.userId,
              action,
              idempotencyKey,
            })

            if (request?.status === 'succeeded') {
              logger.info({ action: 'wechat_pay.refund.idempotent_hit', orderId: order.id, idempotencyKey })
              return {
                applied: false,
                outRefundNo: extractOutRefundNoFromResponseBody(request.responseBody)
                  ?? `REF${idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)}`,
              }
            }

            if (!request || request.status === 'pending') {
              throw new WechatPayServiceError('INVALID_STATE', 'Refund request in progress')
            }
          } else {
            throw error
          }
        }
      }

      if (!request) {
        throw new WechatPayServiceError('INTERNAL_ERROR', 'Refund idempotency request missing')
      }

      const outRefundNo = extractOutRefundNoFromResponseBody(request.responseBody) ?? `REF${idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)}`

      try {
        const result = await refundWechatPayTransaction({
          outTradeNo: order.orderNo,
          outRefundNo,
          reason: params.reason,
          refundAmountFen,
          totalAmountFen,
        })

        await deps.idempotency.markSucceeded(repoCtx, {
          id: request.id,
          resourceType: 'wechat_refund',
          resourceId: outRefundNo,
          responseCode: 200,
          responseBody: {
            outRefundNo,
            refundId: result.refund_id,
            status: result.status,
          },
          updatedAt: new Date().toISOString(),
        })

        logger.info({
          action: 'wechat_pay.refund.success',
          orderId: order.id,
          refundAmount: params.refundAmount,
          outRefundNo,
          refundId: result.refund_id,
          status: result.status
        })

        return {
          applied: true,
          outRefundNo,
        }
      } catch (err: unknown) {
        logger.error(
          {
            action: 'wechat_pay.refund.failed',
            orderId: order.id,
            error: err instanceof Error ? err.message : 'Unknown error',
            outRefundNo,
          },
          'Wechat Pay refund failed',
        )

        await deps.idempotency.markFailed(repoCtx, {
          id: request.id,
          responseCode: 500,
          responseBody: {
            outRefundNo,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
          updatedAt: new Date().toISOString(),
        })

        throw new WechatPayServiceError('INTERNAL_ERROR', 'Wechat Pay refund failed')
      }
    },

    /**
     * 处理微信支付回调通知。
     *
     * 注意：验签与解密已在路由层（withV1Route handler）完成，此处直接接受已解码的交易数据，
     * 避免重复 RSA 验签造成不必要的计算开销。
     */
    async handleNotify(params: { tx: WechatPayTransaction }): Promise<{ outTradeNo: string; transactionId: string }> {
      const tx = params.tx

      const outTradeNo = tx.out_trade_no
      const transactionId = tx.transaction_id

      if (!outTradeNo || !transactionId) {
        throw new WechatPayServiceError('INVALID_INPUT', 'Invalid notify payload')
      }

      if (tx.trade_state !== 'SUCCESS') {
        logger.info({ action: 'wechat_pay.notify.ignored', outTradeNo, tradeState: tx.trade_state })
        return { outTradeNo, transactionId }
      }

      const order = await deps.orders.getOrderByOrderNo(repoCtx, { orderNo: outTradeNo })
      if (!order) {
        logger.warn({ action: 'wechat_pay.notify.order_not_found', outTradeNo })
        return { outTradeNo, transactionId }
      }

      const expectedAppId = env.WECHAT_PAY_APPID ?? env.WECHAT_APPID
      const expectedMchId = env.WECHAT_PAY_MCHID
      const expectedAmountFen = decimalStringToFen(order.priceAmount)
      const notifyAmountFen = tx.amount?.total
      const notifyCurrency = tx.amount?.currency

      if (tx.out_trade_no !== order.orderNo) {
        logger.error({
          action: 'wechat_pay.notify.out_trade_no_mismatch',
          notifyOutTradeNo: tx.out_trade_no,
          orderNo: order.orderNo,
          orderId: order.id,
          transactionId,
        })
        return { outTradeNo, transactionId }
      }

      if (expectedMchId && tx.mchid && tx.mchid !== expectedMchId) {
        logger.error({
          action: 'wechat_pay.notify.mchid_mismatch',
          notifyMchid: tx.mchid,
          expectedMchid: expectedMchId,
          orderId: order.id,
          transactionId,
        })
        return { outTradeNo, transactionId }
      }

      if (expectedAppId && tx.appid && tx.appid !== expectedAppId) {
        logger.error({
          action: 'wechat_pay.notify.appid_mismatch',
          notifyAppid: tx.appid,
          expectedAppid: expectedAppId,
          orderId: order.id,
          transactionId,
        })
        return { outTradeNo, transactionId }
      }

      /**
       * 金额字段强制验证：trade_state=SUCCESS 时 amount.total 必须存在。
       *
       * 原先使用 `typeof notifyAmountFen === 'number'` 的条件校验：
       * 当 amount.total 缺失（undefined）时，条件为 false，整个金额验证被静默跳过，
       * 存在 "金额为空但仍完成订单" 的风险。
       *
       * 正确做法：字段缺失时直接拒绝（throw），让微信重试，而不是静默通过。
       */
      if (typeof notifyAmountFen !== 'number') {
        logger.error({
          action: 'wechat_pay.notify.amount_missing',
          orderId: order.id,
          transactionId,
          rawAmount: tx.amount,
        })
        throw new WechatPayServiceError('INVALID_INPUT', 'Missing amount.total in WeChat notify payload')
      }

      if (notifyAmountFen !== expectedAmountFen) {
        logger.error({
          action: 'wechat_pay.notify.amount_mismatch',
          notifyAmountFen,
          expectedAmountFen,
          orderId: order.id,
          transactionId,
        })
        return { outTradeNo, transactionId }
      }

      /**
       * 币种字段强制验证：trade_state=SUCCESS 时 amount.currency 必须存在且匹配。
       */
      if (!notifyCurrency) {
        logger.error({
          action: 'wechat_pay.notify.currency_missing',
          orderId: order.id,
          transactionId,
        })
        throw new WechatPayServiceError('INVALID_INPUT', 'Missing amount.currency in WeChat notify payload')
      }

      if (notifyCurrency !== order.currencyCode) {
        logger.error({
          action: 'wechat_pay.notify.currency_mismatch',
          notifyCurrency,
          expectedCurrency: order.currencyCode,
          orderId: order.id,
          transactionId,
        })
        return { outTradeNo, transactionId }
      }

      if (tx.payer?.openid) {
        const account = await deps.wechatAccounts.findByUserId(repoCtx, { userId: order.userId })
        if (account?.openid && account.openid !== tx.payer.openid) {
          logger.error({
            action: 'wechat_pay.notify.payer_openid_mismatch',
            notifyOpenId: tx.payer.openid,
            expectedOpenId: account.openid,
            orderId: order.id,
            transactionId,
          })
          return { outTradeNo, transactionId }
        }
      }

      const existingByTransactionId = await deps.payments.getPaymentByProviderTradeNo(repoCtx, { providerTradeNo: transactionId })
      if (existingByTransactionId) {
        if (existingByTransactionId.orderId !== order.id) {
          logger.error({
            action: 'wechat_pay.notify.tx_order_mismatch',
            outTradeNo,
            transactionId,
            existingOrderId: existingByTransactionId.orderId,
            notifyOrderId: order.id,
          })

          // 防御性处理：transaction_id 已被其他订单占用（或数据异常）。
          // 为避免微信侧持续重试造成风暴，此处直接返回成功（no-op），且不做任何状态推进。
          return { outTradeNo, transactionId }
        }

        const confirmedAt = existingByTransactionId.confirmedAt ?? new Date().toISOString()

        if (order.status !== 'paid' && order.status !== 'completed') {
          /**
           * 安全修复 M-1: 使用 CAS 原子更新订单状态
           *
           * 仅当订单仍处于 expectedStatus（pending_payment）时才更新为 paid，
           * 防止并发回调导致重复状态推进和重复履约任务创建。
           */
          const casResult = await deps.orders.updateOrderStatusCas(repoCtx, {
            orderId: order.id,
            expectedStatus: order.status,
            newStatus: 'paid',
            paidAt: confirmedAt,
            paidAmount: order.priceAmount,
            updatedAt: new Date().toISOString(),
          })
          if (!casResult.updated) {
            logger.info({ action: 'wechat_pay.notify.cas_skipped_replayed', orderId: order.id, outTradeNo, transactionId })
          }
        }

        await deps.fulfillmentJobs.upsertJobByPaymentId(repoCtx, {
          orderId: order.id,
          paymentId: existingByTransactionId.id,
          updatedAt: new Date().toISOString(),
        })

        logger.info({
          action: 'wechat_pay.notify.replayed',
          orderId: order.id,
          paymentId: existingByTransactionId.id,
          outTradeNo,
          transactionId,
        })

        return { outTradeNo, transactionId }
      }

      const payment = await deps.payments.getLatestPaymentByOrderId(repoCtx, { orderId: order.id })
      if (!payment) {
        /**
         * 支付记录未找到：可能是并发竞态导致（下单后通知先于后端提交到达）。
         *
         * 此处抛出 INTERNAL_ERROR 而非 return，原因：
         * - return 会导致路由返回 204，微信视为"已成功处理"并停止重试
         * - throw 会导致路由返回 5xx，微信将按既定频率（最多 15 次）重试
         * - 若支付记录最终被持久化，重试时可正常命中并推进订单状态
         *
         * 参考微信支付官方文档：回调通知重试机制
         * https://pay.weixin.qq.com/doc/v3/merchant/4012791861
         */
        logger.warn({ action: 'wechat_pay.notify.payment_not_found', orderId: order.id, outTradeNo, transactionId })
        throw new WechatPayServiceError('INTERNAL_ERROR', 'Payment record not found for order, will allow WeChat retry')
      }

      const confirmedAt = tx.success_time ?? new Date().toISOString()

      let persisted = await deps.payments.getPaymentById(repoCtx, { paymentId: payment.id })
      if (!persisted) {
        throw new WechatPayServiceError('INTERNAL_ERROR', 'Payment not found')
      }

      if (persisted.status !== 'succeeded') {
        try {
          const confirmed = await deps.payments.confirmPaymentSucceeded(repoCtx, {
            paymentId: payment.id,
            providerTradeNo: transactionId,
            providerPayerId: tx.payer?.openid ?? null,
            confirmedAt,
          })

          persisted = confirmed ?? (await deps.payments.getPaymentById(repoCtx, { paymentId: payment.id }))
        } catch (err: unknown) {
          /**
           * 捕获唯一约束冲突：Postgres 错误码 '23505' 或 Prisma 错误码 'P2002'。
           * 两者均通过 isUniqueConstraintError 辅助函数统一处理，
           * 避免仅检测 '23505' 导致 Prisma 实现下错误漏捕。
           */
          if (isUniqueConstraintError(err)) {
            const byTx = await deps.payments.getPaymentByProviderTradeNo(repoCtx, { providerTradeNo: transactionId })
            if (byTx && byTx.orderId === order.id) {
              persisted = byTx
            } else {
              logger.error({
                action: 'wechat_pay.notify.tx_unique_conflict',
                outTradeNo,
                transactionId,
                existingOrderId: byTx?.orderId ?? null,
                notifyOrderId: order.id,
              })

              // 防御性处理：provider_trade_no 唯一冲突但无法证明属于当前订单。
              // no-op 返回成功，避免微信侧重试风暴。
              return { outTradeNo, transactionId }
            }
          } else {
            throw err
          }
        }
      }

      if (!persisted || persisted.providerTradeNo !== transactionId || !persisted.confirmedAt || persisted.status !== 'succeeded') {
        throw new WechatPayServiceError('INTERNAL_ERROR', 'Payment confirmation not persisted')
      }

      if (order.status !== 'paid' && order.status !== 'completed') {
        /**
         * 安全修复 M-1: 使用 CAS 原子更新订单状态（首次确认路径）
         *
         * 仅当订单仍处于 pending_payment 时才更新为 paid，
         * 防止并发回调导致重复状态推进。
         */
        const casResult = await deps.orders.updateOrderStatusCas(repoCtx, {
          orderId: order.id,
          expectedStatus: order.status,
          newStatus: 'paid',
          paidAt: confirmedAt,
          paidAmount: order.priceAmount,
          updatedAt: new Date().toISOString(),
        })
        if (!casResult.updated) {
          logger.info({ action: 'wechat_pay.notify.cas_skipped_confirmed', orderId: order.id, outTradeNo, transactionId })
        }
      }

      await deps.fulfillmentJobs.upsertJobByPaymentId(repoCtx, {
        orderId: order.id,
        paymentId: persisted.id,
        updatedAt: new Date().toISOString(),
      })

      logger.info({ action: 'wechat_pay.notify.confirmed', orderId: order.id, paymentId: payment.id, outTradeNo, transactionId })

      return { outTradeNo, transactionId }
    },
  }
}
