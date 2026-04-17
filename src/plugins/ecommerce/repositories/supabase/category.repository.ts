import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import type { CategoryRepository } from '@/plugins/ecommerce/repositories/interfaces/category.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const CATEGORY_SELECT = 'id,parent_id,name,slug,status,sort_order,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

function mapCategory(row: Record<string, unknown>): AdminCategory {
  const id = getString(row, 'id')
  const name = getString(row, 'name')
  const status = getString(row, 'status')
  const sortOrder = getNumber(row, 'sort_order')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')

  if (!id || !name || !status || sortOrder === null || !createdAt || !updatedAt) {
    throw new Error('Invalid category row')
  }

  return {
    id,
    parentId: getString(row, 'parent_id'),
    name,
    slug: getString(row, 'slug') ?? undefined,
    status: status as 'active' | 'disabled',
    sortOrder: sortOrder,
    createdAt: createdAt,
    updatedAt: updatedAt,
  }
}

/**
Function: createSupabaseCategoryRepository

Description: 创建基于 Supabase（Service Role）的分类数据仓储实现，负责 categories/product_categories 的读写与约束查询

Parameters:

Returns:
    repository(CategoryRepository): CategoryRepository 的 Supabase 实现
*/
export function createSupabaseCategoryRepository(): CategoryRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async listCategories(ctx: RepoContext, params?: { search?: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_categories', search: params?.search })

      let query = supabase
        .from('categories')
        .select(CATEGORY_SELECT)

      if (params?.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      const { data, error } = await query
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []).map((r) => mapCategory(r as unknown as Record<string, unknown>))
    },

    async getCategoryById(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_category_by_id', categoryId: params.categoryId })

      const { data, error } = await supabase.from('categories').select(CATEGORY_SELECT).eq('id', params.categoryId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapCategory(data as unknown as Record<string, unknown>)
    },

    async existsCategoryNameInLevel(ctx: RepoContext, params: { name: string; parentId: string | null; excludeCategoryId?: string }) {
      const { logger } = ctx
      logger.info({ action: 'exists_category_name_in_level', name: params.name, parentId: params.parentId })

      let query = supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('name', params.name)
        .eq('parent_id', params.parentId)

      if (params.excludeCategoryId) {
        query = query.neq('id', params.excludeCategoryId)
      }

      const { count, error } = await query
      if (error) throw error
      return (count ?? 0) > 0
    },

    async createCategory(ctx: RepoContext, params: { name: string; slug?: string | null; parentId?: string | null; status?: string; sortOrder?: number }) {
      const { logger } = ctx
      logger.info({ action: 'create_category', name: params.name })

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: params.name,
          slug: params.slug,
          parent_id: params.parentId ?? null,
          status: params.status ?? 'active',
          sort_order: params.sortOrder ?? 0,
        })
        .select(CATEGORY_SELECT)
        .single()

      if (error) throw error
      return mapCategory(data as unknown as Record<string, unknown>)
    },

    async updateCategory(ctx: RepoContext, params: { categoryId: string; name?: string; slug?: string | null; parentId?: string | null; status?: string; sortOrder?: number }) {
      const { logger } = ctx
      logger.info({ action: 'update_category', categoryId: params.categoryId })

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (typeof params.name === 'string') updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.parentId !== undefined) updates.parent_id = params.parentId
      if (typeof params.status === 'string') updates.status = params.status
      if (typeof params.sortOrder === 'number') updates.sort_order = params.sortOrder

      const { data, error } = await supabase.from('categories').update(updates).eq('id', params.categoryId).select(CATEGORY_SELECT).maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapCategory(data as unknown as Record<string, unknown>)
    },

    async deleteCategory(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_category', categoryId: params.categoryId })

      const { error } = await supabase.from('categories').delete().eq('id', params.categoryId)
      if (error) throw error
    },

    async hasChildCategories(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'has_child_categories', categoryId: params.categoryId })

      const { count, error } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', params.categoryId)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async countProductsInCategory(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_products_in_category', categoryId: params.categoryId })

      const { count, error } = await supabase
        .from('product_categories')
        .select('product_id', { count: 'exact', head: true })
        .eq('category_id', params.categoryId)

      if (error) throw error
      return count ?? 0
    },
  }
}
