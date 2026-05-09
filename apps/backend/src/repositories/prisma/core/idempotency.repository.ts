import { prisma } from '@/lib/prisma'
import type { IdempotencyRepository } from '@/repositories/interfaces/core/idempotency.interface'
import type { IdempotencyRequest } from '@/contracts/dtos/idempotency.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function serializeResponseBody(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ value: String(value) })
  }
}

function parseResponseBody(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function mapRequest(r: Record<string, unknown>): IdempotencyRequest {
  const createdAt = r.createdAt
  const updatedAt = r.updatedAt
  const expiresAt = r.expiresAt

  const normalizedCreatedAt = createdAt instanceof Date
    ? createdAt.toISOString()
    : (typeof createdAt === 'string' ? createdAt : '')

  const normalizedUpdatedAt = updatedAt instanceof Date
    ? updatedAt.toISOString()
    : (typeof updatedAt === 'string' ? updatedAt : '')

  const normalizedExpiresAt = expiresAt instanceof Date
    ? expiresAt.toISOString()
    : (typeof expiresAt === 'string' ? expiresAt : '')

  return {
    id: r.id as string,
    userId: r.userId as string,
    action: r.action as string,
    idempotencyKey: r.idempotencyKey as string,
    requestHash: r.requestHash as string,
    status: r.status as 'pending' | 'succeeded' | 'failed',
    resourceType: (r.resourceType as string | null) ?? null,
    resourceId: (r.resourceId as string | null) ?? null,
    responseCode: (r.responseCode as number | null) ?? null,
    responseBody: parseResponseBody(r.responseBody),
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    expiresAt: normalizedExpiresAt,
  }
}

export function createPrismaIdempotencyRepository(): IdempotencyRepository {
  return {
    async getRequest(ctx: RepoContext, params: { userId: string; action: string; idempotencyKey: string }) {
      const { logger } = ctx
      logger.info({ userId: params.userId, action: params.action })

      const request = await prisma.idempotencyRequest.findFirst({
        where: { userId: params.userId, action: params.action, idempotencyKey: params.idempotencyKey },
      })
      return request ? mapRequest(request) : null
    },

    async createRequest(ctx: RepoContext, params: { userId: string; action: string; idempotencyKey: string; requestHash: string; expiresAt: string; createdAt: string }) {
      const { logger } = ctx
      logger.info({ userId: params.userId, action: params.action })

      const request = await prisma.idempotencyRequest.create({
        data: {
          userId: params.userId,
          action: params.action,
          idempotencyKey: params.idempotencyKey,
          requestHash: params.requestHash,
          status: 'pending',
          expiresAt: new Date(params.expiresAt),
          createdAt: new Date(params.createdAt),
          updatedAt: new Date(params.createdAt),
        },
      })
      return mapRequest(request)
    },

    async markSucceeded(ctx: RepoContext, params: { id: string; resourceType?: string | null; resourceId?: string | null; responseCode?: number | null; responseBody?: unknown; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_succeeded', id: params.id })

      const request = await prisma.idempotencyRequest.update({
        where: { id: params.id },
        data: {
          status: 'succeeded',
          resourceType: params.resourceType ?? null,
          resourceId: params.resourceId ?? null,
          responseCode: params.responseCode ?? null,
          responseBody: serializeResponseBody(params.responseBody),
          updatedAt: new Date(params.updatedAt),
        },
      })
      return mapRequest(request)
    },

    async markFailed(ctx: RepoContext, params: { id: string; responseCode?: number | null; responseBody?: unknown; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_failed', id: params.id })

      const request = await prisma.idempotencyRequest.update({
        where: { id: params.id },
        data: {
          status: 'failed',
          responseCode: params.responseCode ?? null,
          responseBody: serializeResponseBody(params.responseBody),
          updatedAt: new Date(params.updatedAt),
        },
      })
      return mapRequest(request)
    },
  }
}
