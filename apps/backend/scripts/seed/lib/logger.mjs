/**
 * 简单的日志工具
 * 为 seed 脚本提供统一的日志格式
 */

/**
 * 获取当前时间戳
 */
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

/**
 * 输出信息日志
 */
export function info(message, details = '') {
  const detailStr = details ? ` ${JSON.stringify(details)}` : ''
  console.log(`[${timestamp()}] ℹ️  ${message}${detailStr}`)
}

/**
 * 输出成功日志
 */
export function success(message, details = '') {
  const detailStr = details ? ` ${JSON.stringify(details)}` : ''
  console.log(`[${timestamp()}] ✅ ${message}${detailStr}`)
}

/**
 * 输出警告日志
 */
export function warn(message, details = '') {
  const detailStr = details ? ` ${JSON.stringify(details)}` : ''
  console.log(`[${timestamp()}] ⚠️  ${message}${detailStr}`)
}

/**
 * 输出错误日志
 */
export function error(message, err) {
  console.error(`[${timestamp()}] ❌ ${message}`)
  if (err?.stack) {
    console.error(err.stack)
  } else if (err?.message) {
    console.error(`  Error: ${err.message}`)
  }
}

/**
 * 创建带上下文的 logger
 */
export function createLogger(context) {
  const prefix = `[${context}] `
  return {
    info: (msg, details) => info(`${prefix}${msg}`, details),
    success: (msg, details) => success(`${prefix}${msg}`, details),
    warn: (msg, details) => warn(`${prefix}${msg}`, details),
    error: (msg, err) => error(`${prefix}${msg}`, err),
  }
}

/**
 * 输出分隔线
 */
export function divider(title = '') {
  if (title) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`  ${title}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  } else {
    console.log(`\n─────────────────────────────────────────────────────────────\n`)
  }
}
