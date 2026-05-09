/**
 * AI Repositories
 *
 * @module repositories/factory/ai
 * @description AI 功能相关的 Repository 工厂函数
 *
 * 包含:
 * - AiUsageLogRepository: AI 使用日志
 * - AiPromptTemplateRepository: AI Prompt 模板
 */

import { getProvider, PROVIDER_NAMES } from './core.factory'
import { createPrismaAiUsageLogRepository } from '@/repositories/prisma/core/ai-usage-log.repository'
import { createPrismaAiPromptTemplateRepository } from '@/repositories/prisma/core/ai-prompt-template.repository'

/**
 * Function: createAiUsageLogRepository
 *
 * Description: 根据当前数据库提供商创建 AI 使用日志 Repository
 *
 * Returns:
 *   repository(AiUsageLogRepository): Repository 实例
 */
export async function createAiUsageLogRepository() {
  const provider = await getProvider()
  switch (provider) {
    case PROVIDER_NAMES.PRISMA:
      return createPrismaAiUsageLogRepository()
    default:
      return createPrismaAiUsageLogRepository()
  }
}

/**
 * Function: createAiPromptTemplateRepository
 *
 * Description: 根据当前数据库提供商创建 AI Prompt 模板 Repository
 *
 * Returns:
 *   repository(AiPromptTemplateRepository): Repository 实例
 */
export async function createAiPromptTemplateRepository() {
  const provider = await getProvider()
  switch (provider) {
    case PROVIDER_NAMES.PRISMA:
      return createPrismaAiPromptTemplateRepository()
    default:
      return createPrismaAiPromptTemplateRepository()
  }
}
