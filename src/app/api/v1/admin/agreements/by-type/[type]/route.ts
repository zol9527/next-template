import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpsertAgreementRequestSchema } from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAgreementRepository } from '@/repositories/factory'
import { createAdminAgreementService } from '@/services/core/admin-site-config.service'

// 定义 params schema
const ByTypeParamsSchema = z.object({
  type: z.enum(['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']),
})

type DynamicAgreementRouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<{ type: string }> }
) => Promise<Response>

/**
 * Function: GET
 *
 * Description: 根据协议类型获取单个协议
 */
const GET_IMPL = withV1Route({
  action: 'admin:agreement:view',
  requireAccess: { action: 'read' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: ByTypeParamsSchema,
  },
  handler: async ({ req, serviceContext, params }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)

    // 根据类型获取所有协议，然后返回匹配的第一个
    const allAgreements = await service.listAgreements()
    const agreement = allAgreements.items.find((a) => a.type === params.type)

    if (!agreement) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } },
        { status: 404 },
      )
    }

    return createJsonApiResponse(req, ok(agreement))
  },
})

/**
 * Function: PUT
 *
 * Description: 根据协议类型更新或创建协议
 */
const PUT_IMPL = withV1Route({
  action: 'admin:agreement:update',
  requireAccess: { action: 'write' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: ByTypeParamsSchema,
    body: UpsertAgreementRequestSchema,
  },
  handler: async ({ req, serviceContext, params, body }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)

    // body 已经由 UpsertAgreementRequestSchema 验证，确保非空
    if (!body) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'INVALID_INPUT', message: 'Request body is required' } },
        { status: 400 },
      )
    }

    // 先检查是否存在
    const allAgreements = await service.listAgreements()
    const existing = allAgreements.items.find((a) => a.type === params.type)

    if (existing) {
      // 更新现有协议：使用 updateAgreement，传入必填字段
      const updated = await service.updateAgreement({
        agreementId: existing.id,
        title: body.title,
        content: body.content,
        version: body.version,
        isActive: body.isActive,
        effectiveAt: body.effectiveAt,
      })

      if (!updated) {
        return createJsonApiResponse(
          req,
          { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } },
          { status: 404 },
        )
      }

      return createJsonApiResponse(req, ok(updated))
    } else {
      // 创建新协议：使用 upsertAgreement
      const created = await service.upsertAgreement(body)

      return createJsonApiResponse(req, ok(created))
    }
  },
})

/**
 * Function: DELETE
 *
 * Description: 根据协议类型删除协议
 */
const DELETE_IMPL = withV1Route({
  action: 'admin:agreement:delete',
  requireAccess: { action: 'write' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: ByTypeParamsSchema,
  },
  handler: async ({ req, serviceContext, params }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)

    // 先找到协议 ID
    const allAgreements = await service.listAgreements()
    const existing = allAgreements.items.find((a) => a.type === params.type)

    if (!existing) {
      return createJsonApiResponse(
        req,
        { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } },
        { status: 404 },
      )
    }

    await service.deleteAgreement(existing.id)

    return createJsonApiResponse(req, ok({ deleted: true }))
  },
})

// Next.js 16 对动态路由上下文使用更宽的 string 类型，这里在导出层做兼容适配。
export const GET = GET_IMPL as unknown as DynamicAgreementRouteHandler
export const PUT = PUT_IMPL as unknown as DynamicAgreementRouteHandler
export const DELETE = DELETE_IMPL as unknown as DynamicAgreementRouteHandler

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
