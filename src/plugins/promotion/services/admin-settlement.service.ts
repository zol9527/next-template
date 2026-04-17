import type { AdminCreateSettlementResponse, AdminSettlement, AdminSettlementListResponse } from '@/plugins/promotion/contracts/settlements.dto'
import { env } from '@/config'
import {
	DecimalParseError,
	parseDecimalToScaledInt as parseDecimalToScaledIntBase,
	scaledIntToDecimalString as scaledIntToDecimalStringBase,
	type DecimalParseOptions,
} from '@/lib/utils/decimal'
import type { CommissionRecordDto, CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { SettlementRepository } from '@/plugins/promotion/repositories/interfaces/settlement.interface'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class AdminSettlementServiceError extends Error {
	public readonly code: 'INVALID_INPUT' | 'INVALID_STATE' | 'INTERNAL_ERROR' | 'NOT_FOUND'

	constructor(code: AdminSettlementServiceError['code'], message: string) {
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
				throw new AdminSettlementServiceError('INVALID_STATE', 'Invalid amount')
			}
			throw new AdminSettlementServiceError('INVALID_INPUT', error.message)
		}

		throw error
	}
}

function scaledIntToDecimalString(scaled: bigint, scale: number): string {
	try {
		return scaledIntToDecimalStringBase(scaled, scale)
	} catch (error: unknown) {
		if (error instanceof DecimalParseError) {
			throw new AdminSettlementServiceError('INVALID_INPUT', error.message)
		}
		throw error
	}
}

function toFen(amount: string, allowZero = false): bigint {
	return parseDecimalToScaledInt(amount, { scale: 2, allowZero })
}

function mapAdminSettlement(record: AdminSettlement): AdminSettlement {
	return {
		id: record.id,
		status: record.status,
		totalAmount: record.totalAmount,
		currencyCode: record.currencyCode,
		createdBy: record.createdBy,
		createdAt: record.createdAt,
		processedAt: record.processedAt,
		updatedAt: record.updatedAt,
	}
}

function assertAllPayable(records: CommissionRecordDto[]): void {
	const notPayable = records.find((r) => r.status !== 'payable' || r.settlementId)
	if (notPayable) {
		throw new AdminSettlementServiceError('INVALID_STATE', 'Some commissions are not payable or already settled')
	}
}

/**
Function: createAdminSettlementService

Description: 创建后台结算服务，负责将可结算佣金写入结算单并标记为已结算；通过唯一约束与条件更新避免重复结算

Parameters:
		deps({ commissions: CommissionRepository, settlements: SettlementRepository }): 依赖注入的佣金/结算仓储
		ctx(ServiceContext): Service 上下文

Returns:
		service(object): 提供 createSettlement/listSettlements/getSettlementDetail 的服务对象
*/
export function createAdminSettlementService(
	deps: { commissions: CommissionRepository; settlements: SettlementRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		async getSettlementById(id: string): Promise<AdminSettlement | null> {
			return await deps.settlements.getSettlementById(repoCtx, { settlementId: id })
		},

		async getSettlementCommissions(id: string): Promise<AdminCommissionRecord[]> {
			return await deps.settlements.getSettlementCommissions(repoCtx, { settlementId: id })
		},

		async listSettlements(params: {
			limit: number
			cursor?: string | null
			status?: string | null
			settlementId?: string | null
			promoterUserId?: string
		}): Promise<AdminSettlementListResponse> {
			let settlementIds: string[] | undefined

			if (params.promoterUserId) {
				settlementIds = await deps.commissions.getDistinctSettlementIdsByPromoter(repoCtx, {
					promoterUserId: params.promoterUserId,
				})
				if (settlementIds.length === 0) {
					return { items: [], nextCursor: null }
				}
			}

			const page = await deps.settlements.listSettlements(repoCtx, {
				limit: params.limit,
				cursor: params.cursor,
				status: params.status,
				settlementId: params.settlementId,
				settlementIds,
			})
			return { items: page.items.map(mapAdminSettlement), nextCursor: page.nextCursor }
		},

		async getSettlementDetail(id: string): Promise<{ settlement: AdminSettlement; commissions: AdminCommissionRecord[] }> {
			const settlement = await deps.settlements.getSettlementById(repoCtx, { settlementId: id })
			if (!settlement) throw new AdminSettlementServiceError('NOT_FOUND', 'Settlement not found')

			const commissions = await deps.settlements.getSettlementCommissions(repoCtx, { settlementId: id })

			return {
				settlement: mapAdminSettlement(settlement),
				commissions,
			}
		},

		async createSettlement(params: { commissionRecordIds: string[]; createdBy: string }): Promise<AdminCreateSettlementResponse> {
			const uniqueIds = Array.from(new Set(params.commissionRecordIds)).filter(Boolean)
			if (uniqueIds.length === 0) {
				throw new AdminSettlementServiceError('INVALID_INPUT', 'commissionRecordIds is required')
			}

			const records = await deps.commissions.getCommissionRecordsByIds(repoCtx, { commissionRecordIds: uniqueIds })
			if (records.length !== uniqueIds.length) {
				throw new AdminSettlementServiceError('INVALID_INPUT', 'Some commission records not found')
			}

			assertAllPayable(records)

			const totalFen = records.reduce((sum, r) => sum + toFen(r.commissionAmount), BigInt(0))
			const totalAmount = scaledIntToDecimalString(totalFen, 2)
			const currencyCode = env.SITE_CURRENCY_CODE

			const nowIso = new Date().toISOString()
			const settlement = await deps.settlements.createSettlement(repoCtx, {
				status: 'pending',
				totalAmount,
				currencyCode,
				createdBy: params.createdBy,
			})

			try {
				await deps.settlements.addSettlementItems(repoCtx, { settlementId: settlement.id, commissionRecordIds: uniqueIds })
			} catch (error: unknown) {
				const e = error as { code?: unknown }
				if (e.code === '23505') {
					await deps.settlements.setSettlementStatus(repoCtx, { settlementId: settlement.id, status: 'failed', updatedAt: nowIso })
					throw new AdminSettlementServiceError('INVALID_STATE', 'Some commissions are already settled')
				}

				await deps.settlements.setSettlementStatus(repoCtx, { settlementId: settlement.id, status: 'failed', updatedAt: nowIso })
				throw error
			}

			const updated = await deps.commissions.attachSettlementAndMarkSettled(repoCtx, {
				commissionRecordIds: uniqueIds,
				settlementId: settlement.id,
				updatedAt: nowIso,
			})

			if (updated.length !== uniqueIds.length) {
				await deps.settlements.setSettlementStatus(repoCtx, { settlementId: settlement.id, status: 'failed', updatedAt: nowIso })
				throw new AdminSettlementServiceError('INVALID_STATE', 'Settlement conflict')
			}

			const finalized = await deps.settlements.setSettlementStatus(repoCtx, {
				settlementId: settlement.id,
				status: 'processed',
				processedAt: nowIso,
				updatedAt: nowIso,
			})

			if (!finalized) {
				throw new AdminSettlementServiceError('INTERNAL_ERROR', 'Settlement not found')
			}

			logger.info({
				action: 'admin_settlement.create',
				userId: params.createdBy,
				settlementId: finalized.id,
				commissionCount: uniqueIds.length,
				totalAmount: finalized.totalAmount,
				currencyCode: finalized.currencyCode,
			})

			return { settlement: mapAdminSettlement(finalized) }
		},
	}
}
