import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok } from '@/contracts/api-response.schema'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
  createBlogArticleRepository,
  createBlogCategoryRepository,
  createBlogTagRepository,
  createBlogArticleViewRepository,
} from '@/repositories/factory'
import { createPublicBlogArticleService } from '@/services/content/public-blog-article.service'

/**
 * Function: GET
 *
 * Description: 公开博客分类列表接口（无需认证），仅返回包含已发布文章的分类。
 *
 * Returns:
 *   Response: JSON 格式的分类列表
 */
export const GET = withV1Route({
  handler: async ({ req, serviceContext }) => {
    const articles = await createBlogArticleRepository()
    const categories = await createBlogCategoryRepository()
    const tags = await createBlogTagRepository()
    const views = await createBlogArticleViewRepository()
    const service = createPublicBlogArticleService(
      { articles, categories, tags, views },
      serviceContext,
    )
    const data = await service.listCategories()
    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * Function: OPTIONS
 *
 * Description: 标准预检请求响应
 */
export function OPTIONS(req: Request) {
  return createOptionsResponse(req as never)
}
