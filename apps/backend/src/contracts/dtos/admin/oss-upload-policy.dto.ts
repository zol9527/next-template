import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminOssProviderSchema = z.enum(['aliyun_oss', 'tencent_cos', 'local']).openapi({ description: '对象存储提供方' })

export type AdminOssProvider = z.infer<typeof AdminOssProviderSchema>

export const AdminOssUploadPolicyRequestSchema = z
  .object({
    contentType: z.string().min(1).openapi({ description: '上传文件 Content-Type' }),
    sizeBytes: z.number().int().nonnegative().openapi({ description: '文件大小（字节）' }),
    purpose: z.string().nullable().optional().openapi({ description: '用途（可选）' }),
  })
  .openapi({ description: '获取 OSS 直传签名请求' })

export type AdminOssUploadPolicyRequest = z.infer<typeof AdminOssUploadPolicyRequestSchema>

export const AdminOssUploadPolicyResponseSchema = z
  .object({
    provider: AdminOssProviderSchema.openapi({ description: '提供方' }),
    uploadUrl: z.string().url().openapi({ description: 'OSS 表单上传地址' }),
    formFields: z.record(z.string(), z.string()).openapi({ description: 'POST 表单字段（policy/signature/key 等）' }),
    expireAt: z.string().openapi({ description: '过期时间 ISO' }),
    objectKey: z.string().optional().openapi({ description: '对象键（生成的文件路径）' }),
    fileUrl: z.string().optional().openapi({ description: '文件访问 URL' }),
  })
  .openapi({ description: '获取 OSS 直传签名响应' })

export type AdminOssUploadPolicyResponse = z.infer<typeof AdminOssUploadPolicyResponseSchema>
