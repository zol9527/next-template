import { env } from '@/config'
import { PrismaClient } from '@/lib/prisma/generated/prisma'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

let prismaClient: PrismaClient | null | undefined

/**
 * 将 mysql:// 或 mariadb:// 连接串解析为 mariadb npm 可识别的配置对象。
 *
 * 切换为对象配置的原因：
 * 1. 让 env.CONNECTION_LIMIT 显式生效（之前 URL 字符串路径走的是 mariadb 默认值 10）
 * 2. 为后续注入 pool 健壮性参数预留扩展点
 *
 * 注意：new URL().password 返回 percent-encoded 字符串（如 "p%40ss"），
 * 必须 decodeURIComponent 一次，与 mariadb npm 内部的 URL 解析行为等价。
 */
function parseMariaDbConfig(databaseUrl: string) {
  const parsed = new URL(databaseUrl)

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: env.CONNECTION_LIMIT,
  }
}

export function createPrismaClient() {
  // Supabase 模式：不走 Prisma，使用 Supabase client
  if (env.DATABASE_PROVIDER === 'supabase') {
    return null
  }

  if (env.DATABASE_URL?.includes('mysql:') || env.DATABASE_URL?.includes('mariadb:')) {
    const adapter = new PrismaMariaDb(parseMariaDbConfig(env.DATABASE_URL))
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
