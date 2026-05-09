import { env } from '@/config'
import { logger } from '@/lib/logger'
import type { LogLevel } from '@/lib/logger/policy'

/**
 * 当前运行时日志级别（内存存储）
 * 默认值从 logger 实例获取
 */
let currentLogLevel: LogLevel = logger.level as LogLevel

/**
 * 级别变更监听器类型
 */
type LogLevelChangeListener = (newLevel: LogLevel, previousLevel: LogLevel) => void

/**
 * 级别变更监听器列表
 */
const listeners: LogLevelChangeListener[] = []

/**
Function: getLogLevel

Description: 获取当前运行时日志级别

Parameters:

Returns:
	level(LogLevel): 当前日志级别
*/
export function getLogLevel(): LogLevel {
  return currentLogLevel
}

/**
Function: setLogLevel

Description: 动态设置运行时日志级别，立即生效

Parameters:
	level(LogLevel): 新的日志级别

Returns:
	previousLevel(LogLevel): 变更前的日志级别
*/
export function setLogLevel(level: LogLevel): LogLevel {
  const previousLevel = currentLogLevel
  currentLogLevel = level

  // 更新 pino logger 实例的级别，立即生效
  logger.level = level

  // 触发所有监听器
  for (const listener of listeners) {
    try {
      listener(level, previousLevel)
    } catch {
      // 监听器错误不影响主流程
    }
  }

  return previousLevel
}

/**
Function: onLogLevelChange

Description: 注册日志级别变更监听器

Parameters:
	listener(LogLevelChangeListener): 监听器函数

Returns:
	unsubscribe(() => void): 取消订阅函数
*/
export function onLogLevelChange(listener: LogLevelChangeListener): () => void {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

/**
Function: getLogConfig

Description: 获取日志系统配置信息

Parameters:

Returns:
	config(object): 包含 logDir 等配置信息
*/
export function getLogConfig() {
  // 从集中配置获取日志目录
  const logDir = env.LOG_DIR ?? './logs'
  return {
    logDir,
  }
}
