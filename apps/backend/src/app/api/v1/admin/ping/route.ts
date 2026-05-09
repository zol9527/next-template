import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route({
  action: 'admin:ping',
  requireAccess: { action: 'read' as Action, scope: 'health' as Scope },
  handler: async ({ req }) => {
    return createJsonApiResponse(req, ok({ ok: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
