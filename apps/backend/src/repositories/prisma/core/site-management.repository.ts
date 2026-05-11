import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/prisma/generated/prisma'
import type {
	SiteConfigRepository,
	AnnouncementRepository,
	AgreementRepository,
	SiteConfigDto,
	SiteAboutStatDto,
	AnnouncementDto,
	AgreementDto,
} from '@/repositories/interfaces/core/site-management.interface'
import type { RepoContext } from '@/types/repo/repo-context'

function escapeHtml(text: string | null | undefined): string | null {
	if (text === null || text === undefined) return null
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

function sanitizeSiteConfigInput(params: {
	siteName?: string | null
	logoUrl?: string | null
	contactPhone?: string | null
	contactWechat?: string | null
	contactEmail?: string | null
	icpFiling?: string | null
	copyright?: string | null
	siteSlogan?: string | null
	aboutStats?: SiteAboutStatDto[] | null
}) {
	return {
		siteName: params.siteName ? escapeHtml(params.siteName.trim()) ?? '' : '',
		siteSlogan: params.siteSlogan ? escapeHtml(params.siteSlogan.trim()) ?? null : null,
		logoUrl: params.logoUrl,
		contactPhone: params.contactPhone,
		contactWechat: params.contactWechat ? escapeHtml(params.contactWechat.trim()) ?? null : null,
		contactEmail: params.contactEmail ? escapeHtml(params.contactEmail.trim()) ?? null : null,
		icpFiling: params.icpFiling,
		copyright: params.copyright ? escapeHtml(params.copyright.trim()) ?? null : null,
		aboutStats: sanitizeAboutStats(params.aboutStats),
	}
}

function sanitizeAboutStats(stats: SiteAboutStatDto[] | null | undefined): SiteAboutStatDto[] | null {
	if (!stats || stats.length === 0) return null

	return stats
		.slice(0, 3)
		.map((item) => ({
			value: escapeHtml(item.value.trim()) ?? '',
			label: escapeHtml(item.label.trim()) ?? '',
		}))
		.filter((item) => item.value && item.label)
}

function toPrismaJson(value: SiteAboutStatDto[] | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
	return value ?? Prisma.JsonNull
}

function sanitizeAnnouncementInput(params: {
	title?: string | null
	content?: string | null
}) {
	return {
		title: params.title ? escapeHtml(params.title.trim()) ?? '' : '',
		content: params.content ? escapeHtml(params.content.trim()) ?? '' : '',
	}
}

function sanitizeAgreementInput(params: {
	title?: string | null
	content?: string | null
}) {
	return {
		title: params.title ? escapeHtml(params.title.trim()) ?? '' : '',
		content: params.content ? escapeHtml(params.content.trim()) ?? '' : '',
	}
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapSiteConfig(config: {
	id: string
	siteName: string
	siteSlogan: string | null
	logoUrl: string | null
	contactPhone: string | null
	contactWechat: string | null
	contactEmail: string | null
	icpFiling: string | null
	copyright: string | null
	aboutStats: unknown
	createdAt: Date
	updatedAt: Date
}): SiteConfigDto {
	return {
		id: config.id,
		siteName: config.siteName,
		siteSlogan: config.siteSlogan,
		logoUrl: config.logoUrl,
		contactPhone: config.contactPhone,
		contactWechat: config.contactWechat,
		contactEmail: config.contactEmail,
		icpFiling: config.icpFiling,
		copyright: config.copyright,
		aboutStats: normalizeAboutStats(config.aboutStats),
		createdAt: config.createdAt.toISOString(),
		updatedAt: config.updatedAt.toISOString(),
	}
}

function normalizeAboutStats(value: unknown): SiteAboutStatDto[] | null {
	if (!Array.isArray(value)) return null

	const stats = value
		.map((item) => {
			if (!item || typeof item !== 'object') return null
			const stat = item as Record<string, unknown>
			return typeof stat.value === 'string' && typeof stat.label === 'string'
				? { value: stat.value, label: stat.label }
				: null
		})
		.filter((item): item is SiteAboutStatDto => item !== null)

	return stats.length > 0 ? stats : null
}

function mapAnnouncement(announcement: {
	id: string
	title: string
	content: string
	type: string
	isActive: boolean
	priority: number
	startAt: Date | null
	endAt: Date | null
	createdAt: Date
	updatedAt: Date
}): AnnouncementDto {
	// 验证并转换类型，无效类型返回 null
	const validTypes = ['NOTICE', 'ACTIVITY', 'MAINTENANCE'] as const
	const type = validTypes.includes(announcement.type as AnnouncementDto['type'])
		? (announcement.type as AnnouncementDto['type'])
		: null

	if (!type) {
		throw new Error(`Invalid announcement type: ${announcement.type}`)
	}

	return {
		id: announcement.id,
		title: announcement.title,
		content: announcement.content,
		type,
		isActive: announcement.isActive,
		priority: announcement.priority,
		startAt: announcement.startAt?.toISOString() ?? null,
		endAt: announcement.endAt?.toISOString() ?? null,
		createdAt: announcement.createdAt.toISOString(),
		updatedAt: announcement.updatedAt.toISOString(),
	}
}

function mapAgreement(agreement: {
	id: string
	type: string
	title: string
	content: string
	version: string
	isActive: boolean
	effectiveAt: Date
	createdAt: Date
	updatedAt: Date
}): AgreementDto {
	// 验证并转换类型，无效类型抛出错误
	const validTypes = ['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US'] as const
	const type = validTypes.includes(agreement.type as AgreementDto['type'])
		? (agreement.type as AgreementDto['type'])
		: null

	if (!type) {
		throw new Error(`Invalid agreement type: ${agreement.type}`)
	}

	return {
		id: agreement.id,
		type,
		title: agreement.title,
		content: agreement.content,
		version: agreement.version,
		isActive: agreement.isActive,
		effectiveAt: agreement.effectiveAt.toISOString(),
		createdAt: agreement.createdAt.toISOString(),
		updatedAt: agreement.updatedAt.toISOString(),
	}
}

// =============================================================================
// SiteConfig Repository Implementation
// =============================================================================

export function createPrismaSiteConfigRepository(): SiteConfigRepository {
	return {
		async getSiteConfig(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'get_site_config' })

			// 单例模式：获取第一条记录
			const config = await prisma.siteConfig.findFirst()
			return config ? mapSiteConfig(config) : null
		},

		async updateSiteConfig(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_site_config', siteName: params.siteName })

			const sanitized = sanitizeSiteConfigInput(params)

			// 使用 upsert 原子操作，单例模式的固定 ID
			const config = await prisma.siteConfig.upsert({
				where: { id: 'site_config_singleton' }, // 单例模式固定 ID
				update: {
					siteName: sanitized.siteName,
					siteSlogan: sanitized.siteSlogan,
					logoUrl: sanitized.logoUrl,
					contactPhone: sanitized.contactPhone,
					contactWechat: sanitized.contactWechat,
					contactEmail: sanitized.contactEmail,
					icpFiling: sanitized.icpFiling,
					copyright: sanitized.copyright,
					aboutStats: toPrismaJson(sanitized.aboutStats),
				},
				create: {
					id: 'site_config_singleton',
					siteName: sanitized.siteName,
					siteSlogan: sanitized.siteSlogan,
					logoUrl: sanitized.logoUrl,
					contactPhone: sanitized.contactPhone,
					contactWechat: sanitized.contactWechat,
					contactEmail: sanitized.contactEmail,
					icpFiling: sanitized.icpFiling,
					copyright: sanitized.copyright,
					aboutStats: toPrismaJson(sanitized.aboutStats),
				},
			})
			return mapSiteConfig(config)
		},

		async initializeSiteConfig(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'initialize_site_config', siteName: params.siteName })

			const sanitized = sanitizeSiteConfigInput(params)

			// 使用 upsert 确保只创建一次，使用固定 ID
			const config = await prisma.siteConfig.upsert({
				where: { id: 'site_config_singleton' },
				update: {},
				create: {
					id: 'site_config_singleton',
					siteName: sanitized.siteName,
					siteSlogan: sanitized.siteSlogan,
					logoUrl: sanitized.logoUrl,
					contactPhone: sanitized.contactPhone,
					contactWechat: sanitized.contactWechat,
					contactEmail: sanitized.contactEmail,
					icpFiling: sanitized.icpFiling,
					copyright: sanitized.copyright,
					aboutStats: toPrismaJson(sanitized.aboutStats),
				},
			})
			return mapSiteConfig(config)
		},
	}
}

// =============================================================================
// Announcement Repository Implementation
// =============================================================================

export function createPrismaAnnouncementRepository(): AnnouncementRepository {
	return {
		async listActiveAnnouncements(ctx: RepoContext, params = {}) {
			const { logger } = ctx
			const { limit = 50, now } = params

			logger.info({ action: 'list_active_announcements', limit, now })

			const where: Record<string, unknown> = {
				isActive: true,
			}

			// 如果提供了当前时间，过滤时间范围
			if (now) {
				const nowDate = new Date(now)
				where.OR = [
					{ startAt: null, endAt: null },
					{ startAt: { lte: nowDate }, endAt: null },
					{ startAt: null, endAt: { gte: nowDate } },
					{ startAt: { lte: nowDate }, endAt: { gte: nowDate } },
				]
			}

			const announcements = await prisma.announcement.findMany({
				where,
				orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
				take: limit,
			})

			return announcements.map(mapAnnouncement)
		},

		async listAllAnnouncements(ctx: RepoContext, params) {
			const { logger } = ctx
			const safeLimit = Math.max(1, Math.min(params.limit, 100))

			logger.info({ action: 'list_all_announcements', limit: safeLimit })

			const cursorWhere: Record<string, unknown> = {}
			if (params.cursor) {
				cursorWhere.createdAt = { lt: new Date(params.cursor) }
			}

			const announcements = await prisma.announcement.findMany({
				where: cursorWhere,
				orderBy: { createdAt: 'desc' },
				take: safeLimit + 1,
			})

			const hasMore = announcements.length > safeLimit
			const items = hasMore ? announcements.slice(0, safeLimit) : announcements
			const nextCursor = hasMore && items.length > 0
				? items[items.length - 1]?.createdAt.toISOString() ?? null
				: null

			return {
				items: items.map(mapAnnouncement),
				nextCursor,
			}
		},

		async getAnnouncementById(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_announcement_by_id', announcementId: params.announcementId })

			const announcement = await prisma.announcement.findUnique({
				where: { id: params.announcementId },
			})

			return announcement ? mapAnnouncement(announcement) : null
		},

		async createAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'create_announcement', title: params.title, type: params.type })

			const sanitized = sanitizeAnnouncementInput({ title: params.title, content: params.content })

			const announcement = await prisma.announcement.create({
				data: {
					title: sanitized.title,
					content: sanitized.content,
					type: params.type,
					isActive: params.isActive ?? true,
					priority: params.priority ?? 0,
					startAt: params.startAt ? new Date(params.startAt) : null,
					endAt: params.endAt ? new Date(params.endAt) : null,
				},
			})

			return mapAnnouncement(announcement)
		},

		async updateAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_announcement', announcementId: params.announcementId })

			const sanitized = sanitizeAnnouncementInput({ title: params.title, content: params.content })

			const updates: Record<string, unknown> = {}
			if (params.title !== undefined) updates.title = sanitized.title
			if (params.content !== undefined) updates.content = sanitized.content
			if (params.type !== undefined) updates.type = params.type
			if (params.isActive !== undefined) updates.isActive = params.isActive
			if (params.priority !== undefined) updates.priority = params.priority
			if (params.startAt !== undefined) updates.startAt = params.startAt ? new Date(params.startAt) : null
			if (params.endAt !== undefined) updates.endAt = params.endAt ? new Date(params.endAt) : null

			const announcement = await prisma.announcement.update({
				where: { id: params.announcementId },
				data: updates,
			})

			return mapAnnouncement(announcement)
		},

		async deleteAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'delete_announcement', announcementId: params.announcementId })

			await prisma.announcement.delete({
				where: { id: params.announcementId },
			})
		},

		async toggleAnnouncementActive(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'toggle_announcement_active', announcementId: params.announcementId, isActive: params.isActive })

			const announcement = await prisma.announcement.update({
				where: { id: params.announcementId },
				data: { isActive: params.isActive },
			})

			return mapAnnouncement(announcement)
		},
	}
}

// =============================================================================
// Agreement Repository Implementation
// =============================================================================

export function createPrismaAgreementRepository(): AgreementRepository {
	return {
		async getAgreementByType(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_agreement_by_type', type: params.type })

			const agreement = await prisma.agreement.findFirst({
				where: {
					type: params.type,
					isActive: true,
				},
				orderBy: { effectiveAt: 'desc' },
			})

			return agreement ? mapAgreement(agreement) : null
		},

		async listAllAgreements(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'list_all_agreements' })

			const agreements = await prisma.agreement.findMany({
				orderBy: [{ type: 'asc' }, { effectiveAt: 'desc' }],
			})

			return agreements.map(mapAgreement)
		},

		async getAgreementById(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_agreement_by_id', agreementId: params.agreementId })

			const agreement = await prisma.agreement.findUnique({
				where: { id: params.agreementId },
			})

			return agreement ? mapAgreement(agreement) : null
		},

		async upsertAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'upsert_agreement', type: params.type, version: params.version })

			const sanitized = sanitizeAgreementInput({ title: params.title, content: params.content })

			const agreement = await prisma.agreement.upsert({
				where: { type: params.type },
				update: {
					title: sanitized.title,
					content: sanitized.content,
					version: params.version,
					isActive: params.isActive ?? true,
					effectiveAt: params.effectiveAt ? new Date(params.effectiveAt) : new Date(),
				},
				create: {
					type: params.type,
					title: sanitized.title,
					content: sanitized.content,
					version: params.version,
					isActive: params.isActive ?? true,
					effectiveAt: params.effectiveAt ? new Date(params.effectiveAt) : new Date(),
				},
			})

			return mapAgreement(agreement)
		},

		async updateAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_agreement', agreementId: params.agreementId })

			const sanitized = sanitizeAgreementInput({ title: params.title, content: params.content })

			const updates: Record<string, unknown> = {}
			if (params.title !== undefined) updates.title = sanitized.title
			if (params.content !== undefined) updates.content = sanitized.content
			if (params.version !== undefined) updates.version = params.version
			if (params.isActive !== undefined) updates.isActive = params.isActive
			if (params.effectiveAt !== undefined) updates.effectiveAt = new Date(params.effectiveAt)

			const agreement = await prisma.agreement.update({
				where: { id: params.agreementId },
				data: updates,
			})

			return mapAgreement(agreement)
		},

		async deleteAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'delete_agreement', agreementId: params.agreementId })

			await prisma.agreement.delete({
				where: { id: params.agreementId },
			})
		},
	}
}
