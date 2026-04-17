/**
 * Promoter Repository Interface
 * 推广员仓储接口定义
 */

import type { RepoContext } from '@/types/repo/repo-context'
import type { PromoterLevel, PromoterStats } from '@/plugins/promotion/contracts/promoter.dto'

/**
 * 推广员等级记录类型
 */
export type PromoterLevelRecord = {
  id: string
  userId: string
  promoterLevelId: string
  effectiveAt: string
  inactiveAt: string | null
  createdAt: string
}

/**
 * 推广员列表项类型（包含统计信息）
 */
export type PromoterWithStats = PromoterStats & {
  userId: string
  username: string | null
  avatarUrl: string | null
  currentLevel: PromoterLevel
  subPromoterCount: number
  levelUpdatedAt: string
  createdAt: string
}

/**
 * 推广员仓储接口
 *
 * 定义推广员相关的数据访问方法
 */
export interface PromoterRepository {
  // ==================== 用户信息 ====================

  getUserById(ctx: RepoContext, params: { userId: string }): Promise<{ username: string | null; avatarUrl: string | null } | null>

  // ==================== 等级配置 ====================

  getAllLevels(ctx: RepoContext): Promise<PromoterLevel[]>

  getLevelById(ctx: RepoContext, params: { levelId: string }): Promise<PromoterLevel | null>

  getLevelByNumber(ctx: RepoContext, params: { level: number }): Promise<PromoterLevel | null>

  updateLevel(ctx: RepoContext, params: {
    levelId: string
    commissionRate?: string
    minSalesAmount?: string
    minSalesCount?: number
    description?: string
  }): Promise<PromoterLevel>

  // ==================== 等级记录 ====================

  getCurrentLevelRecord(ctx: RepoContext, params: { userId: string }): Promise<PromoterLevelRecord | null>

  createLevelRecord(ctx: RepoContext, params: {
    userId: string
    promoterLevelId: string
    effectiveAt: string
  }): Promise<PromoterLevelRecord>

  deactivateCurrentLevelRecord(ctx: RepoContext, params: {
    userId: string
    inactiveAt: string
  }): Promise<boolean>

  // ==================== 推广员统计 ====================

  getPromoterStats(ctx: RepoContext, params: { userId: string }): Promise<PromoterStats>

  listPromotersWithStats(ctx: RepoContext, params: {
    limit: number
    cursor?: string | null
    level?: number | null
    keyword?: string | null
  }): Promise<{ items: PromoterWithStats[]; nextCursor: string | null; totalCount: number }>

  // ==================== 下级推广员 ====================

  getSubPromoterCount(ctx: RepoContext, params: { promoterUserId: string }): Promise<number>
}
