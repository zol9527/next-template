import type { AdminCommissionListResponse, AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'
import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'
import {
  DecimalParseError,
  parseDecimalToScaledInt as parseDecimalToScaledIntBase,
  scaledIntToDecimalString as scaledIntToDecimalStringBase,
  type DecimalParseOptions,
} from '@/lib/utils/decimal'
import type { CommissionRepository, CommissionRecordDto } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { PromoterRepository } from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class CommissionServiceError extends Error {
  public readonly code: 'INVALID_STATE' | 'INTERNAL_ERROR'

  constructor(code: CommissionServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

function parseDecimalToScaledInt(value: string, options: DecimalParseOptions): bigint {
  try {
    return parseDecimalToScaledIntBase(value, options)
  } catch (error: unknown) {
    if (error instanceof DecimalParseError) {
      if (error.code === 'INVALID_AMOUNT') {
        throw new CommissionServiceError('INVALID_STATE', 'Invalid amount')
      }
      throw new CommissionServiceError('INTERNAL_ERROR', error.message)
    }

    throw error
  }
}

function scaledIntToDecimalString(scaled: bigint, scale: number): string {
  try {
    return scaledIntToDecimalStringBase(scaled, scale)
  } catch (error: unknown) {
    if (error instanceof DecimalParseError) {
      throw new CommissionServiceError('INTERNAL_ERROR', error.message)
    }
    throw error
  }
}

function toFen(amount: string, allowZero = false): bigint {
  return parseDecimalToScaledInt(amount, { scale: 2, allowZero })
}

function computeCommissionFromFen(baseFen: bigint, rate: string): { baseAmount: string; commissionAmount: string } {
  const rateScaled = parseDecimalToScaledInt(rate, { scale: 6, allowZero: true })
  const oneScaled = BigInt(10) ** BigInt(6)

  if (rateScaled < BigInt(0) || rateScaled > oneScaled) {
    throw new CommissionServiceError('INVALID_STATE', 'Invalid commission rate')
  }

  const commissionFen = (baseFen * rateScaled) / oneScaled

  return {
    baseAmount: scaledIntToDecimalString(baseFen, 2),
    commissionAmount: scaledIntToDecimalString(commissionFen, 2),
  }
}

/**
Function: createCommissionService

Description: 创建佣金服务，负责支付成功后的冻结佣金生成与后台佣金查询（不直接访问数据库）

Parameters:
    deps({ commissions: CommissionRepository, distributions: DistributionRepository, promoters: PromoterRepository }): 依赖注入的佣金/分销/推广员仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 createFrozenCommissionForPaidOrder/listAdminCommissionRecords 等方法的服务对象
*/
export function createCommissionService(
  deps: {
    commissions: CommissionRepository
    distributions: DistributionRepository
    promoters: PromoterRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async getCommissionsByOrderId(orderId: string): Promise<AdminCommissionRecord[]> {
      const result = await deps.commissions.listCommissionRecords(repoCtx, { limit: 50, orderId })
      return result.items
    },

    async adjustCommissionForRefund(params: { orderId: string; refundAmount: string }): Promise<void> {
      const records = await deps.commissions.listCommissionRecords(repoCtx, { limit: 50, orderId: params.orderId })

      for (const record of records.items) {
        // 只有 frozen 或 payable 状态的佣金可以调账
        if (record.status !== 'frozen' && record.status !== 'payable') {
          continue
        }

        const refundFen = toFen(params.refundAmount)
        const oldBaseFen = toFen(record.baseAmount)
        const newBaseFen = oldBaseFen - refundFen
        const nowIso = new Date().toISOString()

        if (newBaseFen < BigInt(0)) {
          // 如果退款金额超过了基数（理论上不应该发生，因为 AdminOrderService 做了校验）
          // 则将佣金作废
          await deps.commissions.updateCommissionRecord(repoCtx, {
            id: record.id,
            baseAmount: undefined,
            commissionAmount: undefined,
            status: 'voided',
            updatedAt: nowIso,
          })
          continue
        }

        const { commissionAmount: newCommissionAmount } = computeCommissionFromFen(newBaseFen, record.rate)

        if (toFen(newCommissionAmount, true) === BigInt(0)) {
          await deps.commissions.updateCommissionRecord(repoCtx, {
            id: record.id,
            baseAmount: undefined,
            commissionAmount: undefined,
            status: 'voided',
            updatedAt: nowIso,
          })
        } else {
          await deps.commissions.updateCommissionRecord(repoCtx, {
            id: record.id,
            baseAmount: scaledIntToDecimalString(newBaseFen, 2),
            commissionAmount: newCommissionAmount,
            status: undefined,
            updatedAt: nowIso,
          })
        }
      }

      logger.info({ action: 'commission.adjust_for_refund', orderId: params.orderId, refundAmount: params.refundAmount })
    },

    async createFrozenCommissionForPaidOrder(params: {
      order: {
        id: string
        user_id: string
        price_amount: string
        paid_amount: string | null
        refunded_amount: string
      }
      paidAtIso: string
    }): Promise<CommissionRecordDto | null> {
      const relation = await deps.distributions.getRelationByUserId(repoCtx, { userId: params.order.user_id })
      if (!relation) {
        logger.info({ action: 'commission.skip.no_relation', orderId: params.order.id, userId: params.order.user_id })
        return null
      }

      // 优先使用推广员等级费率
      let rate: string | undefined
      let rateSource: 'promoter_level' | 'global_rule' | undefined
      let promoterLevel: PromoterLevel | null = null

      try {
        const levelRecord = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId: relation.promoterUserId })

        if (levelRecord) {
          const level = await deps.promoters.getLevelById(repoCtx, { levelId: levelRecord.promoterLevelId })

          // 验证等级在支付时间已生效且未过期
          if (level && levelRecord.effectiveAt <= params.paidAtIso) {
            if (!levelRecord.inactiveAt || levelRecord.inactiveAt > params.paidAtIso) {
              promoterLevel = level
              rate = level.commissionRate
              rateSource = 'promoter_level'
            } else {
              logger.info({
                action: 'commission.level_expired',
                orderId: params.order.id,
                promoterUserId: relation.promoterUserId,
                levelId: levelRecord.promoterLevelId,
                inactiveAt: levelRecord.inactiveAt,
              })
            }
          } else if (level) {
            logger.info({
              action: 'commission.level_future',
              orderId: params.order.id,
              promoterUserId: relation.promoterUserId,
              levelId: levelRecord.promoterLevelId,
              effectiveAt: levelRecord.effectiveAt,
            })
          }
        }
      } catch (error: unknown) {
        const e = error as { message?: string; code?: string }
        logger.warn({
          action: 'commission.promoter_level_check_failed',
          orderId: params.order.id,
          promoterUserId: relation.promoterUserId,
          error: e.message ?? 'Unknown error',
          code: e.code,
        })
      }

      // 回退到全局规则
      if (rate === undefined) {
        const rule = await deps.commissions.getActiveGlobalRule(repoCtx, { nowIso: params.paidAtIso })
        if (!rule) {
          logger.warn({ action: 'commission.skip.no_rule', orderId: params.order.id })
          return null
        }
        rate = rule.rate
        rateSource = 'global_rule'
      }

      const paid = params.order.paid_amount ?? params.order.price_amount
      const baseFen = toFen(paid, true) - toFen(params.order.refunded_amount, true)
      if (baseFen <= BigInt(0)) {
        logger.info({ action: 'commission.skip.zero_base', orderId: params.order.id })
        return null
      }

      const existing = await deps.commissions.getCommissionByOrderAndPromoter(repoCtx, {
        orderId: params.order.id,
        promoterUserId: relation.promoterUserId,
      })
      if (existing) {
        logger.info({ action: 'commission.idempotent', orderId: params.order.id, commissionRecordId: existing.id })
        return existing
      }

      const amounts = computeCommissionFromFen(baseFen, rate)

      try {
        const created = await deps.commissions.createCommissionRecord(repoCtx, {
          orderId: params.order.id,
          promoterUserId: relation.promoterUserId,
          baseAmount: amounts.baseAmount,
          rate: rate,
          commissionAmount: amounts.commissionAmount,
          status: 'frozen',
          rateSource: rateSource,
        })

        logger.info({
          action: 'commission.create',
          orderId: params.order.id,
          promoterUserId: relation.promoterUserId,
          commissionRecordId: created.id,
          rateSource: rateSource,
          rate: rate,
          levelName: promoterLevel?.name,
          levelNumber: promoterLevel?.level,
        })

        return created
      } catch (error: unknown) {
        const e = error as { code?: unknown }
        if (e.code === '23505') {
          const reread = await deps.commissions.getCommissionByOrderAndPromoter(repoCtx, {
            orderId: params.order.id,
            promoterUserId: relation.promoterUserId,
          })
          if (reread) return reread
        }

        throw error
      }
    },

    async listAdminCommissionRecords(params: {
      limit: number
      cursor?: string | null
      status?: string | null
      promoterUserId?: string | null
      orderNo?: string | null
      keyword?: string | null
    }): Promise<AdminCommissionListResponse> {
      return await deps.commissions.listCommissionRecords(repoCtx, params)
    },

    async markCommissionPayableForCompletedOrder(params: {
      orderId: string
      completedAtIso: string
    }): Promise<CommissionRecordDto | null> {
      const existing = await deps.commissions.getCommissionByOrderId(repoCtx, { orderId: params.orderId })
      if (!existing) return null

      if (existing.status === 'payable' || existing.status === 'settled') return existing
      if (existing.settlementId) return existing

      if (existing.status !== 'frozen') {
        throw new CommissionServiceError('INVALID_STATE', 'Commission is not eligible to become payable')
      }

      const updated = await deps.commissions.updateCommissionStatus(repoCtx, {
        commissionRecordId: existing.id,
        status: 'payable',
        settlementId: undefined,
        updatedAt: params.completedAtIso,
      })

      if (!updated) {
        throw new CommissionServiceError('INTERNAL_ERROR', 'Commission record not found')
      }

      logger.info({ action: 'commission.mark_payable', orderId: params.orderId, commissionRecordId: updated.id })

      // 触发推广员等级自动升级检查
      try {
        const { createPromoterLevelService } = await import('@/plugins/promotion/services/promoter-level.service')
        const promoterLevelService = createPromoterLevelService({ promoters: deps.promoters }, ctx)

        const newLevel = await promoterLevelService.checkAndUpgradeLevel(existing.promoterUserId)
        if (newLevel) {
          logger.info({
            action: 'commission.promoter_level_upgraded',
            orderId: params.orderId,
            promoterUserId: existing.promoterUserId,
            newLevelId: newLevel.id,
            newLevelName: newLevel.name,
            newLevelNumber: newLevel.level,
          })
        }
      } catch (error: unknown) {
        // 等级升级失败不影响佣金标记为 payable
        const e = error as { message?: string; code?: string }
        logger.warn({
          action: 'commission.promoter_level_upgrade_failed',
          orderId: params.orderId,
          promoterUserId: existing.promoterUserId,
          error: e.message ?? 'Unknown error',
          code: e.code,
        })
      }

      return updated
    },
  }
}
