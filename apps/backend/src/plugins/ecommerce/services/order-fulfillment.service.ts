import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

function toIso(date: Date): string {
	return date.toISOString()
}

function computeBackoffSeconds(attemptCount: number): number {
	const safeAttempt = Math.max(1, Math.min(attemptCount, 20))
	const baseSeconds = 5
	const seconds = baseSeconds * 2 ** (safeAttempt - 1)
	return Math.min(seconds, 5 * 60)
}

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message
	try {
		return JSON.stringify(error)
	} catch {
		return String(error)
	}
}

/**
Function: createOrderFulfillmentService

Description: 创建订单履约服务，负责轮询到期履约任务并通过数据库 RPC 原子执行“佣金 + 权益发放”，失败自动退避重试（最多 5 次）

Parameters:
		deps({ jobs: OrderFulfillmentJobRepository }): 依赖注入的履约任务仓储
		ctx(ServiceContext): Service 上下文

Returns:
		service(object): 提供 runDueJobs 等方法的服务对象
*/
export function createOrderFulfillmentService(
	deps: { jobs: OrderFulfillmentJobRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	const maxRetries = 5

	return {
		async runDueJobs(params: { limit?: number } = {}): Promise<{
			processed: number
			succeeded: number
			retrying: number
			manualRequired: number
			skipped: number
		}> {
			const startedAt = Date.now()
			const nowIso = toIso(new Date())
			const limit = Math.max(1, Math.min(params.limit ?? 20, 50))

			const due = await deps.jobs.listDueJobs(repoCtx, { limit, nowIso })

			let processed = 0
			let succeeded = 0
			let retrying = 0
			let manualRequired = 0
			let skipped = 0

			for (const job of due) {
				const claimed = await deps.jobs.tryMarkProcessing(repoCtx, { jobId: job.id, nowIso })
				if (!claimed) {
					skipped += 1
					continue
				}

				processed += 1
				const applyStartedAt = Date.now()

				try {
					const rpcResult = await deps.jobs.applyFulfillment(repoCtx, { orderId: claimed.orderId, paymentId: claimed.paymentId })

					await deps.jobs.markSucceeded(repoCtx, { jobId: claimed.id, nowIso })
					succeeded += 1

					logger.info({
						action: 'order_fulfillment_apply',
						jobId: claimed.id,
						orderId: claimed.orderId,
						paymentId: claimed.paymentId,
						attemptCount: claimed.attemptCount,
						durationMs: Date.now() - applyStartedAt,
						rpcResult,
					})
				} catch (error: unknown) {
					const lastError = stringifyError(error)
					const attemptCount = claimed.attemptCount

					if (attemptCount >= maxRetries) {
						await deps.jobs.markManualRequired(repoCtx, { jobId: claimed.id, nowIso, lastError })
						manualRequired += 1

						logger.error({
							action: 'order_fulfillment_manual_required',
							jobId: claimed.id,
							orderId: claimed.orderId,
							paymentId: claimed.paymentId,
							attemptCount,
							durationMs: Date.now() - applyStartedAt,
							lastError,
						})

						continue
					}

					const delaySeconds = computeBackoffSeconds(attemptCount)
					const nextAvailableAtIso = toIso(new Date(Date.now() + delaySeconds * 1000))

					await deps.jobs.markRetrying(repoCtx, { jobId: claimed.id, nowIso, nextAvailableAtIso, lastError })
					retrying += 1

					logger.warn({
						action: 'order_fulfillment_retrying',
						jobId: claimed.id,
						orderId: claimed.orderId,
						paymentId: claimed.paymentId,
						attemptCount,
						delaySeconds,
						nextAvailableAtIso,
						durationMs: Date.now() - applyStartedAt,
						lastError,
					})
				}
			}

			logger.info({
				action: 'order_fulfillment_run',
				nowIso,
				limit,
				processed,
				succeeded,
				retrying,
				manualRequired,
				skipped,
				durationMs: Date.now() - startedAt,
			})

			return { processed, succeeded, retrying, manualRequired, skipped }
		},
	}
}
