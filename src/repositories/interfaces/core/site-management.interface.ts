import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 站点配置 DTO
 */
export type SiteConfigDto = {
	id: string
	siteName: string
	logoUrl: string | null
	contactPhone: string | null
	contactWechat: string | null
	icpFiling: string | null
	copyright: string | null
	createdAt: string
	updatedAt: string
}

/**
 * 公告类型枚举
 */
export type AnnouncementType = 'NOTICE' | 'ACTIVITY' | 'MAINTENANCE'

/**
 * 公告 DTO
 */
export type AnnouncementDto = {
	id: string
	title: string
	content: string
	type: AnnouncementType
	isActive: boolean
	priority: number
	startAt: string | null
	endAt: string | null
	createdAt: string
	updatedAt: string
}

/**
 * 协议类型枚举
 */
export type AgreementType = 'USER_AGREEMENT' | 'PRIVACY_POLICY' | 'ABOUT_US'

/**
 * 协议 DTO
 */
export type AgreementDto = {
	id: string
	type: AgreementType
	title: string
	content: string
	version: string
	isActive: boolean
	effectiveAt: string
	createdAt: string
	updatedAt: string
}

/**
 * 站点配置 Repository 接口
 *
 * @description 站点配置采用单例模式，表中只有一条记录
 */
export interface SiteConfigRepository {
	/**
	 * 获取站点配置（唯一记录）
	 */
	getSiteConfig(ctx: RepoContext): Promise<SiteConfigDto | null>

	/**
	 * 更新站点配置
	 */
	updateSiteConfig(ctx: RepoContext, params: {
		siteName: string
		logoUrl?: string | null
		contactPhone?: string | null
		contactWechat?: string | null
		icpFiling?: string | null
		copyright?: string | null
	}): Promise<SiteConfigDto>

	/**
	 * 初始化站点配置（仅在首次调用时创建）
	 */
	initializeSiteConfig(ctx: RepoContext, params: {
		siteName: string
		logoUrl?: string | null
		contactPhone?: string | null
		contactWechat?: string | null
		icpFiling?: string | null
		copyright?: string | null
	}): Promise<SiteConfigDto>
}

/**
 * 公告 Repository 接口
 */
export interface AnnouncementRepository {
	/**
	 * 获取公告列表（分页，仅返回启用的公告）
	 */
	listActiveAnnouncements(ctx: RepoContext, params?: {
		limit?: number
		now?: string // 当前时间，用于过滤时间范围
	}): Promise<AnnouncementDto[]>

	/**
	 * 获取所有公告列表（管理员用，包含未启用的）
	 */
	listAllAnnouncements(ctx: RepoContext, params: {
		limit: number
		cursor?: string | null
	}): Promise<{ items: AnnouncementDto[]; nextCursor: string | null }>

	/**
	 * 根据 ID 获取公告
	 */
	getAnnouncementById(ctx: RepoContext, params: { announcementId: string }): Promise<AnnouncementDto | null>

	/**
	 * 创建公告
	 */
	createAnnouncement(ctx: RepoContext, params: {
		title: string
		content: string
		type: AnnouncementType
		isActive?: boolean
		priority?: number
		startAt?: string | null
		endAt?: string | null
	}): Promise<AnnouncementDto>

	/**
	 * 更新公告
	 */
	updateAnnouncement(ctx: RepoContext, params: {
		announcementId: string
		title?: string
		content?: string
		type?: AnnouncementType
		isActive?: boolean
		priority?: number
		startAt?: string | null
		endAt?: string | null
	}): Promise<AnnouncementDto | null>

	/**
	 * 删除公告
	 */
	deleteAnnouncement(ctx: RepoContext, params: { announcementId: string }): Promise<void>

	/**
	 * 切换公告启用状态
	 */
	toggleAnnouncementActive(ctx: RepoContext, params: {
		announcementId: string
		isActive: boolean
	}): Promise<AnnouncementDto | null>
}

/**
 * 协议 Repository 接口
 */
export interface AgreementRepository {
	/**
	 * 获取指定类型的有效协议
	 */
	getAgreementByType(ctx: RepoContext, params: { type: AgreementType }): Promise<AgreementDto | null>

	/**
	 * 获取所有协议列表（管理员用）
	 */
	listAllAgreements(ctx: RepoContext): Promise<AgreementDto[]>

	/**
	 * 根据 ID 获取协议
	 */
	getAgreementById(ctx: RepoContext, params: { agreementId: string }): Promise<AgreementDto | null>

	/**
	 * 创建或更新协议（同一类型只能有一条有效记录）
	 */
	upsertAgreement(ctx: RepoContext, params: {
		type: AgreementType
		title: string
		content: string
		version: string
		isActive?: boolean
		effectiveAt?: string
	}): Promise<AgreementDto>

	/**
	 * 更新协议
	 */
	updateAgreement(ctx: RepoContext, params: {
		agreementId: string
		title?: string
		content?: string
		version?: string
		isActive?: boolean
		effectiveAt?: string
	}): Promise<AgreementDto | null>

	/**
	 * 删除协议
	 */
	deleteAgreement(ctx: RepoContext, params: { agreementId: string }): Promise<void>
}
