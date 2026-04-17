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
 * Function: TrackViewBodySchema
 *
 * Description: 阅读记录请求体校验 schema
 *
 * Parameters:
 *   readTime(number): 阅读时长（秒），默认 0
 *   referer(string | null): 来源页面 URL，可选
 */
const TrackViewBodySchema = z.object({
  readTime: z.number().int().min(0).optional().default(0),
  referer: z.string().nullable().optional(),
})

/**
 * Function: POST
 *
 * Description: 记录文章阅读数据（无需认证）。从请求头中提取 IP 和 User-Agent
 * 用于防刷判断。如果文章不存在，返回 404。
 *
 * Parameters:
 *   params.slug(string): 文章的唯一 slug 标识
 *   body.readTime(number): 阅读时长（秒）
 *   body.referer(string | null): 来源页面
 *
 * Returns:
 *   Response: JSON 格式的阅读记录结果，或 404 错误
 */
export const POST = withV1Route({
  schemas: { params: SlugParamsSchema, body: TrackViewBodySchema },
  handler: async ({ req, params, body, serviceContext }) => {
    const articles = await createBlogArticleRepository()
    const categories = await createBlogCategoryRepository()
    const tags = await createBlogTagRepository()
    const views = await createBlogArticleViewRepository()
    const service = createPublicBlogArticleService(
      { articles, categories, tags, views },
      serviceContext,
    )

    // 通过 slug 查找文章，验证存在且已发布
    const article = await service.getArticleBySlug(params.slug)
    if (!article) {
      return createJsonApiResponse(
        req,
        fail('NOT_FOUND', '文章不存在或未发布'),
        { status: 404 },
      )
    }

    // 从请求头中提取客户端 IP 和 User-Agent，用于防刷
    const ip =
      req.headers.get('x-forwarded-for') ??
      req.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = req.headers.get('user-agent') ?? 'unknown'

    const result = await service.trackView({
      articleId: article.id,
      readTime: body?.readTime ?? 0,
      referer: body?.referer ?? req.headers.get('referer') ?? null,
      ip: typeof ip === 'string' ? ip : 'unknown',
      userAgent,
      viewerId: null, // 公开 API 无用户 ID
    })
    return createJsonApiResponse(req, ok(result))
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
