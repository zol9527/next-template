import type {
	PublicSiteConfig,
	PublicAnnouncement,
	PublicAgreement,
	PublicConfigResponse,
} from '@/contracts/dtos/public/site-config.dto'
import type {
	SiteConfigRepository,
	AnnouncementRepository,
	AgreementRepository,
	AgreementType,
} from '@/repositories/interfaces/core/site-management.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { memoryCache, CACHE_TTL } from '@/lib/cache/memory-cache'

/**
 * Function: createPublicSiteConfigService
 *
 * Description: 创建公共站点配置服务，为小程序端提供配置数据
 *
 * Parameters:
 *     deps({
 *       siteConfig: SiteConfigRepository
 *       announcements: AnnouncementRepository
 *       agreements: AgreementRepository
 *     }): 依赖注入的 Repository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供获取配置的服务对象
 */
export function createPublicSiteConfigService(
	deps: {
		siteConfig: SiteConfigRepository
		announcements: AnnouncementRepository
		agreements: AgreementRepository
	},
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
		async getSiteConfig(): Promise<PublicSiteConfig | null> {
			const cacheKey = 'site:config'
			const cached = memoryCache.get<PublicSiteConfig | null>(cacheKey)
			if (cached !== undefined) {
				logger.debug({ action: 'public_site_config.get', cacheHit: true })
				return cached
			}

			const config = await deps.siteConfig.getSiteConfig(repoCtx)
			if (!config) {
				memoryCache.set(cacheKey, null, CACHE_TTL.SITE_CONFIG)
				return null
			}

			const result: PublicSiteConfig = {
				siteName: config.siteName,
				logoUrl: config.logoUrl,
				contactPhone: config.contactPhone,
				contactWechat: config.contactWechat,
				contactEmail: config.contactEmail,
				icpFiling: config.icpFiling,
				copyright: config.copyright,
				updatedAt: config.updatedAt,
			}

			memoryCache.set(cacheKey, result, CACHE_TTL.SITE_CONFIG)

			return result
		},

		/**
		 * 获取有效公告列表
		 */
		async getActiveAnnouncements(params?: {
			limit?: number
			now?: string
		}): Promise<PublicAnnouncement[]> {
			const limit = params?.limit ?? 20
			const now = params?.now ?? new Date().toISOString()

			const announcements = await deps.announcements.listActiveAnnouncements(repoCtx, {
				limit,
				now,
			})

			logger.info({
				action: 'public_announcement.list_active',
				count: announcements.length,
			})

			return announcements.map((item) => ({
				id: item.id,
				title: item.title,
				content: item.content,
				type: item.type,
				priority: item.priority,
			}))
		},

		/**
		 * 根据类型获取有效协议
		 */
		async getAgreementByType(type: AgreementType): Promise<PublicAgreement | null> {
			const agreement = await deps.agreements.getAgreementByType(repoCtx, { type })
			if (!agreement) return null

			logger.info({
				action: 'public_agreement.get_by_type',
				type,
			})

			return {
				type: agreement.type,
				title: agreement.title,
				content: agreement.content,
				version: agreement.version,
				effectiveAt: agreement.effectiveAt,
			}
		},

		/**
		 * 获取所有有效协议（以映射形式返回）
		 */
		async getAllAgreements(): Promise<Record<AgreementType, PublicAgreement | null>> {
			const types: AgreementType[] = ['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US']

			const agreements = await Promise.all(
				types.map((type) => deps.agreements.getAgreementByType(repoCtx, { type })),
			)

			const result: Record<AgreementType, PublicAgreement | null> = {
				USER_AGREEMENT: null,
				PRIVACY_POLICY: null,
				ABOUT_US: null,
			}

			agreements.forEach((agreement, index) => {
				const type = types[index]
				if (agreement) {
					result[type] = {
						type: agreement.type,
						title: agreement.title,
						content: agreement.content,
						version: agreement.version,
						effectiveAt: agreement.effectiveAt,
					}
				}
			})

			logger.info({
				action: 'public_agreement.get_all',
				count: Object.values(result).filter((a) => a !== null).length,
			})

			return result
		},

		/**
		 * 获取统一配置响应（包含站点配置、公告列表和协议映射）
		 * 用于小程序一次性拉取所有配置
		 */
		async getUnifiedConfig(): Promise<PublicConfigResponse> {
			const [siteConfig, announcements, agreements] = await Promise.all([
				deps.siteConfig.getSiteConfig(repoCtx),
				deps.announcements.listActiveAnnouncements(repoCtx, {
					limit: 50,
					now: new Date().toISOString(),
				}),
				Promise.all([
					deps.agreements.getAgreementByType(repoCtx, { type: 'USER_AGREEMENT' }),
					deps.agreements.getAgreementByType(repoCtx, { type: 'PRIVACY_POLICY' }),
					deps.agreements.getAgreementByType(repoCtx, { type: 'ABOUT_US' }),
				]),
			])

			const publicSiteConfig: PublicSiteConfig = siteConfig
				? {
					siteName: siteConfig.siteName,
					logoUrl: siteConfig.logoUrl,
					contactPhone: siteConfig.contactPhone,
					contactWechat: siteConfig.contactWechat,
					contactEmail: siteConfig.contactEmail,
					icpFiling: siteConfig.icpFiling,
					copyright: siteConfig.copyright,
					updatedAt: siteConfig.updatedAt,
				}
				: {
					siteName: '',
					logoUrl: null,
					contactPhone: null,
					contactWechat: null,
					contactEmail: null,
					icpFiling: null,
					copyright: null,
					updatedAt: new Date().toISOString(),
				}

			const publicAnnouncements = announcements.map((item) => ({
				id: item.id,
				title: item.title,
				content: item.content,
				type: item.type,
				priority: item.priority,
			}))

			const publicAgreements: Record<AgreementType, PublicAgreement | null> = {
				USER_AGREEMENT: agreements[0]
					? {
						type: agreements[0].type,
						title: agreements[0].title,
						content: agreements[0].content,
						version: agreements[0].version,
						effectiveAt: agreements[0].effectiveAt,
					}
					: null,
				PRIVACY_POLICY: agreements[1]
					? {
						type: agreements[1].type,
						title: agreements[1].title,
						content: agreements[1].content,
						version: agreements[1].version,
						effectiveAt: agreements[1].effectiveAt,
					}
					: null,
				ABOUT_US: agreements[2]
					? {
						type: agreements[2].type,
						title: agreements[2].title,
						content: agreements[2].content,
						version: agreements[2].version,
						effectiveAt: agreements[2].effectiveAt,
					}
					: null,
			}

			logger.info({
				action: 'public_config.get_unified',
				hasSiteConfig: !!siteConfig,
				announcementCount: publicAnnouncements.length,
				agreementCount: Object.values(publicAgreements).filter((a) => a !== null).length,
			})

			return {
				siteConfig: publicSiteConfig,
				announcements: publicAnnouncements,
				agreements: publicAgreements,
			}
		},
	}
}

export type PublicSiteConfigService = ReturnType<typeof createPublicSiteConfigService>
