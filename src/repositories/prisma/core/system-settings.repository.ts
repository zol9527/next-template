import { prisma } from '@/lib/prisma'
import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import type { RepoContext } from '@/types/repo/repo-context'

export function createPrismaSystemSettingsRepository(): SystemSettingsRepository {
  return {
    async getSetting<T = string>(ctx: RepoContext, params: { key: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_setting', key: params.key })

      const setting = await prisma.systemSetting.findUnique({ where: { key: params.key } })
      return setting?.value ? (setting.value as unknown as T) : null
    },

    async updateSetting<T = string>(ctx: RepoContext, params: { key: string; value: T }) {
      const { logger } = ctx
      logger.info({ action: 'update_setting', key: params.key })

      await prisma.systemSetting.upsert({
        where: { key: params.key },
        update: { value: params.value as string },
        create: { key: params.key, value: params.value as string },
      })
    },
  }
}
