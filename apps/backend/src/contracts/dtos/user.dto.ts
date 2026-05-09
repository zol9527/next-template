import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
Function: UserDtoSchema

Description: 用户 DTO 的示例 Schema（用于演示契约优先与 OpenAPI 描述）

Parameters:

Returns:
    schema(object): 用户 DTO 的 Zod Schema
*/
export const UserDtoSchema = z
  .object({
    id: z.string().openapi({ description: '用户唯一标识' }),
    nickname: z.string().min(1).nullable().openapi({ description: '用户昵称' }),
  })
  .openapi({ description: '用户 DTO' })

export type UserDto = z.infer<typeof UserDtoSchema>

/**
Function: UploadPermissionResponseSchema

Description: 用户上传权限响应 Schema

Parameters:

Returns:
    schema(object): 上传权限响应的 Zod Schema
*/
export const UploadPermissionResponseSchema = z
  .object({
    canUpload: z.boolean().openapi({ description: '是否允许上传' }),
  })
  .openapi({ description: '用户上传权限响应' })

export type UploadPermissionResponse = z.infer<typeof UploadPermissionResponseSchema>
