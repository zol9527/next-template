import { prisma } from '@/lib/prisma'
import type { PromoterCodeRepository } from '@/plugins/promotion/repositories/interfaces/promoter-code.interface'
import type { PromoterCode } from '@/plugins/promotion/contracts/promoter-codes.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {}
  if (typeof metadata === 'object') return metadata as Record<string, unknown>
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

function mapCode(c: { id: string; code: string; promoterUserId: string; type: string; status: string; usageCount: number; activeFrom: Date; activeTo: Date | null; metadata: unknown; createdAt: Date; updatedAt: Date }): PromoterCode {
  return {
    id: c.id,
    code: c.code.toUpperCase(),
    promoterUserId: c.promoterUserId,
    type: c.type as 'auto' | 'custom',
    status: c.status as 'active' | 'disabled',
    usageCount: c.usageCount,
    activeFrom: c.activeFrom.toISOString(),
    activeTo: c.activeTo?.toISOString() ?? null,
    metadata: parseMetadata(c.metadata),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function createPrismaPromoterCodeRepository(): PromoterCodeRepository {
  return {
    async checkCodeExists(ctx: RepoContext, params: { code: string }) {
      const { logger } = ctx
      logger.info({ action: 'check_code_exists', code: params.code })

      const count = await prisma.promoterCode.count({ where: { code: params.code.toUpperCase() } })
      return count > 0
    },

    async getActiveCodesCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_active_codes_count', promoterUserId: params.promoterUserId })

      return prisma.promoterCode.count({ where: { promoterUserId: params.promoterUserId, status: 'active' } })
    },

    async createCode(ctx: RepoContext, params: { code: string; promoterUserId: string; type: string; activeTo: string | null; metadata?: Record<string, unknown> }) {
      const { logger } = ctx
      logger.info({ action: 'create_code', code: params.code, promoterUserId: params.promoterUserId })

      const code = await prisma.promoterCode.create({
        data: {
          code: params.code.toUpperCase(),
          promoterUserId: params.promoterUserId,
          type: params.type as 'auto' | 'custom',
          activeTo: params.activeTo ? new Date(params.activeTo) : null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : '{}',
        },
      })
      return mapCode(code)
    },

    async getCodeByCode(ctx: RepoContext, params: { code: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_code_by_code', code: params.code })

      const code = await prisma.promoterCode.findUnique({ where: { code: params.code.toUpperCase() } })
      return code ? mapCode(code) : null
    },

    async getCodeById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_code_by_id', id: params.id })

      const code = await prisma.promoterCode.findUnique({ where: { id: params.id } })
      return code ? mapCode(code) : null
    },

    async listCodesByPromoterUserId(ctx: RepoContext, params: { promoterUserId: string; limit: number; cursor?: string | null; status: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_codes_by_promoter_user_id', promoterUserId: params.promoterUserId })

      const where: Record<string, unknown> = { promoterUserId: params.promoterUserId }
      if (params.status) where.status = params.status
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }

      const codes = await prisma.promoterCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
      })

      return {
        items: codes.map(mapCode),
        nextCursor: codes.length === params.limit ? codes[codes.length - 1]?.createdAt.toISOString() ?? null : null,
      }
    },

    async updateCodeStatus(ctx: RepoContext, params: { id: string; status: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_code_status', id: params.id, status: params.status })

      const code = await prisma.promoterCode.update({
        where: { id: params.id },
        data: { status: params.status, updatedAt: new Date(params.updatedAt) },
      })
      return mapCode(code)
    },

    async deleteCode(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_code', id: params.id })

      await prisma.promoterCode.delete({
        where: { id: params.id },
      })

      logger.info({ action: 'delete_code_success', id: params.id })
    },

    async incrementUsageCount(ctx: RepoContext, params: { id: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'increment_usage_count', id: params.id })

      const code = await prisma.promoterCode.update({
        where: { id: params.id },
        data: { usageCount: { increment: 1 }, updatedAt: new Date(params.updatedAt) },
      })
      return mapCode(code)
    },

    async getTotalCodesCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_total_codes_count', promoterUserId: params.promoterUserId })

      return prisma.promoterCode.count({ where: { promoterUserId: params.promoterUserId } })
    },
  }
}
