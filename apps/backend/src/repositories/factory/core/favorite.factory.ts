import type { FavoriteRepository } from '@/repositories/interfaces/core/favorite.interface'
import { createPrismaFavoriteRepository } from '@/repositories/prisma/core/favorite.repo'

export async function createFavoriteRepository(): Promise<FavoriteRepository> {
  return createPrismaFavoriteRepository()
}
