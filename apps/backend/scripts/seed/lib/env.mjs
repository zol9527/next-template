/**
 * 统一环境变量加载模块
 * 用于所有 seed 脚本加载环境变量
 *
 * 使用 __dirname 定位 backend 根目录，而非 process.cwd()，
 * 确保在 monorepo 中无论从哪个目录调用都能正确找到 .env 文件。
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// __dirname = apps/backend/scripts/seed/lib/
// 向上 3 级 = apps/backend/（backend 应用根目录）
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = join(__dirname, '..', '..', '..')

export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const envFiles = [`.env.${nodeEnv}`, '.env']

  for (const file of envFiles) {
    const filePath = join(BACKEND_ROOT, file)
    try {
      process.loadEnvFile(filePath)
      console.log(`✓ Loaded env file: ${filePath}`)
      return
    } catch {
      // 文件不存在，继续尝试下一个
    }
  }

  console.warn('⚠️  No env file found, using process.env only')
}

/**
 * 获取环境变量，支持默认值
 */
export function getEnv(key, defaultValue) {
  return process.env[key] ?? defaultValue
}

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 */
export function requireEnv(key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}
