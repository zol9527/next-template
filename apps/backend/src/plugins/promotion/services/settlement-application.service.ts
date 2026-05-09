import type {
  AdminSettlementApplication,
  AdminSettlementApplicationListQuery,
  AdminSettlementApplicationListResponse,
  ReviewSettlementApplicationRequest,
} from '@/plugins/promotion/contracts/settlement-applications.dto'
import type { ApplySettlementRequest } from '@/plugins/promotion/contracts/distribution.dto'
import type { SettlementApplicationRepository } from '@/plugins/promotion/repositories/interfaces/settlement-application.interface'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class SettlementApplicationServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'INTERNAL_ERROR' | 'INSUFFICIENT_BALANCE'

  constructor(code: SettlementApplicationServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

function mapAdminSettlementApplication(record: AdminSettlementApplication): AdminSettlementApplication {
  return {
    ...record,
  }
}

/**
Function: createSettlementApplicationService

Description: 创建结算申请服务，负责推广员发起提现申请与管理员审核申请

Parameters:
    deps({ applications: SettlementApplicationRepository, settings: SystemSettingsRepository, commissions: CommissionRepository, settlementService: ReturnType<typeof createAdminSettlementService> }): 依赖注入的申请仓储、系统设置、佣金仓储与结算服务
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 apply/listApplications/reviewApplication 的服务对象
*/
export function createSettlementApplicationService(
  deps: {
    applications: SettlementApplicationRepository
    settings: SystemSettingsRepository
    commissions: CommissionRepository
    settlementService: ReturnType<typeof createAdminSettlementService>
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async apply(params: { userId: string; request: ApplySettlementRequest }): Promise<AdminSettlementApplication> {
      // 1. 检查最低提现金额
      const minAmount = await deps.settings.getSetting<string>(repoCtx, { key: 'min_withdrawal_amount' })
      if (minAmount && Number(params.request.amount) < Number(minAmount)) {
        throw new SettlementApplicationServiceError('INVALID_STATE', `最低提现金额为 ${minAmount} 元`)
      }

      // 2. 检查可用余额 (payable 状态的佣金总额 — SUM 聚合避免加载所有记录)
      const totalPayable = await deps.commissions.sumPayableCommissions(repoCtx, {
        promoterUserId: params.userId,
      })
      if (Number(totalPayable) < Number(params.request.amount)) {
        throw new SettlementApplicationServiceError('INSUFFICIENT_BALANCE', '可用余额不足')
      }

      // 3. 创建申请
      const created = await deps.applications.createApplication(repoCtx, {
        promoterUserId: params.userId,
        amount: params.request.amount,
        paymentMethod: params.request.paymentMethod,
        paymentAccount: params.request.paymentAccount ?? null,
      })

      logger.info({ action: 'settlement_application.apply', userId: params.userId, amount: params.request.amount })
      return mapAdminSettlementApplication(created)
    },

    async listApplications(params: AdminSettlementApplicationListQuery & { promoterUserId?: string }): Promise<AdminSettlementApplicationListResponse> {
      const page = await deps.applications.listApplications(repoCtx, params)
      return {
        items: page.items.map(mapAdminSettlementApplication),
        nextCursor: page.nextCursor,
        totalCount: page.items.length,
      }
    },

    async reviewApplication(params: { id: string; review: ReviewSettlementApplicationRequest; reviewedBy: string }): Promise<AdminSettlementApplication> {
      const application = await deps.applications.getApplicationById(repoCtx, { id: params.id })
      if (!application) throw new SettlementApplicationServiceError('NOT_FOUND', 'Application not found')
      if (application.status !== 'pending') throw new SettlementApplicationServiceError('INVALID_STATE', 'Application is not pending')

      if (params.review.action === 'reject') {
        const updated = await deps.applications.updateApplicationStatus(repoCtx, {
          id: params.id,
          status: 'rejected',
          reviewerId: params.reviewedBy,
          rejectionReason: params.review.rejectionReason,
          updatedAt: new Date().toISOString(),
        })
        logger.info({ action: 'settlement_application.reject', userId: params.reviewedBy, applicationId: params.id })
        return mapAdminSettlementApplication(updated!)
      }

      // 批准申请：自动创建结算单（仅查询 ID 列表，避免加载完整记录）
      const commissionIds = await deps.commissions.getPayableCommissionIdsByPromoter(repoCtx, {
        promoterUserId: application.promoterUserId,
      })
      if (commissionIds.length === 0) {
         throw new SettlementApplicationServiceError('INVALID_STATE', 'No payable commissions found for this promoter')
      }

      const settlement = await deps.settlementService.createSettlement({
        commissionRecordIds: commissionIds,
        createdBy: params.reviewedBy,
      })

      // 使用类型断言调用 updateApplicationStatus
      const updateFn = deps.applications.updateApplicationStatus as (ctx: RepoContext, params: { id: string; status: string; reviewerId?: string | null; settlementId?: string | null; updatedAt: string }) => Promise<AdminSettlementApplication | null>
      const updated = await updateFn(repoCtx, {
        id: params.id,
        status: 'approved',
        reviewerId: params.reviewedBy,
        settlementId: settlement.settlement.id ?? null,
        updatedAt: new Date().toISOString(),
      })

      logger.info({ action: 'settlement_application.approve', userId: params.reviewedBy, applicationId: params.id, settlementId: settlement.settlement.id })
      return mapAdminSettlementApplication(updated!)
    },
  }
}
