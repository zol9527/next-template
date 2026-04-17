/**
 * File: browser.ts
 * Description: 浏览器端结构化日志器，用于客户端组件
 */

import { SENSITIVE_KEYS } from './sensitive'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface BrowserLogContext {
  traceId?: string
  userId?: string
  action?: string
  [key: string]: unknown
}

/**
 * Function: redactSensitiveFields
 *
 * Description: 递归脱敏处理，与服务端 logger 保持一致
 *
 * Parameters:
 *     obj(unknown): 需要脱敏的对象
 *
 * Returns:
 *     unknown: 脱敏后的对象
 */
function redactSensitiveFields(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const redacted = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      lowerKey.includes(sensitive.toLowerCase())
    )

    if (isSensitive) {
      ;(redacted as Record<string, unknown>)[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      ;(redacted as Record<string, unknown>)[key] = redactSensitiveFields(value)
    } else {
      ;(redacted as Record<string, unknown>)[key] = value
    }
  }

  return redacted
}

/**
 * Class: BrowserLogger
 *
 * Description: 浏览器端结构化日志器，支持敏感字段脱敏和结构化输出
 */
class BrowserLogger {
  private isDev = process.env.NODE_ENV === 'development'

  /**
   * Function: log
   *
   * Description: 内部日志方法
   *
   * Parameters:
   *     level(LogLevel): 日志级别
   *     message(string): 日志消息
   *     context(BrowserLogContext): 上下文信息
   *     error(Error): 错误对象
   */
  private log(
    level: LogLevel,
    message: string,
    context: BrowserLogContext = {},
    error?: Error
  ) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
      ...(error && { err: { message: error.message, stack: error.stack } }),
    }

    const redactedEntry = redactSensitiveFields(logEntry) as typeof logEntry

    // 开发环境：输出格式化的 JSON
    if (this.isDev) {
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : console.log
      consoleMethod(JSON.stringify(redactedEntry, null, 2))
      return
    }

    // 生产环境：仅输出 error
    if (level === 'error') {
      console.error(JSON.stringify(redactedEntry))
    }
  }

  /**
   * Function: debug
   *
   * Description: 记录调试级别日志
   *
   * Parameters:
   *     message(string): 日志消息
   *     context(BrowserLogContext): 上下文信息
   */
  debug(message: string, context?: BrowserLogContext) {
    this.log('debug', message, context)
  }

  /**
   * Function: info
   *
   * Description: 记录信息级别日志
   *
   * Parameters:
   *     message(string): 日志消息
   *     context(BrowserLogContext): 上下文信息
   */
  info(message: string, context?: BrowserLogContext) {
    this.log('info', message, context)
  }

  /**
   * Function: warn
   *
   * Description: 记录警告级别日志
   *
   * Parameters:
   *     message(string): 日志消息
   *     context(BrowserLogContext): 上下文信息
   */
  warn(message: string, context?: BrowserLogContext) {
    this.log('warn', message, context)
  }

  /**
   * Function: error
   *
   * Description: 记录错误级别日志
   *
   * Parameters:
   *     message(string): 日志消息
   *     error(Error): 错误对象
   *     context(BrowserLogContext): 上下文信息
   */
  error(message: string, error?: Error, context?: BrowserLogContext) {
    this.log('error', message, context, error)
  }

  /**
   * Function: child
   *
   * Description: 创建带预设上下文的 child logger
   *
   * Parameters:
   *     context(BrowserLogContext): 预设的上下文信息
   *
   * Returns:
   *     child(BrowserLogger): 带预设上下文的 logger
   */
  child(context: BrowserLogContext): BrowserLogger {
    const childLogger = new BrowserLogger()
    const originalLog = childLogger.log.bind(childLogger)

    childLogger.log = (level, message, additionalContext = {}, error?) => {
      return originalLog(level, message, { ...context, ...additionalContext }, error)
    }

    return childLogger
  }
}

/**
 * Variable: browserLogger
 *
 * Description: 浏览器端 logger 单例
 */
export const browserLogger = new BrowserLogger()
