import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const PaymentChannelSchema = z.enum(['wechat_pay']).openapi({ description: '支付渠道' })

export type PaymentChannel = z.infer<typeof PaymentChannelSchema>

export const PaymentStatusSchema = z.enum(['pending', 'succeeded', 'failed']).openapi({ description: '支付状态' })

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

export const PaymentSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '支付记录 ID' }),
    orderId: z.string().uuid().openapi({ description: '订单 ID' }),
    channel: PaymentChannelSchema.openapi({ description: '支付渠道' }),
    status: PaymentStatusSchema.openapi({ description: '支付状态' }),
    amount: z.string().openapi({ description: '支付金额（decimal 字符串）' }),
    currencyCode: z.string().openapi({ description: '币种（默认 CNY）' }),
    providerTradeNo: z.string().nullable().optional().openapi({ description: '第三方交易号（可为空）' }),
    providerPayerId: z.string().nullable().optional().openapi({ description: '第三方支付者 ID（可为空）' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
    confirmedAt: z.string().nullable().optional().openapi({ description: '确认时间（可为空）' }),
    updatedAt: z.string().datetime().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '支付记录' })

export type Payment = z.infer<typeof PaymentSchema>
