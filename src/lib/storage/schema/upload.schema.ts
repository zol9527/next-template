import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * OSS 提供者类型 Schema
 */
export const OssProviderSchema = z
  .enum(['aliyun_oss', 'tencent_cos', 'local'])
  .openapi({ description: '对象存储提供方' })

export type OssProvider = z.infer<typeof OssProviderSchema>

/**
 * 上传策略请求 Schema
 */
export const UploadPolicyRequestSchema = z
  .object({
    contentType: z.string().min(1).openapi({ description: '上传文件 Content-Type' }),
    sizeBytes: z.number().int().nonnegative().openapi({ description: '文件大小（字节）' }),
    purpose: z.string().nullable().optional().openapi({ description: '用途（可选）' }),
  })
  .openapi({ description: '获取上传策略请求' })

export type UploadPolicyRequest = z.infer<typeof UploadPolicyRequestSchema>

/**
 * 上传策略响应 Schema
 */
export const UploadPolicyResponseSchema = z
  .object({
    provider: OssProviderSchema.openapi({ description: '提供方' }),
    uploadUrl: z.string().url().openapi({ description: '上传地址' }),
    formFields: z.record(z.string(), z.string()).openapi({ description: 'POST 表单字段' }),
    expireAt: z.string().datetime().openapi({ description: '过期时间 ISO' }),
    objectKey: z.string().optional().openapi({ description: '对象键' }),
    fileUrl: z.string().url().optional().openapi({ description: '文件访问 URL' }),
  })
  .openapi({ description: '获取上传策略响应' })

export type UploadPolicyResponse = z.infer<typeof UploadPolicyResponseSchema>
