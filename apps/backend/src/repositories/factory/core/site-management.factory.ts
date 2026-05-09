/**
 * Site Management Repositories
 *
 * @module repositories/factory/site-management
 * @description 站点管理相关的 Repository 工厂函数
 *
 * 包含:
 * - SiteConfigRepository: 站点配置
 * - AnnouncementRepository: 公告管理
 * - AgreementRepository: 协议管理
 */

import type { SiteConfigRepository } from '@/repositories/interfaces/core/site-management.interface'
import type { AnnouncementRepository } from '@/repositories/interfaces/core/site-management.interface'
import type { AgreementRepository } from '@/repositories/interfaces/core/site-management.interface'
import { createPrismaSiteConfigRepository } from '@/repositories/prisma/core/site-management.repository'
import { createPrismaAnnouncementRepository } from '@/repositories/prisma/core/site-management.repository'
import { createPrismaAgreementRepository } from '@/repositories/prisma/core/site-management.repository'
import { getProvider, PROVIDER_NAMES } from './core.factory'

export async function createSiteConfigRepository(): Promise<SiteConfigRepository> {
	const provider = getProvider()

	if (provider === PROVIDER_NAMES.PRISMA) {
		return createPrismaSiteConfigRepository()
	}

	if (provider === PROVIDER_NAMES.SUPABASE) {
		const { createSupabaseSiteConfigRepository } = await import(
			/* @vite-ignore */ '@/repositories/supabase/core/site-management.repository'
		)
		return createSupabaseSiteConfigRepository()
	}

	throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createAnnouncementRepository(): Promise<AnnouncementRepository> {
	const provider = getProvider()

	if (provider === PROVIDER_NAMES.PRISMA) {
		return createPrismaAnnouncementRepository()
	}

	if (provider === PROVIDER_NAMES.SUPABASE) {
		const { createSupabaseAnnouncementRepository } = await import(
			/* @vite-ignore */ '@/repositories/supabase/core/site-management.repository'
		)
		return createSupabaseAnnouncementRepository()
	}

	throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createAgreementRepository(): Promise<AgreementRepository> {
	const provider = getProvider()

	if (provider === PROVIDER_NAMES.PRISMA) {
		return createPrismaAgreementRepository()
	}

	if (provider === PROVIDER_NAMES.SUPABASE) {
		const { createSupabaseAgreementRepository } = await import(
			/* @vite-ignore */ '@/repositories/supabase/core/site-management.repository'
		)
		return createSupabaseAgreementRepository()
	}

	throw new Error(`Unsupported database provider: ${provider}`)
}
