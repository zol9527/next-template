import { prisma } from '@/lib/prisma'
import type { PromoterRepository, PromoterLevelRecord, PromoterWithStats } from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'
import type { RepoContext } from '@/types/repo/repo-context'

// Function: mapLevel
// Description: 将数据库记录映射为推广员等级对象
//
// Parameters:
//   r(PrismaPromoterLevel): 数据库中的推广员等级记录
//
// Returns:
//   PromoterLevel | null: 推广员等级对象，如果必要字段缺失则返回 null
function mapLevel(r: {
  id: string
  name: string
  commissionRate: unknown
  level: number
  minSalesAmount: unknown
  minSalesCount: number | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}): PromoterLevel | null {
  const commissionRateStr = typeof r.commissionRate === 'string' ? r.commissionRate : String(r.commissionRate)
  const minSalesAmountStr = typeof r.minSalesAmount === 'string' ? r.minSalesAmount : String(r.minSalesAmount)

  if (!r.id || !r.name || !commissionRateStr || r.level === null || !minSalesAmountStr) return null

  return {
    id: r.id,
    name: r.name,
    level: r.level,
    commissionRate: commissionRateStr,
    minSalesCount: r.minSalesCount ?? 0,
    minSalesAmount: minSalesAmountStr,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

// Function: mapLevelRecord
// Description: 将数据库记录映射为推广员等级记录对象
//
// Parameters:
//   r(PrismaPromoterLevelRecord): 数据库中的推广员等级记录
//
// Returns:
//   PromoterLevelRecord | null: 推广员等级记录对象，如果必要字段缺失则返回 null
function mapLevelRecord(r: {
  id: string
  userId: string
  promoterLevelId: string
  effectiveAt: Date
  inactiveAt: Date | null
  createdAt: Date
}): PromoterLevelRecord | null {
  if (!r.id || !r.userId || !r.promoterLevelId || !r.effectiveAt) return null
  return {
    id: r.id,
    userId: r.userId,
    promoterLevelId: r.promoterLevelId,
    effectiveAt: r.effectiveAt.toISOString(),
    inactiveAt: r.inactiveAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

export function createPrismaPromoterRepository(): PromoterRepository {
  return {
    // Function: getUserById
    // Description: 根据 ID 获取用户基本信息
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.userId(string): 用户 ID
    //
    // Returns:
    //   { username: string | null; avatarUrl: string | null } | null: 用户基本信息
    async getUserById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_id', userId: params.userId })

      const user = await prisma.user.findUnique({ where: { id: params.userId } })
      if (!user) return null
      return { username: user.username, avatarUrl: user.avatarUrl }
    },

    // Function: getAllLevels
    // Description: 获取所有推广员等级
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //
    // Returns:
    //   PromoterLevel[]: 推广员等级列表
    async getAllLevels(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_all_levels' })

      const levels = await prisma.promoterLevel.findMany({ orderBy: { level: 'asc' } })
      return levels.map((l: typeof levels[number]) => mapLevel(l) as PromoterLevel)
    },

    // Function: getLevelById
    // Description: 根据 ID 获取推广员等级
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.levelId(string): 等级 ID
    //
    // Returns:
    //   PromoterLevel | null: 推广员等级对象
    async getLevelById(ctx: RepoContext, params: { levelId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_level_by_id', levelId: params.levelId })

      const level = await prisma.promoterLevel.findUnique({ where: { id: params.levelId } })
      return level ? mapLevel(level) : null
    },

    // Function: getLevelByNumber
    // Description: 根据等级编号获取推广员等级
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.level(number): 等级编号
    //
    // Returns:
    //   PromoterLevel | null: 推广员等级对象
    async getLevelByNumber(ctx: RepoContext, params: { level: number }) {
      const { logger } = ctx
      logger.info({ action: 'get_level_by_number', level: params.level })

      const level = await prisma.promoterLevel.findUnique({ where: { level: params.level } })
      return level ? mapLevel(level) : null
    },

    // Function: updateLevel
    // Description: 更新推广员等级
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.levelId(string): 等级 ID
    //   params.commissionRate(string): 佣金比例
    //   params.minSalesAmount(string): 最小销售金额
    //   params.minSalesCount(number): 最小销售数量
    //   params.description(string): 描述
    //
    // Returns:
    //   PromoterLevel: 更新后的推广员等级对象
    async updateLevel(ctx: RepoContext, params: { levelId: string; commissionRate?: string; minSalesAmount?: string; minSalesCount?: number; description?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_level', levelId: params.levelId })

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (params.commissionRate !== undefined) updates.commissionRate = params.commissionRate
      if (params.minSalesAmount !== undefined) updates.minSalesAmount = params.minSalesAmount
      if (params.minSalesCount !== undefined) updates.minSalesCount = params.minSalesCount
      if (params.description !== undefined) updates.description = params.description

      const level = await prisma.promoterLevel.update({ where: { id: params.levelId }, data: updates })
      return mapLevel(level) as PromoterLevel
    },

    // Function: getCurrentLevelRecord
    // Description: 获取用户当前的等级记录
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.userId(string): 用户 ID
    //
    // Returns:
    //   PromoterLevelRecord | null: 推广员等级记录对象
    async getCurrentLevelRecord(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_current_level_record', userId: params.userId })

      const record = await prisma.promoterLevelRecord.findFirst({
        where: { userId: params.userId, inactiveAt: null },
        orderBy: { createdAt: 'desc' },
      })
      return record ? mapLevelRecord(record) : null
    },

    // Function: createLevelRecord
    // Description: 创建推广员等级记录
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.userId(string): 用户 ID
    //   params.promoterLevelId(string): 推广员等级 ID
    //   params.effectiveAt(string): 生效时间
    //
    // Returns:
    //   PromoterLevelRecord: 创建的推广员等级记录对象
    async createLevelRecord(ctx: RepoContext, params: { userId: string; promoterLevelId: string; effectiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_level_record', userId: params.userId, levelId: params.promoterLevelId })

      const record = await prisma.promoterLevelRecord.create({
        data: {
          userId: params.userId,
          promoterLevelId: params.promoterLevelId,
          effectiveAt: new Date(params.effectiveAt),
        },
      })
      return mapLevelRecord(record) as PromoterLevelRecord
    },

    // Function: deactivateCurrentLevelRecord
    // Description: 停用用户当前的等级记录
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.userId(string): 用户 ID
    //   params.inactiveAt(string): 停用时间
    //
    // Returns:
    //   boolean: 是否成功停用
    async deactivateCurrentLevelRecord(ctx: RepoContext, params: { userId: string; inactiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'deactivate_current_level_record', userId: params.userId })

      const record = await this.getCurrentLevelRecord(ctx, { userId: params.userId })
      if (!record) return false

      await prisma.promoterLevelRecord.update({
        where: { id: record.id },
        data: { inactiveAt: new Date(params.inactiveAt) },
      })
      return true
    },

    // Function: getPromoterStats
    // Description: 获取推广员统计数据
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.userId(string): 用户 ID
    //
    // Returns:
    //   PromoterStats: 推广员统计数据
    async getPromoterStats(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_promoter_stats', userId: params.userId })

      const commissions = await prisma.commissionRecord.findMany({ where: { promoterUserId: params.userId } })
      const orders = await prisma.order.count({ where: { userId: params.userId } })

      let totalCommission = '0', payableCommission = '0', frozenCommission = '0', settledCommission = '0'
      commissions.forEach((c: { commissionAmount: unknown; status: string }) => {
        const amount = typeof c.commissionAmount === 'string' ? parseFloat(c.commissionAmount) : parseFloat(String(c.commissionAmount))
        if (c.status === 'frozen') frozenCommission = (parseFloat(frozenCommission) + amount).toFixed(2)
        else if (c.status === 'payable') payableCommission = (parseFloat(payableCommission) + amount).toFixed(2)
        else if (c.status === 'settled') settledCommission = (parseFloat(settledCommission) + amount).toFixed(2)
        if (['payable', 'settled', 'frozen'].includes(c.status)) {
          totalCommission = (parseFloat(totalCommission) + amount).toFixed(2)
        }
      })

      return {
        totalCommission,
        payableCommission,
        frozenCommission,
        settledCommission,
        totalOrders: orders,
        totalSalesAmount: '0',
      }
    },

    // Function: listPromotersWithStats
    // Description: 获取带统计数据的推广员列表（批量查询优化，固定 4 次 DB 调用）
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.limit(number): 限制数量
    //   params.cursor(string): 游标
    //   params.level(number): 等级筛选
    //   params.keyword(string): 关键词搜索
    //
    // Returns:
    //   { items: PromoterWithStats[]; nextCursor: string | null; totalCount: number }: 推广员列表和下一页游标
    async listPromotersWithStats(ctx: RepoContext, params: { limit: number; cursor?: string | null; level?: number | null; keyword?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_promoters_with_stats', limit: params.limit })

      const where: Record<string, unknown> = {}
      if (params.keyword) where.username = { contains: params.keyword }

      // Batch 1: 获取用户列表（含等级记录和等级信息）+ 总数
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: params.limit,
          include: {
            promoterLevelRecords: {
              where: { inactiveAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { level: true },
            },
          },
        }),
        prisma.user.count({ where }),
      ])

      const userIds = users.map((u: { id: string }) => u.id)

      const emptyLevel: PromoterLevel = {
        id: '',
        name: '',
        level: 0,
        commissionRate: '0',
        minSalesCount: 0,
        minSalesAmount: '0',
        description: null,
        createdAt: '',
        updatedAt: '',
      }

      if (userIds.length === 0) {
        return { items: [], nextCursor: null, totalCount }
      }

      // Batch 2: 批量获取佣金统计 + 订单数
      const [commissionAgg, orderAgg] = await Promise.all([
        prisma.commissionRecord.groupBy({
          by: ['promoterUserId', 'status'],
          where: { promoterUserId: { in: userIds } },
          _sum: { commissionAmount: true },
        }),
        prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { id: true },
        }),
      ])

      // 构建佣金统计 Map<userId, { total, payable, frozen, settled }>
      const commissionMap = new Map<string, { total: number; payable: number; frozen: number; settled: number }>()
      for (const row of commissionAgg) {
        const uid = row.promoterUserId
        const amount = row._sum.commissionAmount ? parseFloat(row._sum.commissionAmount.toString()) : 0
        const existing = commissionMap.get(uid) ?? { total: 0, payable: 0, frozen: 0, settled: 0 }

        if (['payable', 'settled', 'frozen'].includes(row.status)) {
          existing.total += amount
        }
        if (row.status === 'payable') existing.payable += amount
        else if (row.status === 'frozen') existing.frozen += amount
        else if (row.status === 'settled') existing.settled += amount

        commissionMap.set(uid, existing)
      }

      // 构建订单数 Map<userId, count>
      const orderMap = new Map<string, number>()
      for (const row of orderAgg) {
        orderMap.set(row.userId, row._count.id)
      }

      // 组装结果
      const items: PromoterWithStats[] = users.map((user: typeof users[number]) => {
        const stats = commissionMap.get(user.id) ?? { total: 0, payable: 0, frozen: 0, settled: 0 }
        const activeRecord = user.promoterLevelRecords[0]
        const level = activeRecord?.level ? mapLevel(activeRecord.level) : null

        return {
          totalCommission: stats.total.toFixed(2),
          payableCommission: stats.payable.toFixed(2),
          frozenCommission: stats.frozen.toFixed(2),
          settledCommission: stats.settled.toFixed(2),
          totalOrders: orderMap.get(user.id) ?? 0,
          totalSalesAmount: '0',
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          currentLevel: level ?? emptyLevel,
          subPromoterCount: 0,
          levelUpdatedAt: activeRecord?.effectiveAt?.toISOString() ?? user.createdAt.toISOString(),
          createdAt: user.createdAt.toISOString(),
        }
      })

      return { items, nextCursor: null, totalCount }
    },

    // Function: getSubPromoterCount
    // Description: 获取下级推广员数量
    //
    // Parameters:
    //   ctx(RepoContext): 仓库上下文
    //   params.promoterUserId(string): 推广员用户 ID
    //
    // Returns:
    //   number: 下级推广员数量
    async getSubPromoterCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_sub_promoter_count', promoterUserId: params.promoterUserId })

      return prisma.distributionRelation.count({ where: { promoterUserId: params.promoterUserId } })
    },
  }
}
