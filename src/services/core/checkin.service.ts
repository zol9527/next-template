import type { CheckinRepository } from '@/repositories/interfaces/core/checkin.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { CheckinStatus, CheckinResponse, CheckinHistory } from '@/contracts/dtos/checkin.dto'
import { getTodayInTimezone, calculateNewStreak, parseMonth } from '@/lib/utils/checkin'

// ======================== 错误定义 ========================

/** 签到业务错误码 */
type CheckinErrorCode = 'ALREADY_CHECKED_IN' | 'INVALID_MONTH' | 'INTERNAL_ERROR'

/**
 * 签到业务异常
 *
 * 用于在 service 层抛出可辨识的业务错误，
 * API 层根据 code 映射为对应的 HTTP 状态码。
 */
export class CheckinError extends Error {
  public readonly code: CheckinErrorCode

  constructor(code: CheckinErrorCode, message: string) {
    super(message)
    this.name = 'CheckinError'
    this.code = code
  }
}

/**
 * 判断是否为 Prisma 唯一约束违反错误 (P2002)
 *
 * 用于处理并发签到时 DB 层面的幂等保护：
 * 即使 service 层的 pre-check 通过，两个并发请求可能同时到达 create，
 * 此时 DB 的 unique constraint 会拒绝第二个写入。
 */
function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; meta?: { target?: string[] } }
  return e.code === 'P2002'
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 *
 * 日期对象已归一化为 midnight UTC（代表北京时间的那一天），
 * 因此可以直接使用 UTC 方法提取年月日。
 */
function formatDateToISO(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ======================== Service 工厂 ========================

/**
 * 创建签到 Service
 *
 * @param deps - 依赖注入（checkin repository）
 * @param ctx  - Service 层上下文（traceId, logger）
 *
 * 遵循项目工厂函数 + DI 模式：
 * - 表现层 → 接口层 → 契约层 → 业务层(service) → 数据层(repo)
 * - service 通过 repository 接口访问数据，不直接导入 Prisma
 */
export function createCheckinService(
  deps: {
    checkin: CheckinRepository
  },
  ctx: ServiceContext
) {
  const { logger } = ctx

  // 构建 repo 层上下文：传播 traceId，logger 标记 layer: 'repository'
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 执行每日签到
     *
     * 流程：
     * 1. 获取北京时间今天的日期
     * 2. 检查是否已签到（pre-check）
     * 3. 获取当前统计信息
     * 4. 计算新的连续签到天数
     * 5. 创建签到记录 + 更新统计
     *
     * 并发安全：service pre-check + DB unique constraint 双重保护
     */
    async checkin(userId: string): Promise<CheckinResponse> {
      const today = getTodayInTimezone()

      // ---- 1. 预检查：今日是否已签到 ----
      const existing = await deps.checkin.findByUserAndDate(repoCtx, { userId, date: today })
      if (existing) {
        logger.info({ userId }, '用户今日已签到（pre-check 命中）')
        throw new CheckinError('ALREADY_CHECKED_IN', '今日已签到')
      }

      // ---- 2. 获取当前统计 ----
      const stats = await deps.checkin.getStats(repoCtx, { userId })

      // ---- 3. 计算新的连续签到天数 ----
      const newStreak = calculateNewStreak(
        stats?.streakDays ?? 0,
        stats?.lastCheckinAt ? new Date(stats.lastCheckinAt) : null,
        today
      )

      // ---- 4. 创建签到记录（带并发兜底） ----
      try {
        await deps.checkin.create(repoCtx, {
          userId,
          date: today,
          reward: null,
        })
      } catch (error) {
        // 并发场景：pre-check 通过但 DB 唯一约束拒绝 → 视为已签到
        if (isUniqueConstraintError(error)) {
          logger.info({ userId }, '并发签到被 DB 唯一约束拦截')
          throw new CheckinError('ALREADY_CHECKED_IN', '今日已签到')
        }
        throw error
      }

      // ---- 5. 更新统计 ----
      await deps.checkin.upsertStats(repoCtx, {
        userId,
        streakDays: newStreak,
        totalCheckins: (stats?.totalCheckins ?? 0) + 1,
        lastCheckinAt: today,
        lastStreakDate: today,
      })

      logger.info({ userId, streakDays: newStreak }, '签到成功')

      return {
        success: true,
        streakDays: newStreak,
        reward: null,
      }
    },

    /**
     * 获取签到状态
     *
     * 返回：今日是否已签到、连续天数、累计天数、上次签到日期
     */
    async getStatus(userId: string): Promise<CheckinStatus> {
      const today = getTodayInTimezone()

      // 并行查询今日记录和统计信息
      const [todayCheckin, stats] = await Promise.all([
        deps.checkin.findByUserAndDate(repoCtx, { userId, date: today }),
        deps.checkin.getStats(repoCtx, { userId }),
      ])

      return {
        todayCheckedIn: !!todayCheckin,
        streakDays: stats?.streakDays ?? 0,
        totalDays: stats?.totalCheckins ?? 0,
        lastCheckinDate: stats?.lastCheckinAt ?? null,
      }
    },

    /**
     * 获取月度签到历史
     *
     * @param userId - 用户 ID
     * @param month  - 月份字符串，格式 YYYY-MM
     *
     * 返回该月所有已签到的日期列表（YYYY-MM-DD 格式）
     */
    async getHistory(userId: string, month: string): Promise<CheckinHistory> {
      // 解析并校验月份格式
      const parsed = parseMonth(month)
      if (!parsed) {
        throw new CheckinError('INVALID_MONTH', '无效的月份格式，请使用 YYYY-MM')
      }

      const items = await deps.checkin.findHistoryByMonth(repoCtx, {
        userId,
        year: parsed.year,
        month: parsed.month,
      })

      // 将 Date 对象格式化为 YYYY-MM-DD 字符串
      const days = items.map((item) => formatDateToISO(item.date))

      return { month, days }
    },
  }
}
