import path from 'node:path'
import type { PrismaConfig } from 'prisma'

/**
 * Prisma CLI 不会自动加载 .env 文件，需要手动调用 loadEnvFile
 *
 * 注意：此文件在部署包中独立存在，不能依赖 src/ 目录下的其他文件。
 * 直接使用 Node.js 内置的 process.loadEnvFile() 加载环境变量（Node.js 20.12+）。
 *
 * 加载优先级：
 * - development: .env.development.local > .env.local > .env.development > .env
 * - production/test: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env
 */
const nodeEnv = process.env.NODE_ENV || 'development'
const envFiles = [`.env.${nodeEnv}.local`]

if (nodeEnv === 'development') {
  envFiles.push('.env.local')
}

envFiles.push(`.env.${nodeEnv}`, '.env')

for (const file of envFiles) {
  try {
    process.loadEnvFile(`${process.cwd()}/${file}`)
    break // 找到第一个存在的文件后停止
  } catch {
    // 文件不存在，继续尝试下一个
  }
}

const datasourceUrl = process.env.DATABASE_URL
  ?? (
    process.env.PRISMA_ALLOW_PLACEHOLDER_DATABASE_URL === '1'
      ? (process.env.PRISMA_GENERATE_DATABASE_URL
        ?? 'mysql://root:password@127.0.0.1:3306/prisma_generate_placeholder')
      : undefined
  )

export default {
  // 指定 schema.prisma 文件路径
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  // migration 文件夹路径
  migrations: {
    path: path.join(process.cwd(), 'prisma', 'migrations'),
  },
  datasource: {
    url: datasourceUrl,
  },
} satisfies PrismaConfig
