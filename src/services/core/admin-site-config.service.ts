import type {
	SiteConfig,
	Announcement,
	AnnouncementListResponse,
	AnnouncementType,
	Agreement,
	AgreementListResponse,
	AgreementType,
} from '@/contracts/dtos/admin/site-config.dto'
import type {
	SiteConfigRepository,
	AnnouncementRepository,
	AgreementRepository,
} from '@/repositories/interfaces/core/site-management.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { memoryCache } from '@/lib/cache/memory-cache'

// =============================================================================
// Admin Site Config Service
// =============================================================================

/**
 * Function: createAdminSiteConfigService
 *
 * Description: 创建管理员站点配置服务，负责站点配置的读取和更新
 *
 * Parameters:
 *     deps({ siteConfig: SiteConfigRepository }): 依赖注入的 SiteConfigRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供 get/update 方法的服务对象
 */
export function createAdminSiteConfigService(
	deps: { siteConfig: SiteConfigRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		/**
		 * 获取站点配置
		 */
		async getSiteConfig(): Promise<SiteConfig | null> {
			const config = await deps.siteConfig.getSiteConfig(repoCtx)
			if (!config) return null

			logger.info({ action: 'admin_site_config.get', siteName: config.siteName })

			return {
				id: config.id,
				siteName: config.siteName,
				logoUrl: config.logoUrl,
				contactPhone: config.contactPhone,
				contactWechat: config.contactWechat,
				contactEmail: config.contactEmail,
				icpFiling: config.icpFiling,
				copyright: config.copyright,
				createdAt: config.createdAt,
				updatedAt: config.updatedAt,
			}
		},

		/**
		 * 更新站点配置
		 */
		async updateSiteConfig(params: {
			siteName: string
			logoUrl?: string | null
			contactPhone?: string | null
			contactWechat?: string | null
			contactEmail?: string | null
			icpFiling?: string | null
			copyright?: string | null
		}): Promise<SiteConfig> {
			const updated = await deps.siteConfig.updateSiteConfig(repoCtx, params)

			memoryCache.invalidate('site:config')

			logger.info({
				action: 'admin_site_config.update',
				siteName: params.siteName,
			})

			return {
				id: updated.id,
				siteName: updated.siteName,
				logoUrl: updated.logoUrl,
				contactPhone: updated.contactPhone,
				contactWechat: updated.contactWechat,
				contactEmail: updated.contactEmail,
				icpFiling: updated.icpFiling,
				copyright: updated.copyright,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			}
		},
	}
}

export type AdminSiteConfigService = ReturnType<typeof createAdminSiteConfigService>

// =============================================================================
// Admin Announcement Service
// =============================================================================

/**
 * Function: createAdminAnnouncementService
 *
 * Description: 创建管理员公告服务，负责公告的 CRUD 管理
 *
 * Parameters:
 *     deps({ announcements: AnnouncementRepository }): 依赖注入的 AnnouncementRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供 list/get/create/update/delete/toggle 方法的服务对象
 */
export function createAdminAnnouncementService(
	deps: { announcements: AnnouncementRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		/**
		 * 获取公告列表（分页）
		 */
		async listAnnouncements(params?: {
			limit?: number
			cursor?: string | null
		}): Promise<AnnouncementListResponse> {
			const limit = Math.max(1, Math.min(params?.limit ?? 50, 100))
			const cursor = params?.cursor ?? null

			const page = await deps.announcements.listAllAnnouncements(repoCtx, { limit, cursor })

			logger.info({
				action: 'admin_announcement.list',
				count: page.items.length,
			})

			return {
				items: page.items.map((item) => ({
					id: item.id,
					title: item.title,
					content: item.content,
					type: item.type,
					isActive: item.isActive,
					priority: item.priority,
					startAt: item.startAt,
					endAt: item.endAt,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
				})),
				nextCursor: page.nextCursor,
			}
		},

		/**
		 * 根据 ID 获取公告
		 */
		async getAnnouncementById(announcementId: string): Promise<Announcement | null> {
			const announcement = await deps.announcements.getAnnouncementById(repoCtx, { announcementId })
			if (!announcement) return null

			logger.info({ action: 'admin_announcement.get', announcementId })

			return {
				id: announcement.id,
				title: announcement.title,
				content: announcement.content,
				type: announcement.type,
				isActive: announcement.isActive,
				priority: announcement.priority,
				startAt: announcement.startAt,
				endAt: announcement.endAt,
				createdAt: announcement.createdAt,
				updatedAt: announcement.updatedAt,
			}
		},

		/**
		 * 创建公告
		 */
		async createAnnouncement(params: {
			title: string
			content: string
			type: AnnouncementType
			isActive?: boolean
			priority?: number
			startAt?: string | null
			endAt?: string | null
		}): Promise<Announcement> {
			// 验证时间范围
			if (params.startAt && params.endAt) {
				const startDate = new Date(params.startAt)
				const endDate = new Date(params.endAt)
				if (startDate > endDate) {
					const error = new Error('startAt must be before endAt') as Error & { code?: string }
					error.code = 'INVALID_TIME_RANGE'
					throw error
				}
			}

			const created = await deps.announcements.createAnnouncement(repoCtx, params)

			logger.info({
				action: 'admin_announcement.create',
				announcementId: created.id,
				title: params.title,
				type: params.type,
			})

			return {
				id: created.id,
				title: created.title,
				content: created.content,
				type: created.type,
				isActive: created.isActive,
				priority: created.priority,
				startAt: created.startAt,
				endAt: created.endAt,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			}
		},

		/**
		 * 更新公告
		 */
		async updateAnnouncement(params: {
			announcementId: string
			title?: string
			content?: string
			type?: AnnouncementType
			isActive?: boolean
			priority?: number
			startAt?: string | null
			endAt?: string | null
		}): Promise<Announcement | null> {
			// 验证时间范围
			if (params.startAt && params.endAt) {
				const startDate = new Date(params.startAt)
				const endDate = new Date(params.endAt)
				if (startDate > endDate) {
					const error = new Error('startAt must be before endAt') as Error & { code?: string }
					error.code = 'INVALID_TIME_RANGE'
					throw error
				}
			}

			const updated = await deps.announcements.updateAnnouncement(repoCtx, params)

			if (!updated) return null

			logger.info({
				action: 'admin_announcement.update',
				announcementId: params.announcementId,
			})

			return {
				id: updated.id,
				title: updated.title,
				content: updated.content,
				type: updated.type,
				isActive: updated.isActive,
				priority: updated.priority,
				startAt: updated.startAt,
				endAt: updated.endAt,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			}
		},

		/**
		 * 删除公告
		 */
		async deleteAnnouncement(announcementId: string): Promise<{ deleted: true }> {
			await deps.announcements.deleteAnnouncement(repoCtx, { announcementId })

			logger.info({
				action: 'admin_announcement.delete',
				announcementId,
			})

			return { deleted: true }
		},

		/**
		 * 切换公告启用状态
		 */
		async toggleAnnouncementActive(params: {
			announcementId: string
			isActive: boolean
		}): Promise<Announcement | null> {
			const updated = await deps.announcements.toggleAnnouncementActive(repoCtx, params)

			if (!updated) return null

			logger.info({
				action: 'admin_announcement.toggle_active',
				announcementId: params.announcementId,
				isActive: params.isActive,
			})

			return {
				id: updated.id,
				title: updated.title,
				content: updated.content,
				type: updated.type,
				isActive: updated.isActive,
				priority: updated.priority,
				startAt: updated.startAt,
				endAt: updated.endAt,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			}
		},
	}
}

export type AdminAnnouncementService = ReturnType<typeof createAdminAnnouncementService>

// =============================================================================
// Admin Agreement Service
// =============================================================================

/**
 * Function: createAdminAgreementService
 *
 * Description: 创建管理员协议服务，负责协议的 CRUD 管理
 *
 * Parameters:
 *     deps({ agreements: AgreementRepository }): 依赖注入的 AgreementRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供 list/get/upsert/update/delete 方法的服务对象
 */
export function createAdminAgreementService(
	deps: { agreements: AgreementRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		/**
		 * 获取所有协议列表
		 */
		async listAgreements(): Promise<AgreementListResponse> {
			const agreements = await deps.agreements.listAllAgreements(repoCtx)

			logger.info({
				action: 'admin_agreement.list',
				count: agreements.length,
			})

			return {
				items: agreements.map((item) => ({
					id: item.id,
					type: item.type,
					title: item.title,
					content: item.content,
					version: item.version,
					isActive: item.isActive,
					effectiveAt: item.effectiveAt,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
				})),
			}
		},

		/**
		 * 根据 ID 获取协议
		 */
		async getAgreementById(agreementId: string): Promise<Agreement | null> {
			const agreement = await deps.agreements.getAgreementById(repoCtx, { agreementId })
			if (!agreement) return null

			logger.info({ action: 'admin_agreement.get', agreementId })

			return {
				id: agreement.id,
				type: agreement.type,
				title: agreement.title,
				content: agreement.content,
				version: agreement.version,
				isActive: agreement.isActive,
				effectiveAt: agreement.effectiveAt,
				createdAt: agreement.createdAt,
				updatedAt: agreement.updatedAt,
			}
		},

		/**
		 * 创建或更新协议（同一类型只能有一条有效记录）
		 */
		async upsertAgreement(params: {
			type: AgreementType
			title: string
			content: string
			version: string
			isActive?: boolean
			effectiveAt?: string
		}): Promise<Agreement> {
			const upserted = await deps.agreements.upsertAgreement(repoCtx, params)

			logger.info({
				action: 'admin_agreement.upsert',
				agreementId: upserted.id,
				type: params.type,
				version: params.version,
			})

			return {
				id: upserted.id,
				type: upserted.type,
				title: upserted.title,
				content: upserted.content,
				version: upserted.version,
				isActive: upserted.isActive,
				effectiveAt: upserted.effectiveAt,
				createdAt: upserted.createdAt,
				updatedAt: upserted.updatedAt,
			}
		},

		/**
		 * 更新协议
		 */
		async updateAgreement(params: {
			agreementId: string
			title?: string
			content?: string
			version?: string
			isActive?: boolean
			effectiveAt?: string
		}): Promise<Agreement | null> {
			const updated = await deps.agreements.updateAgreement(repoCtx, params)

			if (!updated) return null

			logger.info({
				action: 'admin_agreement.update',
				agreementId: params.agreementId,
			})

			return {
				id: updated.id,
				type: updated.type,
				title: updated.title,
				content: updated.content,
				version: updated.version,
				isActive: updated.isActive,
				effectiveAt: updated.effectiveAt,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			}
		},

		/**
		 * 删除协议
		 */
		async deleteAgreement(agreementId: string): Promise<{ deleted: true }> {
			await deps.agreements.deleteAgreement(repoCtx, { agreementId })

			logger.info({
				action: 'admin_agreement.delete',
				agreementId,
			})

			return { deleted: true }
		},
	}
}

export type AdminAgreementService = ReturnType<typeof createAdminAgreementService>
