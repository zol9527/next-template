import type { RepoContext } from '@/types/repo/repo-context'

export type FeedbackUserSummary = {
  id: string
  username: string | null
  nickname: string | null
  phone: string | null
  avatarUrl: string | null
  sourcePlatform: string
}

export interface FeedbackRepository {
  /** 创建反馈 */
  create(ctx: RepoContext, params: {
    userId: string
    type: string  // 'suggestion' | 'bug' | 'other'
    title: string
    content: string
    images?: string[] | null
  }): Promise<{
    id: string
    userId: string
    type: string
    title: string
    content: string
    images: string[]
    status: string
    createdAt: string
    updatedAt: string
  }>

  /** 根据 ID 查找反馈（含回复） */
  findById(ctx: RepoContext, params: {
    id: string
  }): Promise<{
    id: string
    userId: string
    type: string
    title: string
    content: string
    images: string[]
    status: string
    createdAt: string
    updatedAt: string
    user?: FeedbackUserSummary
    replies: Array<{
      id: string
      feedbackId: string
      adminId: string
      content: string
      createdAt: string
    }>
  } | null>

  /** 用户反馈列表（cursor 分页） */
  listByUser(ctx: RepoContext, params: {
    userId: string
    cursor?: string | null
    limit: number
    status?: string | null
    keyword?: string | null
  }): Promise<{
    items: Array<{
      id: string
      userId: string
      type: string
      title: string
      content: string
      images: string[]
      status: string
      createdAt: string
      updatedAt: string
    }>
    nextCursor: string | null
    hasMore: boolean
  }>

  /** 更新反馈状态 */
  updateStatus(ctx: RepoContext, params: {
    id: string
    status: string
  }): Promise<{
    id: string
    status: string
    updatedAt: string
  }>

  /** 管理端反馈列表（所有用户，cursor 分页） */
  listAll(ctx: RepoContext, params: {
    cursor?: string | null
    limit: number
    status?: string | null
  }): Promise<{
    items: Array<{
      id: string
      userId: string
      type: string
      title: string
      content: string
      images: string[]
      status: string
      createdAt: string
      updatedAt: string
      // 包含用户基本信息
      user: FeedbackUserSummary
    }>
    nextCursor: string | null
    hasMore: boolean
  }>

  /** 创建回复 */
  createReply(ctx: RepoContext, params: {
    feedbackId: string
    adminId: string
    content: string
  }): Promise<{
    id: string
    feedbackId: string
    adminId: string
    content: string
    createdAt: string
  }>

  /** 查找反馈的所有回复 */
  findRepliesByFeedbackId(ctx: RepoContext, params: {
    feedbackId: string
  }): Promise<Array<{
    id: string
    feedbackId: string
    adminId: string
    content: string
    createdAt: string
  }>>
}
