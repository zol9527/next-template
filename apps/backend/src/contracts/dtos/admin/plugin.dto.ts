import { z } from 'zod'

export const PluginNameSchema = z.enum(['wechat', 'ecommerce', 'promotion'])

export const PluginInfoSchema = z.object({
  name: PluginNameSchema.openapi({
    description: '插件的唯一标识符',
    example: 'wechat'
  }),
  label: z.string().openapi({
    description: '插件的显示名称',
    example: '微信小程序'
  }),
  description: z.string().openapi({
    description: '插件的详细描述信息',
    example: '提供微信小程序集成功能'
  }),
  icon: z.string().openapi({
    description: '插件的图标标识',
    example: 'wechat'
  }),
  installed: z.boolean().openapi({
    description: '插件是否已安装',
    example: true
  }),
  active: z.boolean().openapi({
    description: '插件是否已激活',
    example: true
  }),
  defaultActive: z.boolean().openapi({
    description: '插件首次安装时的默认激活状态',
    example: true
  })
})

export const PluginListResponseSchema = z.object({
  plugins: z.array(PluginInfoSchema).openapi({
    description: '插件列表'
  })
})

export const TogglePluginRequestSchema = z.object({
  active: z.boolean().openapi({
    description: '插件是否激活状态',
    example: true
  })
})

export const PluginNameParamSchema = z.object({
  name: PluginNameSchema.openapi({
    description: '插件名称',
    example: 'wechat'
  })
})

export type PluginName = z.infer<typeof PluginNameSchema>

export type PluginInfo = z.infer<typeof PluginInfoSchema>

export type PluginListResponse = z.infer<typeof PluginListResponseSchema>

export type TogglePluginRequest = z.infer<typeof TogglePluginRequestSchema>

export type PluginNameParam = z.infer<typeof PluginNameParamSchema>