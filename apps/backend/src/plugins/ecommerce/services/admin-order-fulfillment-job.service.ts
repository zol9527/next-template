import type { AdminOrderFulfillmentJob } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'
import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
Function: createAdminOrderFulfillmentJobService

Description: 创建后台履约任务服务，提供履约任务详情查询能力（不直接访问数据库）

Parameters:
		deps({ jobs: OrderFulfillmentJobRepository }): 依赖注入的履约任务仓储
		ctx(ServiceContext): Service 上下文

Returns:
		service(object): 提供 getJobById 等方法的服务对象
*/
export function createAdminOrderFulfillmentJobService(
	deps: { jobs: OrderFulfillmentJobRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		async getJobById(params: { jobId: string }): Promise<AdminOrderFulfillmentJob | null> {
			const job = await deps.jobs.getJobById(repoCtx, { jobId: params.jobId })
			if (!job) return null

			logger.info({ action: 'admin.order_fulfillment_job.get', jobId: job.id })
			return job
		},
	}
}
