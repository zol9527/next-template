import { prisma } from '@/lib/prisma'
import type { CommissionRepository, CommissionRecordDto, CommissionRuleDto, OrderSettlementViewItem } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { RepoContext } from '@/types/repo/repo-context'

function mapRule(r: Record<string, unknown>): CommissionRuleDto {
  return {
    id: r.id as string,
    scope: r.scope as 'global' | 'product' | 'category',
    scopeId: r.scope_id as string | null,
    rate: String(r.rate),
    activeFrom: (r.active_from as Date)?.toISOString() ?? '',
    activeTo: r.active_to as string | null,
    createdAt: (r.created_at as Date)?.toISOString() ?? '',
    updatedAt: (r.updated_at as Date)?.toISOString() ?? '',
  }
}

interface CommissionRecordWithRelations {
  id: string
  orderId: string
  promoterUserId: string
  baseAmount: { toString(): string }
  rate: { toString(): string }
  commissionAmount: { toString(): string }
  status: string
  rateSource: string | null
  settlementId: string | null
  createdAt: Date
  updatedAt: Date
  order?: {
    orderNo: string
    productId: string
    product?: {
      name: string
    }
  } | null
  promoter?: {
    username: string | null
  } | null
}

function mapRecord(r: CommissionRecordWithRelations): CommissionRecordDto {
  return {
    id: r.id,
    orderId: r.orderId,
    orderNo: r.order?.orderNo ?? null,
    promoterUserId: r.promoterUserId,
    promoterUsername: r.promoter?.username ?? null,
    productId: r.order?.productId ?? null,
    productName: r.order?.product?.name ?? null,
    baseAmount: r.baseAmount.toString(),
    rate: r.rate.toString(),
    commissionAmount: r.commissionAmount.toString(),
    status: r.status as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
    settlementId: r.settlementId,
    rateSource: (r.rateSource as 'promoter_level' | 'global_rule' | null) || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function createPrismaCommissionRepository(): CommissionRepository {
  return {
    async getActiveGlobalRule(ctx: RepoContext, params: { nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_active_global_rule', nowIso: params.nowIso })

      const rule = await prisma.commissionRule.findFirst({
        where: {
          scope: 'global',
          activeFrom: { lte: new Date(params.nowIso) },
          OR: [
            { activeTo: null },
            { activeTo: { gt: new Date(params.nowIso) } },
          ],
        },
        orderBy: { activeFrom: 'desc' },
      })
      return rule ? mapRule(rule) : null
    },

    async listCommissionRules(ctx: RepoContext, params: { scope?: string | null; scopeId?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_commission_rules', scope: params.scope })

      const where: Record<string, unknown> = {}
      if (params.scope) where.scope = params.scope
      if (params.scopeId) where.scopeId = params.scopeId

      const rules = await prisma.commissionRule.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
      return rules.map(mapRule)
    },

    async createCommissionRule(ctx: RepoContext, params: { scope: string; scopeId: string | null; rate: string; activeFrom: string; activeTo: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'create_commission_rule', scope: params.scope })

      const rule = await prisma.commissionRule.create({
        data: {
          scope: params.scope as 'global' | 'product' | 'category',
          scopeId: params.scopeId,
          rate: params.rate,
          activeFrom: new Date(params.activeFrom),
          activeTo: params.activeTo ? new Date(params.activeTo) : null,
        },
      })
      return mapRule(rule)
    },

    async updateCommissionRule(ctx: RepoContext, params: { id: string; rate?: string; activeFrom?: string; activeTo?: string | null; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_rule', id: params.id })

      const updates: Record<string, unknown> = { updatedAt: new Date(params.updatedAt) }
      if (params.rate !== undefined) updates.rate = params.rate
      if (params.activeFrom !== undefined) updates.activeFrom = new Date(params.activeFrom)
      if (params.activeTo !== undefined) updates.activeTo = params.activeTo ? new Date(params.activeTo) : null

      const rule = await prisma.commissionRule.update({ where: { id: params.id }, data: updates })
      return mapRule(rule)
    },

    async deleteCommissionRule(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_commission_rule', id: params.id })

      await prisma.commissionRule.delete({ where: { id: params.id } })
      return true
    },

    async getCommissionByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_by_order_id', orderId: params.orderId })

      const record = await prisma.commissionRecord.findFirst({
        where: { orderId: params.orderId },
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return record ? mapRecord(record) : null
    },

    async getCommissionByOrderAndPromoter(ctx: RepoContext, params: { orderId: string; promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_by_order_and_promoter', orderId: params.orderId, promoterUserId: params.promoterUserId })

      const record = await prisma.commissionRecord.findFirst({
        where: { orderId: params.orderId, promoterUserId: params.promoterUserId },
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return record ? mapRecord(record) : null
    },

    async getCommissionRecordsByIds(ctx: RepoContext, params: { commissionRecordIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_records_by_ids', count: params.commissionRecordIds.length })

      const records = await prisma.commissionRecord.findMany({
        where: { id: { in: params.commissionRecordIds } },
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return records.map(mapRecord)
    },

    async createCommissionRecord(ctx: RepoContext, params: { orderId: string; promoterUserId: string; baseAmount: string; rate: string; commissionAmount: string; status: string; rateSource?: 'promoter_level' | 'global_rule' | null }) {
      const { logger } = ctx
      logger.info({ action: 'create_commission_record', orderId: params.orderId, promoterUserId: params.promoterUserId })

      const record = await prisma.commissionRecord.create({
        data: {
          orderId: params.orderId,
          promoterUserId: params.promoterUserId,
          baseAmount: params.baseAmount,
          rate: params.rate,
          commissionAmount: params.commissionAmount,
          status: params.status as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
          rateSource: params.rateSource ?? null,
        },
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return mapRecord(record)
    },

    async updateCommissionStatus(ctx: RepoContext, params: { commissionRecordId: string; status: string; settlementId?: string | null; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_status', commissionRecordId: params.commissionRecordId, status: params.status })

      const updates: Record<string, unknown> = { updatedAt: new Date(params.updatedAt) }
      if (params.status) updates.status = params.status
      if (params.settlementId !== undefined) updates.settlementId = params.settlementId

      const record = await prisma.commissionRecord.update({
        where: { id: params.commissionRecordId },
        data: updates,
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return mapRecord(record)
    },

    async updateCommissionRecord(ctx: RepoContext, params: {
      id: string
      baseAmount?: string
      commissionAmount?: string
      status?: string
      updatedAt: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_record', id: params.id })

      const updates: Record<string, unknown> = { updatedAt: new Date(params.updatedAt) }
      if (params.baseAmount !== undefined) updates.baseAmount = params.baseAmount
      if (params.commissionAmount !== undefined) updates.commissionAmount = params.commissionAmount
      if (params.status !== undefined) updates.status = params.status

      const record = await prisma.commissionRecord.update({
        where: { id: params.id },
        data: updates,
        include: {
          order: {
            select: {
              orderNo: true,
              productId: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          promoter: {
            select: {
              username: true,
            },
          },
        },
      })
      return mapRecord(record)
    },

    async listCommissionRecords(ctx: RepoContext, params: { limit: number; cursor?: string | null; status?: string | null; promoterUserId?: string | null; orderId?: string | null; orderNo?: string | null; keyword?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_commission_records', limit: params.limit, keyword: params.keyword, orderNo: params.orderNo })

      // 构建基础过滤条件 — 各字段可命中对应的单列/复合索引
      const baseWhere: Record<string, unknown> = {}
      if (params.status) baseWhere.status = params.status
      if (params.promoterUserId) baseWhere.promoterUserId = params.promoterUserId
      if (params.orderId) baseWhere.orderId = params.orderId
      if (params.cursor) baseWhere.createdAt = { lt: new Date(params.cursor) }

      const includeOptions = {
        order: {
          select: {
            orderNo: true,
            productId: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        promoter: {
          select: {
            username: true,
          },
        },
      } as const

      // keyword 跨 relation OR → 拆分为两个并行查询以命中各自的索引
      if (params.keyword) {
        const [byOrder, byPromoter] = await Promise.all([
          prisma.commissionRecord.findMany({
            where: {
              ...baseWhere,
              order: { orderNo: { contains: params.keyword } },
            },
            include: includeOptions,
            orderBy: { createdAt: 'desc' },
            take: params.limit,
          }),
          prisma.commissionRecord.findMany({
            where: {
              ...baseWhere,
              promoter: { username: { contains: params.keyword } },
            },
            include: includeOptions,
            orderBy: { createdAt: 'desc' },
            take: params.limit,
          }),
        ])

        // 合并去重，按 createdAt 降序排列
        const seen = new Set<string>()
        const merged = [...byOrder, ...byPromoter]
          .filter((r) => {
            if (seen.has(r.id)) return false
            seen.add(r.id)
            return true
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, params.limit)

        // totalCount: 使用 OR 查询计数（计数查询不存在排序开销）
        const countWhere = {
          ...baseWhere,
          OR: [
            { order: { orderNo: { contains: params.keyword } } },
            { promoter: { username: { contains: params.keyword } } },
          ],
        }
        const totalCount = await prisma.commissionRecord.count({ where: countWhere })

        return {
          items: merged.map(mapRecord),
          nextCursor: merged.length === params.limit ? merged[merged.length - 1]?.createdAt.toISOString() ?? null : null,
          totalCount,
        }
      }

      // 无 keyword：orderNo 过滤走 order relation 索引
      if (params.orderNo) {
        baseWhere.order = { orderNo: { contains: params.orderNo } }
      }

      const [records, totalCount] = await Promise.all([
        prisma.commissionRecord.findMany({
          where: baseWhere,
          include: includeOptions,
          orderBy: { createdAt: 'desc' },
          take: params.limit,
        }),
        prisma.commissionRecord.count({ where: baseWhere }),
      ])

      return {
        items: records.map(mapRecord),
        nextCursor: records.length === params.limit ? records[records.length - 1]?.createdAt.toISOString() ?? null : null,
        totalCount,
      }
    },

    async attachSettlementAndMarkSettled(ctx: RepoContext, params: { commissionRecordIds: string[]; settlementId: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'attach_settlement_and_mark_settled', count: params.commissionRecordIds.length })

      // 使用 updateMany 获取更新数量
      const updateResult = await prisma.commissionRecord.updateMany({
        where: { id: { in: params.commissionRecordIds } },
        data: {
          settlementId: params.settlementId,
          status: 'settled',
          updatedAt: new Date(params.updatedAt),
        },
      })

      // 如果更新成功，返回更新后的完整记录
      if (updateResult.count > 0) {
        const records = await prisma.commissionRecord.findMany({
          where: { id: { in: params.commissionRecordIds } },
          include: {
            order: {
              select: {
                orderNo: true,
                productId: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            promoter: {
              select: {
                username: true,
              },
            },
          },
        })
        return records.map(mapRecord)
      }

      return []
    },

    async listOrderSettlementView(ctx: RepoContext, params: { limit: number; cursor?: string | null; status?: string | null; orderNo?: string | null; keyword?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_order_settlement_view', limit: params.limit })

      const where: Record<string, unknown> = {}
      if (params.orderNo) where.orderNo = { contains: params.orderNo }
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: params.limit,
        }),
        prisma.order.count({ where }),
      ])

      const items: OrderSettlementViewItem[] = orders.map((o) => ({
        orderId: o.id,
        orderNo: o.orderNo,
        commissionId: '',
        promoterUserId: '',
        promoterUsername: null,
        productId: o.productId,
        productName: null,
        commissionAmount: '0',
        commissionStatus: o.status as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
        rate: '0',
        settlementId: null,
        settlementStatus: null,
        applicationId: null,
        applicationStatus: null,
        orderCreatedAt: o.createdAt.toISOString(),
        commissionCreatedAt: o.createdAt.toISOString(),
      }))

      return {
        items,
        nextCursor: orders.length === params.limit ? orders[orders.length - 1]?.createdAt.toISOString() ?? null : null,
        totalCount,
      }
    },

    async getDistinctSettlementIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_distinct_settlement_ids_by_promoter', promoterUserId: params.promoterUserId })

      const rows = await prisma.commissionRecord.findMany({
        where: {
          promoterUserId: params.promoterUserId,
          settlementId: { not: null },
        },
        select: { settlementId: true },
        distinct: ['settlementId'],
      })

      return rows.map((r) => r.settlementId!).filter(Boolean)
    },

    async sumPayableCommissions(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'sum_payable_commissions', promoterUserId: params.promoterUserId })

      const result = await prisma.commissionRecord.aggregate({
        _sum: { commissionAmount: true },
        where: {
          promoterUserId: params.promoterUserId,
          status: 'payable',
        },
      })

      return result._sum.commissionAmount?.toString() ?? '0'
    },

    async getPayableCommissionIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payable_commission_ids_by_promoter', promoterUserId: params.promoterUserId })

      const rows = await prisma.commissionRecord.findMany({
        where: {
          promoterUserId: params.promoterUserId,
          status: 'payable',
        },
        select: { id: true },
        take: 100,
      })

      return rows.map((r) => r.id)
    },
  }
}
