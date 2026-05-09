import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

import { FulfillmentStatusSchema } from '@/plugins/ecommerce/contracts/orders.dto'

extendZodWithOpenApi(z)

export const AdminOrderFulfillmentJobSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '履约任务 ID' }),
    orderId: z.string().uuid().openapi({ description: '订单 ID' }),
    paymentId: z.string().uuid().openapi({ description: '支付 ID' }),
    status: FulfillmentStatusSchema.openapi({ description: '履约任务状态' }),
    attemptCount: z.number().int().nonnegative().openapi({ description: '尝试次数' }),
    availableAt: z.string().openapi({ description: '下次可执行时间 ISO' }),
    startedAt: z.string().nullable().openapi({ description: '开始执行时间 ISO（可为空）' }),
    finishedAt: z.string().nullable().openapi({ description: '结束执行时间 ISO（可为空）' }),
    lastError: z.string().nullable().openapi({ description: '最近一次错误信息（可为空）' }),
    lastErrorAt: z.string().nullable().openapi({ description: '最近一次错误时间 ISO（可为空）' }),
    manualRequiredAt: z.string().nullable().openapi({ description: '转人工时间 ISO（可为空）' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '后台订单履约任务' })

export type AdminOrderFulfillmentJob = z.infer<typeof AdminOrderFulfillmentJobSchema>

export const AdminOrderFulfillmentJobDetailResponseSchema = z
  .object({
    job: AdminOrderFulfillmentJobSchema.openapi({ description: '履约任务详情' }),
  })
  .openapi({ description: '后台履约任务详情响应' })

export type AdminOrderFulfillmentJobDetailResponse = z.infer<typeof AdminOrderFulfillmentJobDetailResponseSchema>

export const AdminRunOrderFulfillmentResultSchema = z
  .object({
    processed: z.number().int().nonnegative().openapi({ description: '本次成功锁定并处理的任务数' }),
    succeeded: z.number().int().nonnegative().openapi({ description: '成功数' }),
    retrying: z.number().int().nonnegative().openapi({ description: '转入重试数' }),
    manualRequired: z.number().int().nonnegative().openapi({ description: '转人工数' }),
    skipped: z.number().int().nonnegative().openapi({ description: '未能锁定/被跳过数' }),
  })
  .openapi({ description: '履约执行汇总结果' })

export type AdminRunOrderFulfillmentResult = z.infer<typeof AdminRunOrderFulfillmentResultSchema>

export const AdminRunOrderFulfillmentResponseSchema = z
  .object({
    result: AdminRunOrderFulfillmentResultSchema.openapi({ description: '执行结果' }),
  })
  .openapi({ description: '后台触发履约执行响应' })

export type AdminRunOrderFulfillmentResponse = z.infer<typeof AdminRunOrderFulfillmentResponseSchema>
