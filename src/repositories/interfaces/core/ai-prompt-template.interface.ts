/**
 * AiPromptTemplate Repository Interface
 *
 * @module repositories/interfaces/core
 * @description AI Prompt 模板数据访问接口，遵循六层架构的 Repository 模式
 */

import type { RepoContext } from '@/types/repo/repo-context'

// ==================== DTO 类型 ====================

/**
 * AiPromptTemplate 数据传输对象
 *
 * Description: 从数据库映射的模板数据，供 Service 层使用
 */
export interface AiPromptTemplateDto {
  id: string
  slug: string
  name: string
  category: string
  content: string
  variables: string[]
  version: number
  isActive: boolean
  createdById: string | null
  createdAt: Date
}

/**
 * 创建模板版本的参数
 */
export interface CreateTemplateVersionParams {
  slug: string
  name: string
  category: string
  content: string
  variables: string[]
  createdById?: string
}

// ==================== Repository 接口 ====================

/**
 * Function: AiPromptTemplateRepository
 *
 * Description: AI Prompt 模板数据访问接口
 *   遵循 Repository 模式，隔离数据层与业务层
 */
export interface AiPromptTemplateRepository {
  /**
   * 获取活跃模板（最新版本）
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     slug(string): 模板唯一标识
   *
   * Returns:
   *   template(AiPromptTemplateDto | null): 活跃模板或 null
   */
  getActiveBySlug(ctx: RepoContext, params: { slug: string }): Promise<AiPromptTemplateDto | null>

  /**
   * 列出所有活跃模板
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     category(string, optional): 分类筛选
   *
   * Returns:
   *   templates(AiPromptTemplateDto[]): 活跃模板列表
   */
  listActive(ctx: RepoContext, params: { category?: string }): Promise<AiPromptTemplateDto[]>

  /**
   * 创建新版本
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(CreateTemplateVersionParams): 创建参数
   *
   * Returns:
   *   template(AiPromptTemplateDto): 新创建的模板
   */
  createVersion(ctx: RepoContext, params: CreateTemplateVersionParams): Promise<AiPromptTemplateDto>

  /**
   * 获取版本历史
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     slug(string): 模板唯一标识
   *
   * Returns:
   *   templates(AiPromptTemplateDto[]): 版本历史列表（按版本号降序）
   */
  getVersions(ctx: RepoContext, params: { slug: string }): Promise<AiPromptTemplateDto[]>

  /**
   * 获取指定版本
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 查询参数
   *     slug(string): 模板唯一标识
   *     version(number): 版本号
   *
   * Returns:
   *   template(AiPromptTemplateDto | null): 指定版本的模板
   */
  getBySlugAndVersion(ctx: RepoContext, params: { slug: string; version: number }): Promise<AiPromptTemplateDto | null>

  /**
   * 设置活跃版本（回滚时使用）
   *
   * Description: 将指定版本设为活跃，同时将其他版本设为非活跃
   *
   * Parameters:
   *   ctx(RepoContext): Repository 上下文
   *   params(object): 操作参数
   *     slug(string): 模板唯一标识
   *     version(number): 要激活的版本号
   */
  setActiveVersion(ctx: RepoContext, params: { slug: string; version: number }): Promise<void>
}
