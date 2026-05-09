import { prisma } from '@/lib/prisma'
import type { BlogArticleViewRepository } from '@/repositories/interfaces/content/blog-article-view.interface'
import type { RepoContext } from '@/types/repo/repo-context'

export function createPrismaBlogArticleViewRepository(): BlogArticleViewRepository {
  return {
    async create(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article-view.create', articleId: params.articleId }, '记录文章浏览')

      await prisma.blogArticleView.create({
        data: {
          articleId: params.articleId,
          viewerId: params.viewerId ?? null,
          ip: params.ip ?? null,
          userAgent: params.userAgent ?? null,
          referer: params.referer ?? null,
          readTime: params.readTime ?? 0,
        },
      })
    },

    async countByArticleId(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article-view.countByArticleId', articleId: params.articleId }, '统计文章浏览次数')

      return prisma.blogArticleView.count({
        where: { articleId: params.articleId },
      })
    },
  }
}
