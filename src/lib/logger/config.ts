import { env } from '@/config'
import type { LogLevel, LogPolicy } from '@/lib/logger/policy'

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function defaultLevelByNodeEnv(nodeEnv: string): LogLevel {
  return nodeEnv === 'production' ? 'info' : 'debug'
}

/**
Function: loadLogPolicy

Description: 从类型安全环境变量加载日志策略，并补齐默认值与边界保护

Parameters:

Returns:
	policy(LogPolicy): 解析后的日志策略
*/
export function loadLogPolicy(): LogPolicy {
  const nodeEnv = env.NODE_ENV

  return {
    levelThreshold: env.LOG_LEVEL ?? defaultLevelByNodeEnv(nodeEnv),
    logToStdout: env.LOG_TO_STDOUT ?? false,
    logDir: env.LOG_DIR ?? './logs',
    rotation: {
      rotateSizeBytes: clampInt(env.LOG_ROTATE_SIZE_BYTES ?? 10 * 1024 * 1024, 1024, 1024 * 1024 * 1024),
      rotateDaily: env.LOG_ROTATE_DAILY ?? true,
    },
    retention: {
      retentionDays: clampInt(env.LOG_RETENTION_DAYS ?? 7, 1, 3650),
      retentionMaxTotalBytes: clampInt(env.LOG_RETENTION_MAX_TOTAL_BYTES ?? 1024 * 1024 * 1024, 1024 * 1024, 1024 * 1024 * 1024 * 1024),
    },
  }
}
