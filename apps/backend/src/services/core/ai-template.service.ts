/**
 * AI Template Service
 *
 * @module services/core/ai-template
 * @description Prompt 模板 CRUD + 版本管理 + 变量插值
 *   遵循六层架构，通过 Repository 接口访问数据
 */

import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  AiPromptTemplateRepository,
  AiPromptTemplateDto,
} from '@/repositories/interfaces/core/ai-prompt-template.interface'

// ==================== 错误构造 ====================

function notFoundError(slug: string): Error & { code: string } {
  const error = new Error(`模板不存在: ${slug}`) as Error & { code: string }
  error.code = 'TEMPLATE_NOT_FOUND'
  return error
}

function versionNotFoundError(slug: string, version: number): Error & { code: string } {
  const error = new Error(`模板版本不存在: ${slug}@v${version}`) as Error & { code: string }
  error.code = 'TEMPLATE_VERSION_NOT_FOUND'
  return error
}

function validationError(message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string }
  error.code = 'TEMPLATE_VALIDATION_ERROR'
  return error
}

// ==================== Prompt Injection 防护 ====================

/**
 * Function: escapeTemplateVariable
 *
 * Description: 对模板变量值进行转义，防止 prompt injection
 *   移除可能导致指令注入的特殊字符和模式
 *
 * Parameters:
 *   value(string): 原始变量值
 *
 * Returns:
 *   escaped(string): 转义后的安全值
 */
function escapeTemplateVariable(value: string): string {
  return value
    // 移除 HTML 标签
    .replace(/<[^>]*>/g, '')
    // 转义模板分隔符，防止嵌套注入
    .replace(/\{\{/g, '\\{\\{')
    .replace(/\}\}/g, '\\}\\}')
    // 移除常见的 prompt injection 前缀
    .replace(/^(ignore\s+(previous|above|all)\s+instructions?)/i, '[filtered]')
    .replace(/^(system\s*:)/i, '[filtered]')
    .replace(/^(human\s*:)/i, '[filtered]')
    .replace(/^(assistant\s*:)/i, '[filtered]')
}

// ==================== Service 工厂 ====================

/**
 * Function: createAiTemplateService
 *
 * Description: 创建 AI Prompt 模板服务实例
 *   提供模板 CRUD、版本管理、变量插值和校验能力
 *
 * Parameters:
 *   deps(object): 依赖注入
 *     aiPromptTemplate(AiPromptTemplateRepository): 模板数据仓库
 *   ctx(ServiceContext): Service 层执行上下文
 *
 * Returns:
 *   service(AiTemplateService): 模板服务实例
 */
export function createAiTemplateService(
  deps: { aiPromptTemplate: AiPromptTemplateRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * Function: getActiveTemplate
     *
     * Description: 获取当前活跃模板（最新版本）
     *
     * Parameters:
     *   slug(string): 模板唯一标识
     *
     * Returns:
     *   template(AiPromptTemplateDto): 活跃模板
     */
    async getActiveTemplate(slug: string): Promise<AiPromptTemplateDto> {
      const template = await deps.aiPromptTemplate.getActiveBySlug(repoCtx, { slug })
      if (!template) throw notFoundError(slug)

      logger.debug({ action: 'ai_template.get', slug, version: template.version })
      return template
    },

    /**
     * Function: listTemplates
     *
     * Description: 列出所有活跃模板
     *
     * Parameters:
     *   category(string, optional): 分类筛选
     *
     * Returns:
     *   templates(AiPromptTemplateDto[]): 活跃模板列表
     */
    async listTemplates(category?: string): Promise<AiPromptTemplateDto[]> {
      const templates = await deps.aiPromptTemplate.listActive(repoCtx, { category })
      logger.debug({ action: 'ai_template.list', category, count: templates.length })
      return templates
    },

    /**
     * Function: createTemplateVersion
     *
     * Description: 创建模板新版本
     *   自动递增版本号，将旧版本标记为非活跃
     *
     * Parameters:
     *   params(object): 创建参数
     *     slug(string): 模板唯一标识
     *     name(string): 模板名称
     *     category(string): 分类
     *     content(string): 模板内容（含 {{变量名}} 占位符）
     *     variables(string[]): 声明的变量名列表
     *     createdById(string, optional): 创建者 ID
     *
     * Returns:
     *   template(AiPromptTemplateDto): 新创建的模板版本
     */
    async createTemplateVersion(params: {
      slug: string
      name: string
      category: string
      content: string
      variables: string[]
      createdById?: string
    }): Promise<AiPromptTemplateDto> {
      // 校验变量引用完整性
      const validation = validateTemplateContent(params.content, params.variables)
      if (!validation.valid) {
        throw validationError(validation.message!)
      }

      const template = await deps.aiPromptTemplate.createVersion(repoCtx, params)
      logger.info({
        action: 'ai_template.create_version',
        slug: params.slug,
        version: template.version,
      })
      return template
    },

    /**
     * Function: getTemplateVersions
     *
     * Description: 获取模板版本历史（按版本号降序）
     *
     * Parameters:
     *   slug(string): 模板唯一标识
     *
     * Returns:
     *   versions(AiPromptTemplateDto[]): 版本历史列表
     */
    async getTemplateVersions(slug: string): Promise<AiPromptTemplateDto[]> {
      const versions = await deps.aiPromptTemplate.getVersions(repoCtx, { slug })
      logger.debug({ action: 'ai_template.get_versions', slug, count: versions.length })
      return versions
    },

    /**
     * Function: rollbackTemplate
     *
     * Description: 回滚模板到指定版本
     *   将目标版本设为活跃，其他版本设为非活跃
     *
     * Parameters:
     *   slug(string): 模板唯一标识
     *   targetVersion(number): 目标版本号
     *
     * Returns:
     *   template(AiPromptTemplateDto): 回滚后的活跃模板
     */
    async rollbackTemplate(slug: string, targetVersion: number): Promise<AiPromptTemplateDto> {
      // 校验目标版本存在
      const target = await deps.aiPromptTemplate.getBySlugAndVersion(repoCtx, {
        slug,
        version: targetVersion,
      })
      if (!target) throw versionNotFoundError(slug, targetVersion)

      await deps.aiPromptTemplate.setActiveVersion(repoCtx, { slug, version: targetVersion })

      logger.info({
        action: 'ai_template.rollback',
        slug,
        targetVersion,
      })

      return target
    },

    /**
     * Function: interpolateTemplate
     *
     * Description: 加载模板并替换变量占位符
     *   对用户输入做 prompt injection 防护（HTML 转义 + 特殊字符过滤）
     *
     * Parameters:
     *   slug(string): 模板唯一标识
     *   variables(Record<string, string>): 变量名到值的映射
     *
     * Returns:
     *   result(object): { prompt: 插值后的 prompt, template: 模板信息 }
     */
    async interpolateTemplate(
      slug: string,
      variables: Record<string, string>,
    ): Promise<{ prompt: string; template: AiPromptTemplateDto }> {
      const template = await deps.aiPromptTemplate.getActiveBySlug(repoCtx, { slug })
      if (!template) throw notFoundError(slug)

      // 对所有变量值做安全转义
      const escapedVars: Record<string, string> = {}
      for (const [key, value] of Object.entries(variables)) {
        escapedVars[key] = escapeTemplateVariable(String(value))
      }

      // 替换 {{变量名}} 为转义后的值
      let prompt = template.content
      for (const [key, value] of Object.entries(escapedVars)) {
        // 全局替换所有出现的 {{key}}
        prompt = prompt.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'), value)
      }

      // 检查是否有未替换的变量占位符
      const unreplaced = prompt.match(/\{\{(\w+)\}\}/g)
      if (unreplaced) {
        const names = unreplaced.map((m) => m.replace(/\{\{|\}\}/g, ''))
        throw validationError(
          `模板变量未全部替换，缺少: ${names.join(', ')}`,
        )
      }

      logger.debug({
        action: 'ai_template.interpolate',
        slug,
        variableCount: Object.keys(variables).length,
      })

      return { prompt, template }
    },

    /**
     * Function: validateTemplate
     *
     * Description: 校验模板内容中的变量引用是否与声明的变量列表匹配
     *
     * Parameters:
     *   content(string): 模板内容
     *   variables(string[]): 声明的变量名列表
     *
     * Returns:
     *   result(object): { valid, missingVars, extraVars, message }
     */
    validateTemplate(
      content: string,
      variables: string[],
    ): {
      valid: boolean
      missingVars: string[]
      extraVars: string[]
      message?: string
    } {
      return validateTemplateContent(content, variables)
    },
  }
}

export type AiTemplateService = ReturnType<typeof createAiTemplateService>

// ==================== 内部工具函数 ====================

/**
 * Function: validateTemplateContent
 *
 * Description: 校验模板变量引用完整性
 *   检查内容中引用的变量是否都在声明列表中
 *
 * Parameters:
 *   content(string): 模板内容
 *   variables(string[]): 声明的变量名列表
 *
 * Returns:
 *   result(object): { valid, missingVars, extraVars, message }
 */
function validateTemplateContent(content: string, variables: string[]): {
  valid: boolean
  missingVars: string[]
  extraVars: string[]
  message?: string
} {
  // 提取内容中引用的所有变量名
  const referencedVars = new Set<string>()
  const varPattern = /\{\{(\w+)\}\}/g
  let match: RegExpExecArray | null
  while ((match = varPattern.exec(content)) !== null) {
    referencedVars.add(match[1])
  }

  const declaredVars = new Set(variables)

  // 内容中引用但未声明的变量
  const missingVars = [...referencedVars].filter((v) => !declaredVars.has(v))
  // 声明但未在内容中引用的变量
  const extraVars = [...declaredVars].filter((v) => !referencedVars.has(v))

  if (missingVars.length > 0) {
    return {
      valid: false,
      missingVars,
      extraVars,
      message: `模板内容引用了未声明的变量: ${missingVars.join(', ')}`,
    }
  }

  return { valid: true, missingVars: [], extraVars }
}

/**
 * Function: escapeRegExp
 *
 * Description: 转义正则表达式特殊字符
 *
 * Parameters:
 *   str(string): 原始字符串
 *
 * Returns:
 *   escaped(string): 转义后的字符串
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
