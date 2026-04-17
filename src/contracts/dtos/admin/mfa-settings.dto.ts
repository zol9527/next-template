/**
 * File: src/contracts/dtos/admin/mfa-settings.dto.ts
 * Description: MFA 策略配置管理相关 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 全局策略配置 ====================

/**
 * Schema: MfaGlobalModeSchema
 *
 * Description: MFA 全局模式枚举
 */
export const MfaGlobalModeSchema = z
  .enum(['disabled', 'optional', 'required'])
  .openapi({ description: 'MFA 全局模式: disabled(禁用), optional(可选), required(强制)' })

export type MfaGlobalMode = z.infer<typeof MfaGlobalModeSchema>

/**
 * Schema: MfaGlobalSettingsDtoSchema
 *
 * Description: MFA 全局设置 DTO
 */
export const MfaGlobalSettingsDtoSchema = z
  .object({
    mode: MfaGlobalModeSchema.openapi({ description: '全局 MFA 模式' }),
    allowExemptions: z.boolean().openapi({ description: '是否允许管理员豁免' }),
    updatedAt: z.string().datetime().optional().openapi({ description: '最后更新时间' }),
  })
  .openapi({ description: 'MFA 全局设置' })

export type MfaGlobalSettingsDto = z.infer<typeof MfaGlobalSettingsDtoSchema>

// ==================== 角色策略配置 ====================

/**
 * Schema: MfaRolePolicyTypeSchema
 *
 * Description: 角色 MFA 策略类型
 */
export const MfaRolePolicyTypeSchema = z
  .enum(['inherit', 'force'])
  .openapi({ description: '角色 MFA 策略: inherit(继承全局), force(强制启用)' })

export type MfaRolePolicyType = z.infer<typeof MfaRolePolicyTypeSchema>

/**
 * Schema: MfaRolePolicyDtoSchema
 *
 * Description: 单个角色 MFA 策略 DTO
 */
export const MfaRolePolicyDtoSchema = z
  .object({
    roleName: z.string().min(1).openapi({ description: '角色名称（唯一标识）' }),
    policy: MfaRolePolicyTypeSchema.openapi({ description: '角色策略' }),
    allowExemptions: z.boolean().openapi({ description: '是否允许豁免' }),
    updatedAt: z.string().datetime().optional().openapi({ description: '最后更新时间' }),
  })
  .openapi({ description: '角色 MFA 策略' })

export type MfaRolePolicyDto = z.infer<typeof MfaRolePolicyDtoSchema>

// ==================== 豁免用户配置 ====================

/**
 * Schema: MfaExemptionDtoSchema
 *
 * Description: MFA 豁免用户 DTO
 */
export const MfaExemptionDtoSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    userName: z.string().optional().openapi({ description: '用户名称（查询时填充）' }),
    userEmail: z.string().email().optional().openapi({ description: '用户邮箱（查询时填充）' }),
    reason: z.string().min(1).max(500).openapi({ description: '豁免原因' }),
    createdBy: z.string().uuid().openapi({ description: '创建者（管理员）ID' }),
    createdByName: z.string().optional().openapi({ description: '创建者名称（查询时填充）' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
    expiresAt: z.string().datetime().optional().openapi({ description: '过期时间（可选）' }),
  })
  .openapi({ description: 'MFA 豁免用户信息' })

export type MfaExemptionDto = z.infer<typeof MfaExemptionDtoSchema>

// ==================== API 请求/响应 ====================

/**
 * Schema: UpdateMfaGlobalSettingsRequestSchema
 *
 * Description: 更新 MFA 全局设置请求
 */
export const UpdateMfaGlobalSettingsRequestSchema = z
  .object({
    mode: MfaGlobalModeSchema,
    allowExemptions: z.boolean(),
  })
  .openapi({ description: '更新 MFA 全局设置请求' })

export type UpdateMfaGlobalSettingsRequest = z.infer<typeof UpdateMfaGlobalSettingsRequestSchema>

/**
 * Schema: UpdateMfaRolePoliciesRequestSchema
 *
 * Description: 更新 MFA 角色策略请求
 */
export const UpdateMfaRolePoliciesRequestSchema = z
  .object({
    policies: z.array(
      z.object({
        roleName: z.string(),
        policy: MfaRolePolicyTypeSchema,
        allowExemptions: z.boolean(),
      })
    ),
  })
  .openapi({ description: '更新 MFA 角色策略请求' })

export type UpdateMfaRolePoliciesRequest = z.infer<typeof UpdateMfaRolePoliciesRequestSchema>

/**
 * Schema: AddMfaExemptionRequestSchema
 *
 * Description: 添加 MFA 豁免用户请求
 */
export const AddMfaExemptionRequestSchema = z
  .object({
    userId: z.string().uuid(),
    reason: z.string().min(1).max(500),
    expiresAt: z.string().datetime().optional(),
  })
  .openapi({ description: '添加 MFA 豁免用户请求' })

export type AddMfaExemptionRequest = z.infer<typeof AddMfaExemptionRequestSchema>

/**
 * Schema: MfaSettingsResponseSchema
 *
 * Description: MFA 设置查询响应
 */
export const MfaSettingsResponseSchema = z
  .object({
    global: MfaGlobalSettingsDtoSchema,
    roles: z.array(MfaRolePolicyDtoSchema),
    exemptions: z.array(MfaExemptionDtoSchema),
    availableRoles: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    ),
  })
  .openapi({ description: 'MFA 设置查询响应' })

export type MfaSettingsResponse = z.infer<typeof MfaSettingsResponseSchema>

// ==================== API 路由权限 ====================

/**
 * MFA 管理权限常量
 */
export const MFA_ADMIN_PERMISSIONS = {
  VIEW: 'mfa.read',
  MANAGE: 'mfa.write',
} as const

// ==================== 前端组件 Props ====================

/**
 * MFA 策略卡片组件 Props
 */
export interface MfaPolicyCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

/**
 * MFA 豁免用户列表组件 Props
 */
export interface MfaExemptionListProps {
  exemptions: MfaExemptionDto[]
  onRemove: (userId: string) => void
  isLoading?: boolean
}

/**
 * MFA 全局设置表单 Props
 */
export interface MfaGlobalSettingsFormProps {
  settings: MfaGlobalSettingsDto
  onSubmit: (data: UpdateMfaGlobalSettingsRequest) => void
  isLoading?: boolean
}

/**
 * MFA 角色策略表格 Props
 */
export interface MfaRolePolicyTableProps {
  policies: MfaRolePolicyDto[]
  availableRoles: Array<{ name: string; description?: string }>
  onUpdate: (policies: UpdateMfaRolePoliciesRequest['policies']) => void
  isLoading?: boolean
}
