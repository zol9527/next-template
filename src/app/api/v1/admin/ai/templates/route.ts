/**
 * AI Prompt 模板列表路由
 *
 * @module app/api/v1/admin/ai/templates
 * @description 获取所有活跃的 AI Prompt 模板列表
 *   遵循六层架构，通过 Repository 接口访问模板数据
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: GET
 *
 * Description: 获取所有活跃的 AI Prompt 模板列表
 *   返回所有当前活跃版本的模板摘要信息
 */
export const GET = withV1Route({
  action: 'admin:ai:templates:read',
  requireAccess: { action: 'read' as Action, scope: 'ai.templates' as Scope },
  handler: async ({ serviceContext, req }) => {
    const aiPromptTemplate = await createAiPromptTemplateRepository()
    const templateService = createAiTemplateService(
      { aiPromptTemplate },
      serviceContext!,
    )

    const templates = await templateService.listTemplates()

    return createJsonApiResponse(req, ok({
      items: templates.map((t) => ({
        slug: t.slug,
        name: t.name,
        category: t.category,
        version: t.version,
        isActive: t.isActive,
        variables: t.variables,
        createdAt: t.createdAt,
      })),
    }))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: CORS 预检请求处理
 */
export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
