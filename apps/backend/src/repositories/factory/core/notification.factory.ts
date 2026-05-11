/**
 * File: notification.factory.ts
 * Description: 通知 Repository 工厂
 */

import type { NotificationRepository } from '@/repositories/interfaces/core/notification.interface'
import { createPrismaNotificationRepository } from '@/repositories/prisma/core/notification.repo'

export async function createNotificationRepository(): Promise<NotificationRepository> {
  return createPrismaNotificationRepository()
}
