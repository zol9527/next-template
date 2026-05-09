export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type RotationPolicy = {
  rotateSizeBytes: number
  rotateDaily: boolean
}

export type RetentionPolicy = {
  retentionDays: number
  retentionMaxTotalBytes: number
}

export type LogPolicy = {
  levelThreshold: LogLevel
  logToStdout: boolean
  logDir: string
  rotation: RotationPolicy
  retention: RetentionPolicy
}

export type RequestContext = {
  traceId: string
  method?: string
  pathname?: string
  ip?: string | null
  userId?: string | null
  action?: string | null
  requestMeta?: Record<string, unknown> | null
}

/**
Function: isLogLevel

Description: 判断字符串是否为允许的日志等级

Parameters:
	value(string): 待判断的字符串

Returns:
	ok(boolean): 是否为合法日志等级
*/
export function isLogLevel(value: string): value is LogLevel {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error'
}
