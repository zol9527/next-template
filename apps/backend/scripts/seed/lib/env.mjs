/**
 * 统一环境变量加载模块
 * 用于所有 seed 脚本加载环境变量
 */

export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const envFiles = [`.env.${nodeEnv}`, '.env']

  for (const file of envFiles) {
    const filePath = `${process.cwd()}/${file}`
    try {
      process.loadEnvFile(filePath)
      console.log(`✓ Loaded env file: ${file}`)
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
