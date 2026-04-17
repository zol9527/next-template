/**
 * Promoter Code Repository Interface
 * 推广员推广码仓储接口定义
 */

import type { RepoContext } from '@/types/repo/repo-context'
import type { PromoterCode } from '@/plugins/promotion/contracts/promoter-codes.dto'

/**
 * 推广员推广码仓储接口
 *
 * 定义推广码相关的数据访问方法
 */
export interface PromoterCodeRepository {
  getCodeByCode(ctx: RepoContext, params: { code: string }): Promise<PromoterCode | null>

  getCodeById(ctx: RepoContext, params: { id: string }): Promise<PromoterCode | null>

  listCodesByPromoterUserId(ctx: RepoContext, params: {
    promoterUserId: string
    limit: number
    cursor?: string | null
    status?: string | null
  }): Promise<{ items: PromoterCode[]; nextCursor: string | null }>

  createCode(ctx: RepoContext, params: {
    code: string
    promoterUserId: string
    type: string
    activeTo: string | null
    metadata?: Record<string, unknown>
  }): Promise<PromoterCode>

  updateCodeStatus(ctx: RepoContext, params: {
    id: string
    status: string
    updatedAt: string
  }): Promise<PromoterCode | null>

  deleteCode(ctx: RepoContext, params: { id: string }): Promise<void>

  incrementUsageCount(ctx: RepoContext, params: {
    id: string
    updatedAt: string
  }): Promise<PromoterCode | null>

  checkCodeExists(ctx: RepoContext, params: { code: string }): Promise<boolean>

  getActiveCodesCount(ctx: RepoContext, params: { promoterUserId: string }): Promise<number>

  getTotalCodesCount(ctx: RepoContext, params: { promoterUserId: string }): Promise<number>
}
