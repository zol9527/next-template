import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  AnnouncementListQuerySchema,
  CreateAnnouncementRequestSchema,
} from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAnnouncementRepository } from '@/repositories/factory'
import { createAdminAnnouncementService } from '@/services/core/admin-site-config.service'

export const GET = withV1Route({
  action: 'admin:announcement:view',
  requireAccess: { action: 'read' as Action, scope: 'announcements' as Scope },
  schemas: { query: AnnouncementListQuerySchema },
  handler: async ({ req, serviceContext, query }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    const data = await service.listAnnouncements(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export const POST = withV1Route({
  action: 'admin:announcement:create',
  requireAccess: { action: 'write' as Action, scope: 'announcements' as Scope },
  schemas: { body: CreateAnnouncementRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    const data = await service.createAnnouncement(body!)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
