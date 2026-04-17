import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminOrderFulfillmentJob } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'

export interface OrderFulfillmentJobRepository {
	upsertJobByPaymentId(ctx: RepoContext, params: { orderId: string; paymentId: string; updatedAt: string }): Promise<AdminOrderFulfillmentJob>

	getJobById(ctx: RepoContext, params: { jobId: string }): Promise<AdminOrderFulfillmentJob | null>

	getFulfillmentStatusByOrderId(ctx: RepoContext, params: { orderId: string }): Promise<string | null>

	listDueJobs(ctx: RepoContext, params: { limit: number; nowIso: string }): Promise<AdminOrderFulfillmentJob[]>

	tryMarkProcessing(ctx: RepoContext, params: { jobId: string; nowIso: string }): Promise<AdminOrderFulfillmentJob | null>

	markSucceeded(ctx: RepoContext, params: { jobId: string; nowIso: string }): Promise<AdminOrderFulfillmentJob | null>

	markRetrying(ctx: RepoContext, params: {
		jobId: string
		nowIso: string
		nextAvailableAtIso: string
		lastError: string
	}): Promise<AdminOrderFulfillmentJob | null>

	markManualRequired(ctx: RepoContext, params: { jobId: string; nowIso: string; lastError: string }): Promise<AdminOrderFulfillmentJob | null>

	applyFulfillment(ctx: RepoContext, params: { orderId: string; paymentId: string }): Promise<{ entitlementInserted: boolean; commissionInserted: boolean }>
}
