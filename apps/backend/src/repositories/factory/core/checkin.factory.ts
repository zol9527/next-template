import type { CheckinRepository } from '@/repositories/interfaces/core/checkin.interface'
import { createPrismaCheckinRepository } from '@/repositories/prisma/core/checkin.repo'

export async function createCheckinRepository(): Promise<CheckinRepository> {
  return createPrismaCheckinRepository()
}
