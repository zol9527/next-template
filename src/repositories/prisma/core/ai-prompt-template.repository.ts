/**
 * AI Prompt Template Prisma Repository
 *
 * @module repositories/prisma/ai-prompt-template
 * @description AI Prompt 模板的 Prisma 实现
 */

import { prisma } from '@/lib/prisma'
import type {
  AiPromptTemplateRepository,
  AiPromptTemplateDto,
  CreateTemplateVersionParams,
} from '@/repositories/interfaces/core/ai-prompt-template.interface'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * Function: toDto
 *
 * Description: 将 Prisma AiPromptTemplate 记录转换为 DTO
 *
 * Parameters:
 *   row(object): Prisma 查询返回的原始记录
 *
 * Returns:
 *   dto(AiPromptTemplateDto): 转换后的 DTO
 */
function toDto(row: {
  id: string
  slug: string
  name: string
  category: string
  content: string
  variables: unknown
  version: number
  isActive: boolean
  createdById: string | null
  createdAt: Date
}): AiPromptTemplateDto {
  // variables 在 DB 中存储为 JSON 数组，确保转换为 string[]
  const vars = row.variables
  const variables = Array.isArray(vars)
    ? vars.map(String)
    : typeof vars === 'string'
      ? [vars]
      : []

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    content: row.content,
    variables,
    version: row.version,
    isActive: row.isActive,
    createdById: row.createdById,
    createdAt: row.createdAt,
  }
}

/**
 * Function: createPrismaAiPromptTemplateRepository
 *
 * Description: 创建基于 Prisma 的 AI Prompt 模板 Repository 实例
 *
 * Returns:
 *   repository(AiPromptTemplateRepository): Repository 实例
 */
export function createPrismaAiPromptTemplateRepository(): AiPromptTemplateRepository {
  return {
    async getActiveBySlug(
      ctx: RepoContext,
      params: { slug: string },
    ): Promise<AiPromptTemplateDto | null> {
      const { logger } = ctx
      logger.debug({ action: 'ai_template.getActiveBySlug', slug: params.slug })

      const row = await prisma.aiPromptTemplate.findFirst({
        where: {
          slug: params.slug,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      })

      return row ? toDto(row) : null
    },

    async listActive(
      ctx: RepoContext,
      params: { category?: string },
    ): Promise<AiPromptTemplateDto[]> {
      const { logger } = ctx
      logger.debug({ action: 'ai_template.listActive', category: params.category })

      const where: Record<string, unknown> = { isActive: true }
      if (params.category) {
        where.category = params.category
      }

      // 按 slug 分组取最新活跃版本
      const rows = await prisma.aiPromptTemplate.findMany({
        where,
        orderBy: [{ slug: 'asc' }, { version: 'desc' }],
      })

      // 按 slug 去重，只保留每个 slug 的最新版本
      const seen = new Set<string>()
      const result: AiPromptTemplateDto[] = []
      for (const row of rows) {
        if (!seen.has(row.slug)) {
          seen.add(row.slug)
          result.push(toDto(row))
        }
      }

      return result
    },

    async createVersion(
      ctx: RepoContext,
      params: CreateTemplateVersionParams,
    ): Promise<AiPromptTemplateDto> {
      const { logger } = ctx
      logger.info({ action: 'ai_template.createVersion', slug: params.slug })

      // 先将该 slug 的所有现有活跃版本设为非活跃
      await prisma.aiPromptTemplate.updateMany({
        where: {
          slug: params.slug,
          isActive: true,
        },
        data: { isActive: false },
      })

      // 获取当前最大版本号
      const latest = await prisma.aiPromptTemplate.findFirst({
        where: { slug: params.slug },
        orderBy: { version: 'desc' },
        select: { version: true },
      })

      const nextVersion = (latest?.version ?? 0) + 1

      const row = await prisma.aiPromptTemplate.create({
        data: {
          slug: params.slug,
          name: params.name,
          category: params.category,
          content: params.content,
          variables: params.variables,
          version: nextVersion,
          isActive: true,
          createdById: params.createdById ?? null,
        },
      })

      return toDto(row)
    },

    async getVersions(
      ctx: RepoContext,
      params: { slug: string },
    ): Promise<AiPromptTemplateDto[]> {
      const { logger } = ctx
      logger.debug({ action: 'ai_template.getVersions', slug: params.slug })

      const rows = await prisma.aiPromptTemplate.findMany({
        where: { slug: params.slug },
        orderBy: { version: 'desc' },
      })

      return rows.map(toDto)
    },

    async getBySlugAndVersion(
      ctx: RepoContext,
      params: { slug: string; version: number },
    ): Promise<AiPromptTemplateDto | null> {
      const { logger } = ctx
      logger.debug({
        action: 'ai_template.getBySlugAndVersion',
        slug: params.slug,
        version: params.version,
      })

      const row = await prisma.aiPromptTemplate.findUnique({
        where: {
          slug_version: {
            slug: params.slug,
            version: params.version,
          },
        },
      })

      return row ? toDto(row) : null
    },

    async setActiveVersion(
      ctx: RepoContext,
      params: { slug: string; version: number },
    ): Promise<void> {
      const { logger } = ctx
      logger.info({
        action: 'ai_template.setActiveVersion',
        slug: params.slug,
        version: params.version,
      })

      // 将所有版本设为非活跃
      await prisma.aiPromptTemplate.updateMany({
        where: { slug: params.slug },
        data: { isActive: false },
      })

      // 将目标版本设为活跃
      await prisma.aiPromptTemplate.update({
        where: {
          slug_version: {
            slug: params.slug,
            version: params.version,
          },
        },
        data: { isActive: true },
      })
    },
  }
}
