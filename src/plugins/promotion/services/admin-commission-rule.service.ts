import type {
  AdminCommissionRule,
  AdminCommissionRuleListResponse,
  CreateCommissionRuleRequest,
  UpdateCommissionRuleRequest,
} from '@/plugins/promotion/contracts/commission-rules.dto'
import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class AdminCommissionRuleServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'INTERNAL_ERROR'

  constructor(code: AdminCommissionRuleServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
Function: createAdminCommissionRuleService

Description: 创建后台佣金规则服务，提供佣金规则的 CRUD 操作

Parameters:
    deps({ commissions: CommissionRepository }): 依赖注入的佣金仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 listRules/createRule/updateRule/deleteRule 的服务对象
*/
export function createAdminCommissionRuleService(
  deps: { commissions: CommissionRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listRules(params?: { scope?: string | null; scopeId?: string | null }): Promise<AdminCommissionRuleListResponse> {
      const items = await deps.commissions.listCommissionRules(repoCtx, {
        scope: params?.scope,
        scopeId: params?.scopeId,
      })
      return { items }
    },

    async createRule(params: { rule: CreateCommissionRuleRequest; createdBy: string }): Promise<AdminCommissionRule> {
      const created = await deps.commissions.createCommissionRule(repoCtx, {
        scope: params.rule.scope,
        scopeId: params.rule.scopeId ?? null,
        rate: params.rule.rate,
        activeFrom: params.rule.activeFrom ?? new Date().toISOString(),
        activeTo: params.rule.activeTo ?? null,
      })

      logger.info({ action: 'admin_commission_rule.create', userId: params.createdBy, ruleId: created.id })
      return created
    },

    async updateRule(params: { id: string; rule: UpdateCommissionRuleRequest; updatedBy: string }): Promise<AdminCommissionRule> {
      const updated = await deps.commissions.updateCommissionRule(repoCtx, {
        id: params.id,
        rate: params.rule.rate,
        activeFrom: params.rule.activeFrom,
        activeTo: params.rule.activeTo,
        updatedAt: new Date().toISOString(),
      })

      if (!updated) {
        throw new AdminCommissionRuleServiceError('NOT_FOUND', 'Commission rule not found')
      }

      logger.info({ action: 'admin_commission_rule.update', userId: params.updatedBy, ruleId: params.id })
      return updated
    },

    async deleteRule(params: { id: string; deletedBy: string }): Promise<void> {
      await deps.commissions.deleteCommissionRule(repoCtx, { id: params.id })
      logger.info({ action: 'admin_commission_rule.delete', userId: params.deletedBy, ruleId: params.id })
    },
  }
}
