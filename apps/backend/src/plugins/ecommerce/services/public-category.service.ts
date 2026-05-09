import type { PublicCategory, PublicCategoryListResponse } from '@/plugins/ecommerce/contracts/public-categories.dto'
import type { CategoryRepository } from '@/plugins/ecommerce/repositories/interfaces/category.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

function mapPublicCategory(record: { id: string; name: string; parentId: string | null; sortOrder: number }): PublicCategory {
  return {
    id: record.id,
    name: record.name,
    parentId: record.parentId,
    sortOrder: record.sortOrder,
    // Future: Add icon if DB supports it
    icon: null
  }
}

/**
Function: createPublicCategoryService

Description: 创建公开分类服务，面向小程序用户

Parameters:
    deps({ categories: CategoryRepository }): 依赖注入的 CategoryRepository
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 listCategories 的服务对象
*/
export function createPublicCategoryService(
  deps: { categories: CategoryRepository },
  ctx: ServiceContext,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listCategories(): Promise<PublicCategoryListResponse> {
      const allCategories = await deps.categories.listCategories(repoCtx)

      // Filter active categories
      const activeCategories = allCategories.filter(c => c.status === 'active')

      return {
        items: activeCategories.map(mapPublicCategory)
      }
    }
  }
}
