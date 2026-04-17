import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
	VersionReleaseListQuerySchema,
	SyncVersionRequestSchema,
} from '@/contracts/dtos/version-release.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createVersionReleaseRepository } from '@/repositories/factory'
import { createVersionReleaseService } from '@/services/core/version-release.service'

/**
 * Function: GET
 *
 * Description: 获取版本发布列表（管理员接口）
 */
export const GET = withV1Route({
	action: 'admin:version_release:list',
	requireAccess: { action: 'read' as Action, scope: 'version-releases' as Scope },
	schemas: {
		query: VersionReleaseListQuerySchema,
	},
	handler: async ({ req, query, serviceContext }) => {
		const versionReleaseRepo = await createVersionReleaseRepository()
		const service = createVersionReleaseService(
			{ versionReleaseRepo },
			serviceContext,
		)
		const data = await service.getVersionList(query)

		return createJsonApiResponse(req, ok(data))
	},
})

/**
 * Function: POST
 *
 * Description: 同步版本发布记录（管理员接口）
 */
export const POST = withV1Route({
	action: 'admin:version_release:sync',
	requireAccess: { action: 'write' as Action, scope: 'version-releases' as Scope },
	schemas: {
		body: SyncVersionRequestSchema,
	},
	handler: async ({ req, body, serviceContext }) => {
		if (!body) {
			return createJsonApiResponse(req, { success: false, error: { code: 'INVALID_INPUT', message: '请求体不能为空' } }, { status: 400 })
		}

		const versionReleaseRepo = await createVersionReleaseRepository()
		const service = createVersionReleaseService(
			{ versionReleaseRepo },
			serviceContext,
		)
		const data = await service.syncVersion({
			version: body.version,
			title: body.title,
			description: body.description,
			releasedAt: new Date(body.releasedAt),
		})

		return createJsonApiResponse(req, ok(data))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
