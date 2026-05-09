import type { RepoContext } from '@/types/repo/repo-context'

export interface BlogArticleViewRepository {
  create(ctx: RepoContext, params: {
    articleId: string
    viewerId?: string | null
    ip?: string | null
    userAgent?: string | null
    referer?: string | null
    readTime?: number
  }): Promise<void>

  countByArticleId(ctx: RepoContext, params: { articleId: string }): Promise<number>
}
