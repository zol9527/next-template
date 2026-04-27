/**
 * AI Prompt 模板版本历史路由
 *
 * @module app/api/v1/admin/ai/templates/[slug]/versions
 * @description 获取模板的版本历史记录（按版本号降序）
 *   遵循六层架构，通过 Service 层查询版本数据
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
 * Description: 获取模板版本历史
 *   按版本号降序返回指定模板的所有历史版本
 */
export const GET = withV1Route({
  action: 'admin:ai:templates:read',
  requireAccess: { action: 'read' as Action, scope: 'ai.templates' as Scope },
  handler: async ({ params, serviceContext, req }) => {
    const { slug } = await params
    const aiPromptTemplate = await createAiPromptTemplateRepository()
    const templateService = createAiTemplateService(
      { aiPromptTemplate },
      serviceContext!,
    )

    const versions = await templateService.getTemplateVersions(slug as string)

    return createJsonApiResponse(req, ok({
      items: versions.map((v) => ({
        version: v.version,
        name: v.name,
        content: v.content,
        isActive: v.isActive,
        createdAt: v.createdAt,
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
