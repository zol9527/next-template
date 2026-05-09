import type { Logger } from 'pino'
import { logger } from '@/lib/logger'
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
