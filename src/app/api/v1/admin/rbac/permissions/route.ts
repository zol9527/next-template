import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { flattenScopeTree, ACTIONS } from '@/config/access'

export const GET = withV1Route({
  action: 'admin:rbac:read',
  requireAccess: { action: 'read' as Action, scope: 'rbac' as Scope },
  handler: async ({ req }) => {
    const scopeMap = flattenScopeTree()
    const scopes = Array.from(scopeMap.entries()).map(([key, description]) => ({
      scope: key as Scope,
      description,
      actions: [...ACTIONS],
    }))

    return createJsonApiResponse(req, ok({ scopes }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
