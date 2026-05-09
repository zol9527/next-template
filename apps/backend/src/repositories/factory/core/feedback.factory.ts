import type { FeedbackRepository } from '@/repositories/interfaces/core/feedback.interface'
import { createPrismaFeedbackRepository } from '@/repositories/prisma/core/feedback.repo'

export async function createFeedbackRepository(): Promise<FeedbackRepository> {
  return createPrismaFeedbackRepository()
}
