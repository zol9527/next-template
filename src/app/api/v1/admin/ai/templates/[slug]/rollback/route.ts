/**
 * AI Prompt 模板回滚路由
 *
 * @module app/api/v1/admin/ai/templates/[slug]/rollback
 * @description 回滚模板到指定版本
 *   将目标版本设为活跃，其他版本设为非活跃
 *   遵循六层架构，通过 Service 层编排回滚逻辑
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { AiRollbackTemplateRequestSchema } from '@/contracts/ai-settings.dto'
import { createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: POST
 *
 * Description: 回滚模板到指定版本
 *   校验目标版本存在后，将其设为活跃版本
 */
export const POST = withV1Route({
  action: 'admin:ai:templates:write',
  schemas: { body: AiRollbackTemplateRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'ai.templates' as Scope },
  handler: async ({ params, body, serviceContext, req }) => {
    const { slug } = await params
    const aiPromptTemplate = await createAiPromptTemplateRepository()
    const templateService = createAiTemplateService(
      { aiPromptTemplate },
      serviceContext!,
    )

    try {
      const template = await templateService.rollbackTemplate(
        slug as string,
        body!.targetVersion,
      )

      return createJsonApiResponse(req, ok({
        slug: template.slug,
        version: template.version,
        isActive: template.isActive,
      }))
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const code = (error as Error & { code: string }).code
        if (code === 'TEMPLATE_NOT_FOUND' || code === 'TEMPLATE_VERSION_NOT_FOUND') {
          return createJsonApiResponse(req, fail('NOT_FOUND', error.message))
        }
      }
      throw error
    }
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
