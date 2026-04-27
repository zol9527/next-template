/**
 * Function: AI Config
 *
 * Description: 从 SystemSetting 读取 AI Provider 配置
 *   注意：此模块不直接导入 Prisma/Repository，通过注入的 getSetting 函数读取配置
 */

import type { AIProviderConfig, AIProviderName } from './types'

/** SystemSetting 存储 key 前缀 */
const AI_SETTING_PREFIX = 'ai.'

/**
 * Function: getProviderConfig
 *
 * Description: 从 SystemSetting 获取 AI Provider 配置
 *   通过注入函数读取配置，避免直接依赖 Repository 层
 *
 * Parameters:
 *   getSetting(Function): 读取 SystemSetting 的函数
 *   decryptApiKey(Function): 解密 API Key 的函数
 *   providerName(AIProviderName | undefined): Provider 名称，默认 minimax
 *
 * Returns:
 *   config(AIProviderConfig | null): Provider 配置，未找到时返回 null
 */
export async function getProviderConfig(
  getSetting: (key: string) => Promise<string | null>,
  decryptApiKey: (encrypted: string) => string,
  providerName?: AIProviderName
): Promise<AIProviderConfig | null> {
  const name = providerName ?? 'minimax'

  const configJson = await getSetting(`${AI_SETTING_PREFIX}provider.${name}`)
  if (!configJson) return null

  try {
    const raw = JSON.parse(configJson) as Record<string, unknown>

    return {
      provider: name,
      apiKey: decryptApiKey(raw.encryptedApiKey as string),
      baseUrl: (raw.baseUrl as string) ?? getProviderBaseUrl(name),
      textModel: (raw.textModel as string) ?? getProviderTextModel(name),
      imageModel: (raw.imageModel as string) ?? getProviderImageModel(name),
    }
  } catch {
    return null
  }
}

/**
 * Function: getDefaultProviderName
 *
 * Description: 获取默认 Provider 名称
 *
 * Parameters:
 *   getSetting(Function): 读取 SystemSetting 的函数
 *
 * Returns:
 *   name(AIProviderName): 默认 Provider 名称，回退到 minimax
 */
export async function getDefaultProviderName(
  getSetting: (key: string) => Promise<string | null>
): Promise<AIProviderName> {
  const name = await getSetting(`${AI_SETTING_PREFIX}default_provider`)
  return (name as AIProviderName) ?? 'minimax'
}

// ==================== 内部辅助 ====================

/** 各 Provider 默认 API 基础 URL */
function getProviderBaseUrl(name: AIProviderName): string {
  switch (name) {
    case 'minimax':
      return 'https://api.minimax.chat/v1'
    default:
      return ''
  }
}

/** 各 Provider 默认文本模型 */
function getProviderTextModel(name: AIProviderName): string {
  switch (name) {
    case 'minimax':
      return 'MiniMax-M2.7'
    default:
      return ''
  }
}

/** 各 Provider 默认图片模型 */
function getProviderImageModel(name: AIProviderName): string {
  switch (name) {
    case 'minimax':
      return 'image-01'
    default:
      return ''
  }
}
