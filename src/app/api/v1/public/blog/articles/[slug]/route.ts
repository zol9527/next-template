import { z } from 'zod'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { ok, fail } from '@/contracts/api-response.schema'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
  createBlogArticleRepository,
  createBlogCategoryRepository,
  createBlogTagRepository,
  createBlogArticleViewRepository,
} from '@/repositories/factory'
import { createPublicBlogArticleService } from '@/services/content/public-blog-article.service'

/**
 * Function: SlugParamsSchema
 *
 * Description: URL 参数校验 schema，slug 为非空字符串
 */
const SlugParamsSchema = z.object({
  slug: z.string().min(1),
})

/**
 * Function: GET
 *
 * Description: 公开博客文章详情接口（无需认证），通过 slug 获取已发布文章。
 * 如果文章不存在或未发布，返回 404。
 *
 * Parameters:
 *   params.slug(string): 文章的唯一 slug 标识
 *
 * Returns:
 *   Response: JSON 格式的文章详情，或 404 错误
 */
export const GET = withV1Route({
  schemas: { params: SlugParamsSchema },
  handler: async ({ req, params, serviceContext }) => {
    const articles = await createBlogArticleRepository()
    const categories = await createBlogCategoryRepository()
    const tags = await createBlogTagRepository()
    const views = await createBlogArticleViewRepository()
    const service = createPublicBlogArticleService(
      { articles, categories, tags, views },
      serviceContext,
    )
    const article = await service.getArticleBySlug(params.slug)
    if (!article) {
      return createJsonApiResponse(
        req,
        fail('NOT_FOUND', '文章不存在或未发布'),
        { status: 404 },
      )
    }
    return createJsonApiResponse(req, ok(article))
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
