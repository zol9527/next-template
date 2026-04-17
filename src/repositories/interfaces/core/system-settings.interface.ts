import type { RepoContext } from '@/types/repo/repo-context'

export interface SystemSettingsRepository {
  getSetting<T>(ctx: RepoContext, params: { key: string }): Promise<T | null>
  updateSetting<T>(ctx: RepoContext, params: { key: string; value: T }): Promise<void>
}
