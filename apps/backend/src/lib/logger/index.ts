import pino, { stdSerializers, type DestinationStream, Logger } from 'pino'
import { loadLogPolicy } from '@/lib/logger/config'
import { createFileSink } from '@/lib/logger/file-sink'
import { SENSITIVE_KEYS } from '@/lib/logger/sensitive'
import type { RequestContext } from '@/lib/logger/policy'

/**
Function: createRequestLogger

Description: 创建 request-scoped child logger，将 traceId 等上下文绑定到日志中

Parameters:
	ctx(RequestContext): 请求上下文

Returns:
	child(Logger): 绑定了上下文字段的 child logger
*/
export function createRequestLogger(ctx: RequestContext): Logger {
  const bindings: Record<string, unknown> = {
    traceId: ctx.traceId,
  }

  if (ctx.method) bindings.method = ctx.method
  if (ctx.pathname) bindings.pathname = ctx.pathname
  if (ctx.ip) bindings.ip = ctx.ip
  if (ctx.userId) bindings.userId = ctx.userId
  if (ctx.action) bindings.action = ctx.action
  if (ctx.requestMeta) bindings.requestMeta = ctx.requestMeta

  return logger.child(bindings)
}

/**
Function: logger

Description: 全局结构化日志实例（策略驱动：默认不 stdout；JSON 输出；自动对敏感字段脱敏）

Parameters:

Returns:
  logger(object): Pino 日志实例
*/
export const logger = (() => {
  const policy = loadLogPolicy()

  const streams: Array<{ stream: DestinationStream }> = [
    {
      stream: createFileSink({
        logDir: policy.logDir,
        rotation: policy.rotation,
        retention: policy.retention,
      }),
    },
  ]

  if (policy.logToStdout) {
    streams.push({ stream: pino.destination(1) })
  }

  return pino(
    {
      level: policy.levelThreshold,
      redact: {
        paths: SENSITIVE_KEYS,
        censor: '[REDACTED]',
      },
      serializers: {
        err: stdSerializers.err,
      },
    },
    pino.multistream(streams),
  )
})()
