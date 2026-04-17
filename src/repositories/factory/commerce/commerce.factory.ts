/**
 * Product & Commerce Repositories
 *
 * @module repositories/factory/commerce
 * @description 电商业务相关的 Repository 工厂函数
 *
 * 包含:
 * - ProductRepository: 商品管理
 * - CategoryRepository: 商品分类
 * - MediaAssetRepository: 媒体资源
 */

import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { CategoryRepository } from '@/plugins/ecommerce/repositories/interfaces/category.interface'
import type { MediaAssetRepository } from '@/repositories/interfaces/core/media-asset.interface'
import { createPrismaProductRepository } from '@/plugins/ecommerce/repositories/prisma/product.repository'
import { createPrismaCategoryRepository } from '@/plugins/ecommerce/repositories/prisma/category.repository'
import { createPrismaMediaAssetRepository } from '@/repositories/prisma/core/media-asset.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

/**
 * 创建商品仓库实例
 *
 * @returns Promise<ProductRepository> 商品仓库实例
 */
export async function createProductRepository(): Promise<ProductRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaProductRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseProductRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/product.repository')
    return createSupabaseProductRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建商品分类仓库实例
 *
 * @returns Promise<CategoryRepository> 商品分类仓库实例
 */
export async function createCategoryRepository(): Promise<CategoryRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaCategoryRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseCategoryRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/category.repository')
    return createSupabaseCategoryRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建媒体资源仓库实例
 *
 * @returns Promise<MediaAssetRepository> 媒体资源仓库实例
 */
export async function createMediaAssetRepository(): Promise<MediaAssetRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaMediaAssetRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseMediaAssetRepository } = await import(/* @vite-ignore */ '@/repositories/supabase/core/media-asset.repository')
    return createSupabaseMediaAssetRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
