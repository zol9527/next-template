import type { CheckinRepository } from '@/repositories/interfaces/core/checkin.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import * as Prisma from '@/lib/prisma/generated/prisma'
import { prisma } from '@/lib/prisma'

// ============================================================================
// 转换辅助函数
// ============================================================================

/**
 * Function: transformCheckin
 *
 * Description: 将 Prisma Checkin 模型转换为签到记录 DTO
 *
 * Parameters:
 *   row: Prisma 返回的签到原始数据
 *
 * Returns:
 *   签到记录 DTO（日期字段转为 ISO 字符串）
 */
function transformCheckin(row: {
  id: string
  userId: string
  date: Date
  reward: unknown
  createdAt: Date
}) {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    reward: row.reward as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Function: transformStats
 *
 * Description: 将 Prisma UserCheckinStats 模型转换为签到统计 DTO
 *
 * Parameters:
 *   row: Prisma 返回的统计原始数据
 *
 * Returns:
 *   签到统计 DTO（日期字段转为 ISO 字符串）
 */
function transformStats(row: {
  id: string
  userId: string
  streakDays: number
  totalCheckins: number
  lastCheckinAt: Date | null
  lastStreakDate: Date | null
}) {
  return {
    id: row.id,
    userId: row.userId,
    streakDays: row.streakDays,
    totalCheckins: row.totalCheckins,
    lastCheckinAt: row.lastCheckinAt?.toISOString() ?? null,
    lastStreakDate: row.lastStreakDate?.toISOString() ?? null,
  }
}

// ============================================================================
// Repository 实现
// ============================================================================

/**
 * Function: createPrismaCheckinRepository
 *
 * Description: 创建基于 Prisma 的签到 Repository 实例
 *
 * Returns:
 *   CheckinRepository 接口的 Prisma 实现
 */
export function createPrismaCheckinRepository(): CheckinRepository {
  return {
    /**
     * 创建签到记录
     *
     * 写入一条新的签到数据到 checkins 表，
     * userId + date 存在唯一约束，由数据库层面保证幂等。
     */
    async create(
      ctx: RepoContext,
      params: {
        userId: string
        date: Date
        reward?: Record<string, unknown> | null
      }
    ) {
      ctx.logger.info(
        { userId: params.userId, date: params.date },
        'Creating checkin record'
      )

      const row = await prisma.checkin.create({
        data: {
          userId: params.userId,
          date: params.date,
          reward: params.reward
            ? (params.reward as Prisma.Prisma.InputJsonValue)
            : undefined,
        },
      })

      return transformCheckin(row)
    },

    /**
     * 查找用户某天的签到记录
     *
     * 利用 @@unique([userId, date]) 复合索引进行精确查找。
     */
    async findByUserAndDate(
      ctx: RepoContext,
      params: {
        userId: string
        date: Date
      }
    ) {
      ctx.logger.debug(
        { userId: params.userId, date: params.date },
        'Finding checkin by user and date'
      )

      const row = await prisma.checkin.findUnique({
        where: {
          userId_date: {
            userId: params.userId,
            date: params.date,
          },
        },
      })

      return row ? transformCheckin(row) : null
    },

    /**
     * 按月查询签到历史
     *
     * 返回指定年月内用户的所有签到记录（仅 id + date），
     * 使用 UTC 时间构造日期范围，避免时区偏差。
     */
    async findHistoryByMonth(
      ctx: RepoContext,
      params: {
        userId: string
        year: number
        month: number
      }
    ) {
      ctx.logger.debug(
        { userId: params.userId, year: params.year, month: params.month },
        'Finding checkin history by month'
      )

      // 使用 UTC 构造月份边界，避免时区问题
      const startDate = new Date(Date.UTC(params.year, params.month - 1, 1))
      const endDate = new Date(Date.UTC(params.year, params.month, 1))

      const rows = await prisma.checkin.findMany({
        where: {
          userId: params.userId,
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: { date: 'asc' },
        select: { id: true, date: true },
      })

      return rows
    },

    /**
     * 获取用户签到统计
     *
     * 从 user_checkin_stats 表读取累计签到天数、连续签到天数等信息。
     */
    async getStats(
      ctx: RepoContext,
      params: {
        userId: string
      }
    ) {
      ctx.logger.debug(
        { userId: params.userId },
        'Getting checkin stats'
      )

      const row = await prisma.userCheckinStats.findUnique({
        where: { userId: params.userId },
      })

      return row ? transformStats(row) : null
    },

    /**
     * 创建或更新用户签到统计
     *
     * 使用 upsert 保证幂等性：首次签到时创建记录，后续签到时更新。
     */
    async upsertStats(
      ctx: RepoContext,
      params: {
        userId: string
        streakDays: number
        totalCheckins: number
        lastCheckinAt: Date
        lastStreakDate: Date
      }
    ) {
      ctx.logger.info(
        {
          userId: params.userId,
          streakDays: params.streakDays,
          totalCheckins: params.totalCheckins,
        },
        'Upserting checkin stats'
      )

      const row = await prisma.userCheckinStats.upsert({
        where: { userId: params.userId },
        create: {
          userId: params.userId,
          streakDays: params.streakDays,
          totalCheckins: params.totalCheckins,
          lastCheckinAt: params.lastCheckinAt,
          lastStreakDate: params.lastStreakDate,
        },
        update: {
          streakDays: params.streakDays,
          totalCheckins: params.totalCheckins,
          lastCheckinAt: params.lastCheckinAt,
          lastStreakDate: params.lastStreakDate,
        },
      })

      return transformStats(row)
    },
  }
}
