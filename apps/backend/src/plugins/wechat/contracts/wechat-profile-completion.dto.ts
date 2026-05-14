import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 微信资料补全请求 DTO
 *
 * Function: 微信资料补全请求 Schema
 *
 * Description: 用于微信小程序用户主动补全昵称和头像资料
 *
 * Parameters:
 *   nickname(string): 用户昵称，1-64 字符，不参与唯一性约束
 *   avatarUrl(string): 用户头像 URL，必须是合法 URL
 *
 * Returns:
 *   无返回值（仅作为请求 Schema）
 */
export const WechatProfileCompletionRequestSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1, '昵称不能为空')
      .max(64, '昵称最多 64 个字符')
      // H-6 修复: 限制合法字符集，防止 HTML 标签注入（存储型 XSS）
      .regex(/^[\p{L}\p{N}\s_.-]+$/u, '昵称包含不允许的字符')
      .openapi({ description: '用户昵称（展示名称，不唯一）' }),
    avatarUrl: z.string().url('头像 URL 格式不正确').refine(url => url.startsWith('https://'), '头像 URL 必须使用 HTTPS').optional().openapi({ description: '用户头像 URL（可选，不传则不更新头像，必须 HTTPS）' }),
  })
  .openapi({ description: '微信资料补全请求' })

export type WechatProfileCompletionRequest = z.infer<
  typeof WechatProfileCompletionRequestSchema
>

/**
 * 微信资料补全响应 DTO
 *
 * Function: 微信资料补全响应 Schema
 *
 * Description: 资料补全成功后的响应结构
 *
 * Parameters:
 *   无参数（仅作为响应 Schema）
 *
 * Returns:
 *   message(string): 成功消息
 */
export const WechatProfileCompletionResponseSchema = z
  .object({
    message: z.string().openapi({ description: '资料补全成功消息' }),
  })
  .openapi({ description: '微信资料补全响应' })

export type WechatProfileCompletionResponse = z.infer<
  typeof WechatProfileCompletionResponseSchema
>
