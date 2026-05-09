/**
 * Order & Payment Repositories
 *
 * @module repositories/factory/order
 * @description 订单与支付相关的 Repository 工厂函数
 *
 * 包含:
 * - OrderRepository: 订单管理
 * - PaymentRepository: 支付管理
 * - IdempotencyRepository: 幂等性控制
 * - OrderFulfillmentJobRepository: 订单履约任务
 */

import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { PaymentRepository } from '@/plugins/ecommerce/repositories/interfaces/payment.interface'
import type { IdempotencyRepository } from '@/repositories/interfaces/core/idempotency.interface'
import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import { createPrismaOrderRepository } from '@/plugins/ecommerce/repositories/prisma/order.repository'
import { createPrismaPaymentRepository } from '@/plugins/ecommerce/repositories/prisma/payment.repository'
import { createPrismaIdempotencyRepository } from '@/repositories/prisma/core/idempotency.repository'
import { createPrismaOrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/prisma/order-fulfillment-job.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

/**
 * 创建订单仓库实例
 *
 * @returns Promise<OrderRepository> 订单仓库实例
 */
export async function createOrderRepository(): Promise<OrderRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaOrderRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseOrderRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/order.repository')
    return createSupabaseOrderRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建支付仓库实例
 *
 * @returns Promise<PaymentRepository> 支付仓库实例
 */
export async function createPaymentRepository(): Promise<PaymentRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaPaymentRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabasePaymentRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/payment.repository')
    return createSupabasePaymentRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建幂等性控制仓库实例
 *
 * @returns Promise<IdempotencyRepository> 幂等性控制仓库实例
 */
export async function createIdempotencyRepository(): Promise<IdempotencyRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaIdempotencyRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseIdempotencyRepository } = await import(/* @vite-ignore */ '@/repositories/supabase/core/idempotency.repository')
    return createSupabaseIdempotencyRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建订单履约任务仓库实例
 *
 * @returns Promise<OrderFulfillmentJobRepository> 订单履约任务仓库实例
 */
export async function createOrderFulfillmentJobRepository(): Promise<OrderFulfillmentJobRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaOrderFulfillmentJobRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseOrderFulfillmentJobRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/order-fulfillment-job.repository')
    return createSupabaseOrderFulfillmentJobRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
