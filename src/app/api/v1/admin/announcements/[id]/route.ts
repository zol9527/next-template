import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  UpdateAnnouncementRequestSchema,
  ToggleAnnouncementActiveRequestSchema,
} from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAnnouncementRepository } from '@/repositories/factory'
import { createAdminAnnouncementService } from '@/services/core/admin-site-config.service'

export const GET = withV1Route({
  action: 'admin:announcement:view',
  requireAccess: { action: 'read' as Action, scope: 'announcements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, serviceContext, params }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    const data = await service.getAnnouncementById(params.id)

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export const PUT = withV1Route({
  action: 'admin:announcement:update',
  requireAccess: { action: 'write' as Action, scope: 'announcements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() }),
    body: UpdateAnnouncementRequestSchema
  },
  handler: async ({ req, serviceContext, body, params }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    const data = await service.updateAnnouncement({ announcementId: params.id, ...body })

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export const DELETE = withV1Route({
  action: 'admin:announcement:delete',
  requireAccess: { action: 'write' as Action, scope: 'announcements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, serviceContext, params }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    await service.deleteAnnouncement(params.id)

    return createJsonApiResponse(req, ok({ deleted: true }))
  },
})

export const PATCH = withV1Route({
  action: 'admin:announcement:update',
  requireAccess: { action: 'write' as Action, scope: 'announcements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() }),
    body: ToggleAnnouncementActiveRequestSchema
  },
  handler: async ({ req, serviceContext, body, params }) => {
    const announcements = await createAnnouncementRepository()
    const service = createAdminAnnouncementService({ announcements }, serviceContext)
    const data = await service.toggleAnnouncementActive({ announcementId: params.id, ...body! })

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
