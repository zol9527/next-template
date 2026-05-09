/**
 * 管理端签到统计服务
 *
 * 提供签到数据的聚合查询能力，用于管理后台仪表盘展示。
 * 直接使用 prisma client 进行聚合查询，因为这些统计操作
 * 不属于用户级 CRUD，而是面向管理端的报表类查询。
 *
 * 决策参考：
 * - D12: 统计数据使用独立模型 UserCheckinStats
 * - 时区：UTC+8 硬编码（决策 D8）
 */

import { prisma } from '@/lib/prisma'
import { getTodayInTimezone } from '@/lib/utils/checkin'
import type { ServiceContext } from '@/types/service/service-context'
import type { CheckinStats } from '@/contracts/dtos/admin-checkin.dto'

/**
 * 创建管理端签到统计服务
 *
 * @param _deps - 依赖注入（当前无 repo 依赖，聚合查询直接走 prisma）
 * @param ctx - Service 层执行上下文
 */
export function createAdminCheckinStatsService(
  _deps: Record<string, never>,
  ctx: ServiceContext
) {
  const { logger } = ctx

  return {
    /**
     * 获取签到统计概览
     *
     * 包含：今日签到人数、活跃连续签到用户数、累计签到用户数、7 日趋势
     *
     * @returns CheckinStats - 签到统计数据
     */
    async getCheckinStats(): Promise<CheckinStats> {
      logger.info('Fetching admin checkin stats')

      const today = getTodayInTimezone()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

      const [todayCount, activeStreakUsers, totalCheckinUsers] = await Promise.all([
        prisma.checkin.count({ where: { date: today } }),
        prisma.userCheckinStats.count({
          where: {
            streakDays: { gt: 0 },
            lastStreakDate: { gte: yesterday },
          },
        }),
        prisma.userCheckinStats.count({
          where: { totalCheckins: { gt: 0 } },
        }),
      ])

      const trend = await this.getTrend(today, 7)

      logger.info(
        { todayCount, activeStreakUsers, totalCheckinUsers },
        'Admin checkin stats fetched'
      )

      return {
        todayCount,
        activeStreakUsers,
        totalCheckinUsers,
        trend,
      }
    },

    /**
     * 获取指定天数内的签到趋势
     *
     * @param baseDate - 基准日期（通常为今天）
     * @param days - 天数（包含基准日期）
     * @returns 按日期聚合的签到人数数组
     */
    async getTrend(
      baseDate: Date,
      days: number
    ): Promise<Array<{ date: string; count: number }>> {
      const trend: Array<{ date: string; count: number }> = []

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000)
        const count = await prisma.checkin.count({ where: { date } })

        trend.push({
          date: formatDate(date),
          count,
        })
      }

      return trend
    },
  }
}

/**
 * 将 Date 格式化为 YYYY-MM-DD 字符串
 *
 * @param date - 日期对象
 * @returns 格式化后的日期字符串
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
