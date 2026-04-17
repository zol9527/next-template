import type { MiniprogramCarouselRepository } from '@/plugins/wechat/repositories/interfaces/miniprogram-carousel.interface'
import { createPrismaMiniprogramCarouselRepository } from '@/plugins/wechat/repositories/prisma/miniprogram-carousel.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

/**
 * Function: createMiniprogramCarouselRepository
 *
 * Description: 创建小程序轮播图仓储实例，根据配置选择数据库提供商
 *
 * Returns:
 * 	repository(Promise<MiniprogramCarouselRepository>): MiniprogramCarouselRepository 实例
 */
export async function createMiniprogramCarouselRepository(): Promise<MiniprogramCarouselRepository> {
	const provider = getProvider()

	if (provider === PROVIDER_NAMES.PRISMA) {
		return createPrismaMiniprogramCarouselRepository()
	}

	if (provider === PROVIDER_NAMES.SUPABASE) {
		const { createSupabaseMiniprogramCarouselRepository } = await import(
			/* @vite-ignore */ '@/plugins/wechat/repositories/supabase/miniprogram-carousel.repository'
		)
		return createSupabaseMiniprogramCarouselRepository()
	}

	throw new Error(`Unsupported database provider: ${provider}`)
}
