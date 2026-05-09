import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const WechatPayJsapiParamsSchema = z
  .object({
    timeStamp: z.string().min(1).openapi({ description: '时间戳（秒）' }),
    nonceStr: z.string().min(1).openapi({ description: '随机串' }),
    package: z.string().min(1).openapi({ description: '预支付信息（prepay_id=xxx）' }),
    signType: z.literal('RSA').openapi({ description: '签名类型（固定 RSA）' }),
    paySign: z.string().min(1).openapi({ description: '签名' }),
  })
  .openapi({ description: '微信支付 JSAPI 拉起参数（小程序端）' })

export type WechatPayJsapiParams = z.infer<typeof WechatPayJsapiParamsSchema>

export const CreateWechatPayRequestSchema = z
  .object({
    payerOpenId: z.string().min(1).optional().openapi({ description: '支付者 openid（小程序端获取，若已绑定可不传）' }),
  })
  .openapi({ description: '发起微信支付请求' })

export type CreateWechatPayRequest = z.infer<typeof CreateWechatPayRequestSchema>

export const CreateWechatPayResponseSchema = z
  .object({
    prepayId: z.string().min(1).openapi({ description: '预支付交易会话标识' }),
    params: WechatPayJsapiParamsSchema.openapi({ description: '小程序端拉起支付参数' }),
  })
  .openapi({ description: '发起微信支付响应' })

export type CreateWechatPayResponse = z.infer<typeof CreateWechatPayResponseSchema>
