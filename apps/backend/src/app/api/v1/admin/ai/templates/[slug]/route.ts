/**
 * AI Prompt 模板详情/创建版本路由
 *
 * @module app/api/v1/admin/ai/templates/[slug]
 * @description 单个模板的详情查看和版本创建
 *   GET: 获取模板详情（含完整内容）
 *   POST: 创建模板新版本
 *   遵循六层架构，通过 Service 层编排模板操作
 */

import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { AiCreateTemplateVersionRequestSchema } from '@/contracts/ai-settings.dto'
import { createAiPromptTemplateRepository } from '@/repositories/factory'
import { createAiTemplateService } from '@/services/core/ai-template.service'

/**
 * Function: GET
 *
 * Description: 获取模板详情
 *   通过 slug 查找当前活跃版本的完整模板信息
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

    try {
      const template = await templateService.getActiveTemplate(slug as string)

      return createJsonApiResponse(req, ok({
        slug: template.slug,
        name: template.name,
        category: template.category,
        content: template.content,
        variables: template.variables,
        version: template.version,
        isActive: template.isActive,
        createdAt: template.createdAt,
      }))
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as Error & { code: string }).code === 'TEMPLATE_NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', `模板不存在: ${slug}`))
      }
      throw error
    }
  },
})

/**
 * Function: POST
 *
 * Description: 创建模板新版本
 *   自动递增版本号，将旧版本标记为非活跃
 *   支持使用 {{变量名}} 语法进行模板变量插值
 */
export const POST = withV1Route({
  action: 'admin:ai:templates:write',
  schemas: { body: AiCreateTemplateVersionRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'ai.templates' as Scope },
  handler: async ({ params, body, userId, serviceContext, req }) => {
    const { slug } = await params
    const aiPromptTemplate = await createAiPromptTemplateRepository()
    const templateService = createAiTemplateService(
      { aiPromptTemplate },
      serviceContext!,
    )

    try {
      const template = await templateService.createTemplateVersion({
        slug: slug as string,
        name: body!.name,
        category: body!.category,
        content: body!.content,
        variables: body!.variables,
        createdById: userId,
      })

      return createJsonApiResponse(req, ok({
        slug: template.slug,
        version: template.version,
        isActive: template.isActive,
      }))
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as Error & { code: string }).code === 'TEMPLATE_VALIDATION_ERROR') {
        return createJsonApiResponse(req, fail('INVALID_INPUT', error.message))
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
