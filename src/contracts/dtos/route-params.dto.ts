import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const IdParamsSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '资源 ID（UUID）' }),
  })
  .openapi({ description: '通用 ID 路径参数' })

export type IdParams = z.infer<typeof IdParamsSchema>

export const OrderIdParamsSchema = z
  .object({
    orderId: z.string().uuid().openapi({ description: '订单 ID（UUID）' }),
  })
  .openapi({ description: '订单 ID 路径参数' })

export type OrderIdParams = z.infer<typeof OrderIdParamsSchema>

export const OrderFulfillmentJobIdParamsSchema = z
  .object({
    jobId: z.string().uuid().openapi({ description: '履约任务 ID（UUID）' }),
  })
  .openapi({ description: '履约任务 ID 路径参数' })

export type OrderFulfillmentJobIdParams = z.infer<typeof OrderFulfillmentJobIdParamsSchema>

export const UserIdParamsSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID（UUID）' }),
  })
  .openapi({ description: '用户 ID 路径参数' })

export type UserIdParams = z.infer<typeof UserIdParamsSchema>

/**
 * Schema: ConfigKeyParamsSchema
 *
 * Description: Rate Limit 配置键路径参数
 */
export const ConfigKeyParamsSchema = z
  .object({
    key: z.string().min(1).openapi({ description: 'Rate Limit 配置键' }),
  })
  .openapi({ description: 'Rate Limit 配置键路径参数' })

export type ConfigKeyParams = z.infer<typeof ConfigKeyParamsSchema>
