import type { RepoContext } from '@/types/repo/repo-context'
import type { IdempotencyRequest } from '@/contracts/dtos/idempotency.dto'

export interface IdempotencyRepository {
	getRequest(ctx: RepoContext, params: { userId: string; action: string; idempotencyKey: string }): Promise<IdempotencyRequest | null>

	createRequest(ctx: RepoContext, params: {
		userId: string
		action: string
		idempotencyKey: string
		requestHash: string
		expiresAt: string
		createdAt: string
	}): Promise<IdempotencyRequest>

	markSucceeded(ctx: RepoContext, params: {
		id: string
		resourceType: string
		resourceId: string
		responseCode?: number | null
		responseBody?: unknown | null
		updatedAt: string
	}): Promise<IdempotencyRequest | null>

	markFailed(ctx: RepoContext, params: {
		id: string
		responseCode?: number | null
		responseBody?: unknown | null
		updatedAt: string
	}): Promise<IdempotencyRequest | null>
}
