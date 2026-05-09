import type {
	SiteConfigRepository,
	AnnouncementRepository,
	AgreementRepository,
	SiteConfigDto,
	AnnouncementDto,
	AgreementDto,
	AnnouncementType,
	AgreementType,
} from '@/repositories/interfaces/core/site-management.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

// =============================================================================
// Type Helpers
// =============================================================================

const SITE_CONFIG_SELECT = 'id,site_name,logo_url,contact_phone,contact_wechat,icp_filing,copyright,created_at,updated_at'
const ANNOUNCEMENT_SELECT = 'id,title,content,type,is_active,priority,start_at,end_at,created_at,updated_at'
const AGREEMENT_SELECT = 'id,type,title,content,version,is_active,effective_at,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
	const value = row[key]
	return typeof value === 'string' ? value : null
}

function getBoolean(row: Record<string, unknown>, key: string): boolean | null {
	const value = row[key]
	return typeof value === 'boolean' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
	const value = row[key]
	return typeof value === 'number' ? value : null
}

function isValidAnnouncementType(value: unknown): value is AnnouncementType {
	return typeof value === 'string' && ['NOTICE', 'ACTIVITY', 'MAINTENANCE'].includes(value)
}

function isValidAgreementType(value: unknown): value is AgreementType {
	return typeof value === 'string' && ['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US'].includes(value)
}

// =============================================================================
// Mapper Functions
// =============================================================================

function mapSiteConfig(row: Record<string, unknown>): SiteConfigDto {
	const id = getString(row, 'id')
	const siteName = getString(row, 'site_name')
	const logoUrl = getString(row, 'logo_url')
	const contactPhone = getString(row, 'contact_phone')
	const contactWechat = getString(row, 'contact_wechat')
	const contactEmail = getString(row, 'contact_email')
	const icpFiling = getString(row, 'icp_filing')
	const copyright = getString(row, 'copyright')
	const createdAt = getString(row, 'created_at')
	const updatedAt = getString(row, 'updated_at')

	if (!id || !siteName || !createdAt || !updatedAt) {
		throw new Error('Invalid site_config row')
	}

	return {
		id,
		siteName,
		logoUrl,
		contactPhone,
		contactWechat,
		contactEmail,
		icpFiling,
		copyright,
		createdAt,
		updatedAt,
	}
}

function mapAnnouncement(row: Record<string, unknown>): AnnouncementDto {
	const id = getString(row, 'id')
	const title = getString(row, 'title')
	const content = getString(row, 'content')
	const type = isValidAnnouncementType(row.type) ? row.type : 'NOTICE'
	const isActive = getBoolean(row, 'is_active')
	const priority = getNumber(row, 'priority')
	const startAt = getString(row, 'start_at')
	const endAt = getString(row, 'end_at')
	const createdAt = getString(row, 'created_at')
	const updatedAt = getString(row, 'updated_at')

	if (!id || !title || !content || isActive === null || priority === null || !createdAt || !updatedAt) {
		throw new Error('Invalid announcements row')
	}

	return {
		id,
		title,
		content,
		type,
		isActive,
		priority,
		startAt,
		endAt,
		createdAt,
		updatedAt,
	}
}

function mapAgreement(row: Record<string, unknown>): AgreementDto {
	const id = getString(row, 'id')
	const type = isValidAgreementType(row.type) ? row.type : 'USER_AGREEMENT'
	const title = getString(row, 'title')
	const content = getString(row, 'content')
	const version = getString(row, 'version')
	const isActive = getBoolean(row, 'is_active')
	const effectiveAt = getString(row, 'effective_at')
	const createdAt = getString(row, 'created_at')
	const updatedAt = getString(row, 'updated_at')

	if (!id || !title || !content || !version || isActive === null || !effectiveAt || !createdAt || !updatedAt) {
		throw new Error('Invalid agreements row')
	}

	return {
		id,
		type,
		title,
		content,
		version,
		isActive,
		effectiveAt,
		createdAt,
		updatedAt,
	}
}

// =============================================================================
// SiteConfig Repository Implementation
// =============================================================================

/**
 * Function: createSupabaseSiteConfigRepository
 *
 * Description: 创建基于 Supabase（Service Role）的站点配置仓储实现
 *
 * Parameters:
 *
 * Returns:
 *     repository(SiteConfigRepository): SiteConfigRepository 的 Supabase 实现
 */
export function createSupabaseSiteConfigRepository(): SiteConfigRepository {
	const supabase = createSupabaseServiceRoleClient()

	return {
		async getSiteConfig(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'get_site_config' })

			const { data, error } = await supabase
				.from('site_config')
				.select(SITE_CONFIG_SELECT)
				.limit(1)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapSiteConfig(data as unknown as Record<string, unknown>)
		},

		async updateSiteConfig(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_site_config', siteName: params.siteName })

			// 先尝试获取现有配置
			const { data: existing, error: fetchError } = await supabase
				.from('site_config')
				.select('id')
				.limit(1)
				.maybeSingle()

			if (fetchError) throw fetchError

			const updateData: Record<string, unknown> = {
				site_name: params.siteName,
				logo_url: params.logoUrl ?? null,
				contact_phone: params.contactPhone ?? null,
				contact_wechat: params.contactWechat ?? null,
				contact_email: params.contactEmail ?? null,
				icp_filing: params.icpFiling ?? null,
				copyright: params.copyright ?? null,
				updated_at: new Date().toISOString(),
			}

			if (existing) {
				// 更新现有配置
				const { data, error } = await supabase
					.from('site_config')
					.update(updateData)
					.eq('id', existing.id)
					.select(SITE_CONFIG_SELECT)
					.single()

				if (error) throw error
				return mapSiteConfig(data as unknown as Record<string, unknown>)
			}

			// 创建新配置
			const { data, error } = await supabase
				.from('site_config')
				.insert(updateData)
				.select(SITE_CONFIG_SELECT)
				.single()

			if (error) throw error
			return mapSiteConfig(data as unknown as Record<string, unknown>)
		},

		async initializeSiteConfig(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'initialize_site_config', siteName: params.siteName })

			const insertData: Record<string, unknown> = {
				id: '00000000-0000-0000-0000-000000000001',
				site_name: params.siteName,
				logo_url: params.logoUrl ?? null,
				contact_phone: params.contactPhone ?? null,
				contact_wechat: params.contactWechat ?? null,
				contact_email: params.contactEmail ?? null,
				icp_filing: params.icpFiling ?? null,
				copyright: params.copyright ?? null,
			}

			// 使用 upsert 确保只创建一次
			const { data, error } = await supabase
				.from('site_config')
				.upsert(insertData, { onConflict: 'id' })
				.select(SITE_CONFIG_SELECT)
				.single()

			if (error) throw error
			return mapSiteConfig(data as unknown as Record<string, unknown>)
		},
	}
}

// =============================================================================
// Announcement Repository Implementation
// =============================================================================

/**
 * Function: createSupabaseAnnouncementRepository
 *
 * Description: 创建基于 Supabase（Service Role）的公告仓储实现
 *
 * Parameters:
 *
 * Returns:
 *     repository(AnnouncementRepository): AnnouncementRepository 的 Supabase 实现
 */
export function createSupabaseAnnouncementRepository(): AnnouncementRepository {
	const supabase = createSupabaseServiceRoleClient()

	return {
		async listActiveAnnouncements(ctx: RepoContext, params = {}) {
			const { logger } = ctx
			const { limit = 50, now } = params

			logger.info({ action: 'list_active_announcements', limit, now })

			let query = supabase
				.from('announcements')
				.select(ANNOUNCEMENT_SELECT)
				.eq('is_active', true)

			// 如果提供了当前时间，过滤时间范围
			if (now) {
				const nowDate = new Date(now).toISOString()
				query = query.or(`and(start_at.is.null,end_at.is.null),and(start_at.lte.${nowDate},end_at.is.null),and(start_at.is.null,end_at.gte.${nowDate}),and(start_at.lte.${nowDate},end_at.gte.${nowDate})`)
			}

			query = query.order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(limit)

			const { data, error } = await query
			if (error) throw error

			return (data ?? []).map((r) => mapAnnouncement(r as unknown as Record<string, unknown>))
		},

		async listAllAnnouncements(ctx: RepoContext, params) {
			const { logger } = ctx
			const safeLimit = Math.max(1, Math.min(params.limit, 100))

			logger.info({ action: 'list_all_announcements', limit: safeLimit })

			let query = supabase
				.from('announcements')
				.select(ANNOUNCEMENT_SELECT)
				.order('created_at', { ascending: false })
				.limit(safeLimit + 1)

			if (params.cursor) {
				query = query.lt('created_at', params.cursor)
			}

			const { data, error } = await query
			if (error) throw error

			const hasMore = data !== null && data.length > safeLimit
			const items = hasMore ? data.slice(0, safeLimit) : (data ?? [])
			const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]?.created_at ?? null : null

			return {
				items: items.map((r) => mapAnnouncement(r as unknown as Record<string, unknown>)),
				nextCursor,
			}
		},

		async getAnnouncementById(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_announcement_by_id', announcementId: params.announcementId })

			const { data, error } = await supabase
				.from('announcements')
				.select(ANNOUNCEMENT_SELECT)
				.eq('id', params.announcementId)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAnnouncement(data as unknown as Record<string, unknown>)
		},

		async createAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'create_announcement', title: params.title, type: params.type })

			const insertData: Record<string, unknown> = {
				title: params.title,
				content: params.content,
				type: params.type,
				is_active: params.isActive ?? true,
				priority: params.priority ?? 0,
				start_at: params.startAt ?? null,
				end_at: params.endAt ?? null,
			}

			const { data, error } = await supabase
				.from('announcements')
				.insert(insertData)
				.select(ANNOUNCEMENT_SELECT)
				.single()

			if (error) throw error
			return mapAnnouncement(data as unknown as Record<string, unknown>)
		},

		async updateAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_announcement', announcementId: params.announcementId })

			const updates: Record<string, unknown> = {
				updated_at: new Date().toISOString(),
			}

			if (params.title !== undefined) updates.title = params.title
			if (params.content !== undefined) updates.content = params.content
			if (params.type !== undefined) updates.type = params.type
			if (params.isActive !== undefined) updates.is_active = params.isActive
			if (params.priority !== undefined) updates.priority = params.priority
			if (params.startAt !== undefined) updates.start_at = params.startAt
			if (params.endAt !== undefined) updates.end_at = params.endAt

			const { data, error } = await supabase
				.from('announcements')
				.update(updates)
				.eq('id', params.announcementId)
				.select(ANNOUNCEMENT_SELECT)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAnnouncement(data as unknown as Record<string, unknown>)
		},

		async deleteAnnouncement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'delete_announcement', announcementId: params.announcementId })

			const { error } = await supabase.from('announcements').delete().eq('id', params.announcementId)
			if (error) throw error
		},

		async toggleAnnouncementActive(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'toggle_announcement_active', announcementId: params.announcementId, isActive: params.isActive })

			const { data, error } = await supabase
				.from('announcements')
				.update({ is_active: params.isActive, updated_at: new Date().toISOString() })
				.eq('id', params.announcementId)
				.select(ANNOUNCEMENT_SELECT)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAnnouncement(data as unknown as Record<string, unknown>)
		},
	}
}

// =============================================================================
// Agreement Repository Implementation
// =============================================================================

/**
 * Function: createSupabaseAgreementRepository
 *
 * Description: 创建基于 Supabase（Service Role）的协议仓储实现
 *
 * Parameters:
 *
 * Returns:
 *     repository(AgreementRepository): AgreementRepository 的 Supabase 实现
 */
export function createSupabaseAgreementRepository(): AgreementRepository {
	const supabase = createSupabaseServiceRoleClient()

	return {
		async getAgreementByType(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_agreement_by_type', type: params.type })

			const { data, error } = await supabase
				.from('agreements')
				.select(AGREEMENT_SELECT)
				.eq('type', params.type)
				.eq('is_active', true)
				.order('effective_at', { ascending: false })
				.limit(1)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAgreement(data as unknown as Record<string, unknown>)
		},

		async listAllAgreements(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'list_all_agreements' })

			const { data, error } = await supabase
				.from('agreements')
				.select(AGREEMENT_SELECT)
				.order('type', { ascending: true })
				.order('effective_at', { ascending: false })

			if (error) throw error
			return (data ?? []).map((r) => mapAgreement(r as unknown as Record<string, unknown>))
		},

		async getAgreementById(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'get_agreement_by_id', agreementId: params.agreementId })

			const { data, error } = await supabase
				.from('agreements')
				.select(AGREEMENT_SELECT)
				.eq('id', params.agreementId)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAgreement(data as unknown as Record<string, unknown>)
		},

		async upsertAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'upsert_agreement', type: params.type, version: params.version })

			const upsertData: Record<string, unknown> = {
				type: params.type,
				title: params.title,
				content: params.content,
				version: params.version,
				is_active: params.isActive ?? true,
				effective_at: params.effectiveAt ? new Date(params.effectiveAt).toISOString() : new Date().toISOString(),
			}

			const { data, error } = await supabase
				.from('agreements')
				.upsert(upsertData, { onConflict: 'type' })
				.select(AGREEMENT_SELECT)
				.single()

			if (error) throw error
			return mapAgreement(data as unknown as Record<string, unknown>)
		},

		async updateAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'update_agreement', agreementId: params.agreementId })

			const updates: Record<string, unknown> = {
				updated_at: new Date().toISOString(),
			}

			if (params.title !== undefined) updates.title = params.title
			if (params.content !== undefined) updates.content = params.content
			if (params.version !== undefined) updates.version = params.version
			if (params.isActive !== undefined) updates.is_active = params.isActive
			if (params.effectiveAt !== undefined) updates.effective_at = new Date(params.effectiveAt).toISOString()

			const { data, error } = await supabase
				.from('agreements')
				.update(updates)
				.eq('id', params.agreementId)
				.select(AGREEMENT_SELECT)
				.maybeSingle()

			if (error) throw error
			if (!data) return null
			return mapAgreement(data as unknown as Record<string, unknown>)
		},

		async deleteAgreement(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'delete_agreement', agreementId: params.agreementId })

			const { error } = await supabase.from('agreements').delete().eq('id', params.agreementId)
			if (error) throw error
		},
	}
}
