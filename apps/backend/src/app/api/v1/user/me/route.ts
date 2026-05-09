import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route({
  action: 'auth:me',
  requireAuth: true,  // 声明式：需要认证
  handler: async ({ req, auth }) => {
    // auth 已自动注入，通过 withV1Route 的 requireAuth
    const me = await auth!.getMe()
    return createJsonApiResponse(req, ok(me))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
