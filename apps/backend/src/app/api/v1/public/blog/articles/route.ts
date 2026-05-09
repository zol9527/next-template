import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok } from '@/contracts/api-response.schema'
import { PublicBlogArticleListQuerySchema } from '@/contracts/dtos/public/blog/articles.dto'
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
 * Description: 公开博客文章列表接口（无需认证），返回已发布的文章列表，
 * 支持分页、关键词搜索、分类和标签筛选。
 *
 * Parameters:
 *   query(PublicBlogArticleListQuery): 查询参数（limit, cursor, keyword, categorySlug, tagSlug）
 *
 * Returns:
 *   Response: JSON 格式的已发布文章列表
 */
export const GET = withV1Route({
  schemas: { query: PublicBlogArticleListQuerySchema },
  handler: async ({ req, query, serviceContext }) => {
    const articles = await createBlogArticleRepository()
    const categories = await createBlogCategoryRepository()
    const tags = await createBlogTagRepository()
    const views = await createBlogArticleViewRepository()
    const service = createPublicBlogArticleService(
      { articles, categories, tags, views },
      serviceContext,
    )
    const data = await service.listPublishedArticles(query)
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
