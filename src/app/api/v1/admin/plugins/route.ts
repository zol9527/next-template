import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createPluginActivateService } from '@/plugins/plugin-activate.service'
import { PLUGIN_DEFINITIONS, isPluginInstalled } from '@/plugins/plugin-definitions'
import { refreshPluginCache } from '@/plugins/registry'

export const GET = withV1Route({
  action: 'admin:plugins:view',
  requireAccess: { action: 'read' as Action, scope: 'feature-flags' as Scope },
  handler: async ({ req, serviceContext }) => {
    const systemSettings = await createSystemSettingsRepository()
    const service = createPluginActivateService({ systemSettings }, serviceContext)

    await refreshPluginCache()
    const activeStatuses = await service.getAllActivationStatuses()

    const plugins = Object.values(PLUGIN_DEFINITIONS).map((def) => ({
      name: def.name,
      label: def.label,
      description: def.description,
      icon: def.icon,
      installed: isPluginInstalled(def.name),
      active: activeStatuses[def.name] ?? false,
      defaultActive: def.defaultActive,
    }))

    return createJsonApiResponse(req, ok({ plugins }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
