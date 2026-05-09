import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AiProviderConfigRequestSchema } from '@/contracts/ai-settings.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { AiKeyEncryption, maskApiKey } from '@/lib/ai/core/encryption'

const SETTING_KEY_PREFIX = 'ai.provider.'

interface ProviderConfig {
  provider: string
  baseUrl?: string
  encryptedApiKey: string
  textModel?: string
  imageModel?: string
}

/**
 * Function: GET
 *
 * Description: 获取 AI Provider 配置（API Key 脱敏）
 *
 * Returns:
 * 	Response: Provider 配置信息
 */
export const GET = withV1Route({
  action: 'admin:ai:settings:read',
  requireAccess: { action: 'read' as Action, scope: 'ai.settings' as Scope },
  handler: async ({ serviceContext, req }) => {
    const repo = await createSystemSettingsRepository()
    const settingKey = `${SETTING_KEY_PREFIX}minimax`

    const raw = await repo.getSetting<string>(serviceContext, { key: settingKey })
    const config: ProviderConfig | null = raw ? JSON.parse(raw) : null

    if (!config) {
      return createJsonApiResponse(req, ok({
        provider: 'minimax',
        baseUrl: '',
        apiKey: '',
        textModel: '',
        imageModel: '',
        isConfigured: false,
      }))
    }

    // G3: 解密后脱敏，确保不返回明文 API Key
    let maskedKey = ''
    try {
      const plaintext = AiKeyEncryption.decrypt(config.encryptedApiKey)
      maskedKey = maskApiKey(plaintext)
    } catch {
      maskedKey = '[无效密钥]'
    }

    return createJsonApiResponse(req, ok({
      provider: config.provider,
      baseUrl: config.baseUrl ?? '',
      apiKey: maskedKey,
      textModel: config.textModel ?? '',
      imageModel: config.imageModel ?? '',
      isConfigured: true,
    }))
  },
})

/**
 * Function: PUT
 *
 * Description: 更新 AI Provider 配置
 *   API Key 使用 AES-256-GCM 加密后存储（G4）
 *
 * Returns:
 * 	Response: 更新后的配置信息（API Key 脱敏）
 */
export const PUT = withV1Route({
  action: 'admin:ai:settings:write',
  schemas: { body: AiProviderConfigRequestSchema },
  requireAccess: { action: 'write' as Action, scope: 'ai.settings' as Scope },
  handler: async ({ body, serviceContext, req }) => {
    const repo = await createSystemSettingsRepository()

    // G4: 加密 API Key 后存储，禁止明文落库
    const encryptedApiKey = AiKeyEncryption.encrypt(body!.apiKey)
    const settingKey = `${SETTING_KEY_PREFIX}${body!.provider}`

    const config: ProviderConfig = {
      provider: body!.provider,
      baseUrl: body!.baseUrl,
      encryptedApiKey,
      textModel: body!.textModel,
      imageModel: body!.imageModel,
    }

    // Prisma SystemSetting.value 是 String 类型，需要 JSON 序列化
    await repo.updateSetting(serviceContext, { key: settingKey, value: JSON.stringify(config) as unknown as ProviderConfig })

    return createJsonApiResponse(req, ok({
      provider: config.provider,
      baseUrl: config.baseUrl ?? '',
      apiKey: maskApiKey(body!.apiKey),
      textModel: config.textModel ?? '',
      imageModel: config.imageModel ?? '',
      isConfigured: true,
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
