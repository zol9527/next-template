import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createPluginActivateService } from '@/plugins/plugin-activate.service'
import { isPluginInstalled, type PluginName } from '@/plugins/plugin-definitions'
import { setPluginCache } from '@/plugins/registry'

const PluginNameParamSchema = z.object({
  name: z.enum(['wechat', 'ecommerce', 'promotion']),
})

const TogglePluginRequestSchema = z.object({
  active: z.boolean(),
})

export const PATCH = withV1Route({
  action: 'admin:plugins:update',
  requireAccess: { action: 'write' as Action, scope: 'feature-flags' as Scope },
  schemas: {
    params: PluginNameParamSchema,
    body: TogglePluginRequestSchema,
  },
  handler: async ({ req, serviceContext, params, body, userId }) => {
    const pluginName = params.name as PluginName

    // 安全约束：未安装的插件不允许切换激活状态
    if (!isPluginInstalled(pluginName)) {
      return createJsonApiResponse(
        req,
        fail('INVALID_INPUT', `插件 ${pluginName} 未安装，无法切换激活状态`),
        { status: 400 },
      )
    }

    const systemSettings = await createSystemSettingsRepository()
    const service = createPluginActivateService({ systemSettings }, serviceContext)

    // 获取当前激活状态，用于审计日志对比
    const previousActive = await service.getActivationStatus(pluginName)

    await service.setActivationStatus(pluginName, body!.active)
    setPluginCache(pluginName, body!.active)

    // 仅在状态实际变更时记录审计日志，避免噪音
    if (previousActive !== body!.active) {
      serviceContext.logger.info({
        audit: true,
        action: 'plugin.toggle',
        actorId: userId,
        target: pluginName,
        previousState: previousActive,
        newState: body!.active,
      }, `插件 ${pluginName} 激活状态已更新`)
    }

    return createJsonApiResponse(req, ok({ updated: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
