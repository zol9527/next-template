import { env } from '@/config'
import { PrismaClient } from '@/lib/prisma/generated/prisma'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

let prismaClient: PrismaClient | null | undefined

function toMariaDbUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith('mysql://')) {
    return `mariadb://${databaseUrl.slice('mysql://'.length)}`
  }

  return databaseUrl
}

export function createPrismaClient() {
  // Supabase 模式：不走 Prisma，使用 Supabase client
  if (env.DATABASE_PROVIDER === 'supabase') {
    return null
  }

  if (env.DATABASE_URL?.includes('mysql:') || env.DATABASE_URL?.includes('mariadb:')) {
    // MySQL/MariaDB: 优先使用完整连接串，避免仅配置 DATABASE_URL 时参数为空
    const adapter = env.DATABASE_URL
      ? new PrismaMariaDb(toMariaDbUrl(env.DATABASE_URL))
      : new PrismaMariaDb({
          host: env.DATABASE_HOST,
          user: env.DATABASE_USER,
          password: env.DATABASE_PASSWORD,
          database: env.DATABASE_NAME,
          connectionLimit: env.CONNECTION_LIMIT,
        })
    return new PrismaClient({ adapter })
  }

  throw new Error('Unsupported DATABASE_URL for PrismaClient, expected mysql:// or mariadb://')
}

function getPrismaClient(): PrismaClient {
  if (prismaClient === undefined) {
    prismaClient = createPrismaClient()
  }

  if (!prismaClient) {
    throw new Error('Prisma client is unavailable when DATABASE_PROVIDER is supabase')
  }

  return prismaClient
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property, receiver)

    return typeof value === 'function' ? value.bind(client) : value
  },
})
