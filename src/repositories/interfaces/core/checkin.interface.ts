import type { RepoContext } from '@/types/repo/repo-context'

export interface CheckinRepository {
  /** 创建签到记录 */
  create(ctx: RepoContext, params: {
    userId: string
    date: Date
    reward?: Record<string, unknown> | null
  }): Promise<{ id: string; userId: string; date: Date; reward: Record<string, unknown> | null; createdAt: string }>

  /** 查找用户某天的签到记录 */
  findByUserAndDate(ctx: RepoContext, params: {
    userId: string
    date: Date
  }): Promise<{ id: string; userId: string; date: Date; reward: Record<string, unknown> | null; createdAt: string } | null>

  /** 按月查询签到历史 */
  findHistoryByMonth(ctx: RepoContext, params: {
    userId: string
    year: number
    month: number
  }): Promise<Array<{ id: string; date: Date }>>

  /** 获取用户签到统计 */
  getStats(ctx: RepoContext, params: {
    userId: string
  }): Promise<{
    id: string
    userId: string
    streakDays: number
    totalCheckins: number
    lastCheckinAt: string | null
    lastStreakDate: string | null
  } | null>

  /** 创建或更新用户签到统计 */
  upsertStats(ctx: RepoContext, params: {
    userId: string
    streakDays: number
    totalCheckins: number
    lastCheckinAt: Date
    lastStreakDate: Date
  }): Promise<{
    id: string
    userId: string
    streakDays: number
    totalCheckins: number
    lastCheckinAt: string | null
    lastStreakDate: string | null
  }>
}
