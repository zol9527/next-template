/**
 * 加载 .env 文件（用于非 Next.js 环境，如独立脚本、Prisma CLI 等）
 *
 * Next.js 运行时会自动加载 .env 文件，但在以下场景需要手动调用：
 * - node scripts/*.mjs（如果没有使用 --env-file 参数）
 * - Prisma CLI (prisma.config.ts)
 * - 其他独立 Node.js 脚本
 *
 * 加载优先级：
 * - development: .env.development.local > .env.local > .env.development > .env
 * - production/test: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env
 *
 * @example
 * import { loadEnvFile } from '@/config/load-env-file'
 * loadEnvFile()  // 在使用 env 之前调用
 *
 * 注意：此文件必须使用 console 而非 logger，因为 Prisma CLI 运行时无法解析 @/ 路径别名
 */
export function loadEnvFile() {
  const nodeEnv = process.env.NODE_ENV || 'development'

  // 按优先级尝试加载环境变量文件
  const envFiles = [`.env.${nodeEnv}.local`] // 当前环境的本地覆盖

  if (nodeEnv === 'development') {
    envFiles.push('.env.local') // 仅开发环境允许通用本地覆盖
  }

  envFiles.push(
    `.env.${nodeEnv}`,         // 环境特定配置
    '.env',                    // 默认配置
  )

  for (const file of envFiles) {
    const filePath = `${process.cwd()}/${file}`
    try {
      process.loadEnvFile(filePath)
      console.log(`✅ 环境变量文件加载成功: ${file}`)
      return // 找到第一个存在的文件后停止
    } catch {
      // 文件不存在，继续尝试下一个
    }
  }

  console.warn('⚠️  未找到环境变量文件')
}
