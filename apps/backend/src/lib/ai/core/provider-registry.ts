/**
 * Function: Provider Registry
 *
 * Description: AI Provider 注册表，管理文本和图片 Provider 实例
 */

import type { IAITextProvider, IAIImageProvider, AIProviderName } from './types'

interface ProviderEntry {
  text?: IAITextProvider
  image?: IAIImageProvider
}

const registry = new Map<AIProviderName, ProviderEntry>()
let defaultProvider: AIProviderName | null = null

/**
 * Function: registerProvider
 *
 * Description: 注册 AI Provider 到注册表
 *
 * Parameters:
 *   name(AIProviderName): Provider 名称
 *   options(object): 注册选项
 *     options.text(IAITextProvider): 文本生成 Provider
 *     options.image(IAIImageProvider): 图片生成 Provider
 *     options.isDefault(boolean): 是否设为默认 Provider
 */
export function registerProvider(
  name: AIProviderName,
  options: {
    text?: IAITextProvider
    image?: IAIImageProvider
    isDefault?: boolean
  }
): void {
  const existing = registry.get(name)
  registry.set(name, {
    text: options.text ?? existing?.text,
    image: options.image ?? existing?.image,
  })
  if (options.isDefault || defaultProvider === null) {
    defaultProvider = name
  }
}

/**
 * Function: getTextProvider
 *
 * Description: 获取文本生成 Provider
 *
 * Parameters:
 *   name(AIProviderName | undefined): Provider 名称，不传则使用默认
 *
 * Returns:
 *   provider(IAITextProvider | undefined): 文本 Provider 实例
 */
export function getTextProvider(name?: AIProviderName): IAITextProvider | undefined {
  const providerName = name ?? defaultProvider ?? undefined
  if (!providerName) return undefined
  return registry.get(providerName)?.text
}

/**
 * Function: getImageProvider
 *
 * Description: 获取图片生成 Provider
 *
 * Parameters:
 *   name(AIProviderName | undefined): Provider 名称，不传则使用默认
 *
 * Returns:
 *   provider(IAIImageProvider | undefined): 图片 Provider 实例
 */
export function getImageProvider(name?: AIProviderName): IAIImageProvider | undefined {
  const providerName = name ?? defaultProvider ?? undefined
  if (!providerName) return undefined
  return registry.get(providerName)?.image
}

/**
 * Function: getDefaultProviderName
 *
 * Description: 获取默认 Provider 名称
 *
 * Returns:
 *   name(AIProviderName | null): 默认 Provider 名称
 */
export function getDefaultProviderName(): AIProviderName | null {
  return defaultProvider
}

/**
 * Function: listAvailableProviders
 *
 * Description: 列出所有已注册的 Provider 名称
 *
 * Returns:
 *   names(AIProviderName[]): Provider 名称列表
 */
export function listAvailableProviders(): AIProviderName[] {
  return Array.from(registry.keys())
}

/**
 * Function: clearProviders
 *
 * Description: 清除所有已注册的 Provider（测试用）
 */
export function clearProviders(): void {
  registry.clear()
  defaultProvider = null
}
