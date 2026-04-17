import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 微信手机号绑定请求 DTO
 *
 * Function: 微信手机号绑定请求 Schema
 *
 * Description: 用于微信小程序用户授权绑定手机号，code 为前端触发手机号授权后返回的临时凭证
 *
 * Parameters:
 *   code(string): 手机号授权临时凭证，由微信小程序 API 返回
 *
 * Returns:
 *   无返回值（仅作为请求 Schema）
 */
export const WechatPhoneBindRequestSchema = z
  .object({
    code: z.string().min(1, '手机号授权 code 不能为空').openapi({
      description: '微信手机号授权 code（前端触发手机号授权后返回的临时凭证）',
    }),
  })
  .openapi({ description: '微信手机号绑定请求' })

export type WechatPhoneBindRequest = z.infer<typeof WechatPhoneBindRequestSchema>

/**
 * 微信手机号绑定响应 DTO
 *
 * Function: 微信手机号绑定响应 Schema
 *
 * Description: 手机号绑定成功后的响应结构
 *
 * Parameters:
 *   无参数（仅作为响应 Schema）
 *
 * Returns:
 *   message(string): 成功消息
 *   phone(string): 脱敏后的手机号（如：138****1234）
 */
export const WechatPhoneBindResponseSchema = z
  .object({
    message: z.string().openapi({ description: '手机号绑定成功消息' }),
    phone: z.string().openapi({ description: '脱敏后的手机号（如：138****1234）' }),
  })
  .openapi({ description: '微信手机号绑定响应' })

export type WechatPhoneBindResponse = z.infer<typeof WechatPhoneBindResponseSchema>
