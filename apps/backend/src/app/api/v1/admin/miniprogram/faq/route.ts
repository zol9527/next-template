import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import {
  CreateMiniprogramFaqRequestSchema,
  UpdateMiniprogramFaqRequestSchema,
  type MiniprogramFaqItem,
} from '@/contracts/dtos/admin/miniprogram-faq.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramFaqRepository } from '@/repositories/factory/wechat/miniprogram.factory'

/**
 * 将 FaqRecord 中的 Date 字段转换为 ISO 字符串，匹配 MiniprogramFaqItem 类型
 */
function formatFaq(faq: {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}): MiniprogramFaqItem {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    sort: faq.sort,
    enabled: faq.enabled,
    createdAt: faq.createdAt.toISOString(),
    updatedAt: faq.updatedAt.toISOString(),
  }
}

/**
 * GET — 获取所有 FAQ 列表（管理端，按 sort 升序排列）
 */
export const GET = withV1Route({
  action: 'admin:miniprogram:faq:view',
  requireAccess: { action: 'read' as Action, scope: 'miniprogram.faq' as Scope },
  handler: async ({ req, serviceContext }) => {
    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faqs = await repo.listAll(repoCtx)

    return createJsonApiResponse(req, ok(faqs.map(formatFaq)))
  },
})

/**
 * POST — 创建 FAQ
 */
export const POST = withV1Route({
  action: 'admin:miniprogram:faq:create',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  schemas: { body: CreateMiniprogramFaqRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faq = await repo.create(repoCtx, body!)

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.create',
      faqId: faq.id,
    })

    return createJsonApiResponse(req, ok(formatFaq(faq)), { status: 201 })
  },
})

/**
 * PUT — 更新 FAQ（通过 query param ?id=xxx）
 */
export const PUT = withV1Route({
  action: 'admin:miniprogram:faq:update',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  schemas: { body: UpdateMiniprogramFaqRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return createJsonApiResponse(
        req,
        fail('INVALID_INPUT', '缺少参数 id'),
        { status: 400 },
      )
    }

    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faq = await repo.update(repoCtx, { id, ...body! })

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.update',
      faqId: faq.id,
    })

    return createJsonApiResponse(req, ok(formatFaq(faq)))
  },
})

/**
 * DELETE — 删除 FAQ（通过 query param ?id=xxx）
 */
export const DELETE = withV1Route({
  action: 'admin:miniprogram:faq:delete',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  handler: async ({ req, serviceContext }) => {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return createJsonApiResponse(
        req,
        fail('INVALID_INPUT', '缺少参数 id'),
        { status: 400 },
      )
    }

    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    await repo.delete(repoCtx, { id })

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.delete',
      faqId: id,
    })

    return createJsonApiResponse(req, ok(null))
  },
})

/**
 * OPTIONS — CORS 预检请求
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
