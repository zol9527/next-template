/**
 * 数据库连接封装
 * 支持 Prisma 和 Supabase 两种数据库提供商
 */

import { loadEnv, requireEnv } from './env.mjs'
import { createRequire } from 'node:module'

// 先加载环境变量
loadEnv()

/**
 * 创建 Prisma 客户端
 */
export async function createPrismaClient() {
  const require = createRequire(import.meta.url)
  const { PrismaClient } = require('../../../src/lib/prisma/generated/prisma/index.js')

  const databaseUrl = requireEnv('DATABASE_URL')
  const databaseProvider = process.env.DATABASE_PROVIDER || 'prisma'

  if (databaseProvider === 'prisma' && (databaseUrl.startsWith('mysql:') || databaseUrl.startsWith('mariadb:'))) {
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')

    const adapterUrl = databaseUrl.startsWith('mysql://')
      ? `mariadb://${databaseUrl.slice('mysql://'.length)}`
      : databaseUrl

    const adapter = new PrismaMariaDb(adapterUrl)
    return new PrismaClient({ adapter })
  }

  throw new Error('Unsupported DATABASE_URL for Prisma seed client, expected mysql:// or mariadb://')
}

/**
 * 创建 Supabase 客户端
 */
export async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = requireEnv('SUPABASE_URL')
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * 根据环境变量自动创建对应的数据库客户端
 */
export async function createDbClient() {
  const databaseProvider = process.env.DATABASE_PROVIDER || 'prisma'

  if (databaseProvider === 'supabase') {
    const client = await createSupabaseClient()
    // 为 Supabase 客户端添加 type 标识
    return Object.defineProperty(client, 'type', {
      value: 'supabase',
      enumerable: false,
      writable: false
    })
  }

  const client = await createPrismaClient()
  // 为 Prisma 客户端添加 type 标识
  return Object.defineProperty(client, 'type', {
    value: 'prisma',
    enumerable: false,
    writable: false
  })
}

/**
 * 断开数据库连接
 */
export async function disconnectDbClient(db) {
  if (db.type === 'prisma' || typeof db.$disconnect === 'function') {
    await db.$disconnect()
  }
  // Supabase 不需要手动断开
}
