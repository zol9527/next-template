import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

/**
Function: createSupabaseSystemSettingsRepository

Description: 创建基于 Supabase（Service Role）的系统设置仓储实现

Parameters:

Returns:
    repository(SystemSettingsRepository): SystemSettingsRepository 的 Supabase 实现
*/
export function createSupabaseSystemSettingsRepository(): SystemSettingsRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getSetting<T = string>(ctx: RepoContext, params: { key: string }): Promise<T | null> {
      const { logger } = ctx
      logger.info({ action: 'get_setting', key: params.key })

      const { data, error } = await supabase.from('system_settings').select('value').eq('key', params.key).maybeSingle()
      if (error) throw error
      return (data?.value as T) ?? null
    },

    async updateSetting<T = string>(ctx: RepoContext, params: { key: string; value: T }) {
      const { logger } = ctx
      logger.info({ action: 'update_setting', key: params.key })

      const { error } = await supabase.from('system_settings').upsert({ key: params.key, value: params.value }, { onConflict: 'key' })
      if (error) throw error
    },
  }
}
