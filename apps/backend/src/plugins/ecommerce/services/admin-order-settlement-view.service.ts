import type { AdminOrderSettlementViewListResponse, AdminOrderSettlementViewQuery } from '@/plugins/ecommerce/contracts/order-settlement-view.dto'
import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
Function: createAdminOrderSettlementViewService

Description: 创建后台订单结算视图服务，用于结算管理页面的订单视图数据查询

Parameters:
    deps({ commissions: CommissionRepository }): 依赖注入的佣金仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 listOrderView 方法的服务对象
*/
export function createAdminOrderSettlementViewService(
  deps: {
    commissions: CommissionRepository
  },
  ctx: ServiceContext,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 查询订单结算视图列表
     */
    async listOrderView(
      params: AdminOrderSettlementViewQuery
    ): Promise<AdminOrderSettlementViewListResponse> {
      return await deps.commissions.listOrderSettlementView(repoCtx, {
        limit: params.limit,
        cursor: params.cursor ?? null,
        status: params.status ?? null,
        orderNo: params.orderNo ?? null,
        keyword: params.keyword ?? null,
      })
    },
  }
}
