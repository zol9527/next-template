/**
 * SSE 流式路由处理器
 *
 * Description: 专用于 AI SSE 流式响应的路由包装器
 *   提取 withV1Route 的共享认证/限流逻辑为可组合函数，
 *   支持 Server-Sent Events 流式响应。
 */

import type { NextRequest } from 'next/server'
import type { Logger } from 'pino'
import type { Action, Scope } from '@/config/access'
import type { ApiAuthContext } from './use-api-auth'
import type { ServiceContext } from '@/types/service/service-context'
import type { RateLimitWhitelist } from '@/lib/utils/rate-limit'
import { fail } from '@/contracts/api-response.schema'
import { TRACE_ID_HEADER, normalizeTraceId } from '@/lib/http'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { createRequestLogger } from '@/lib/logger'
import { useApiError } from '@/lib/errors/error-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createAdminFeatureFlagService } from '@/services/core/admin-feature-flag.service'
import { createServiceContext } from '@/types/service/service-context'
import { enforceRateLimit } from '@/lib/utils/rate-limit'
import { env } from '@/config'

// ==================== SSE Emitter ====================

/**
 * SSE 事件发射器接口
 *
 * Description: 封装 ReadableStream 控制器，提供 SSE 事件发送方法
 */
export interface SSEEmitter {
  /** 发送命名事件 */
  send(event: string, data: unknown): void
  /** 发送错误事件并关闭流 */
  error(message: string, code?: string): void
  /** 发送完成事件并关闭流 */
  done(data?: unknown): void
}

/**
 * Function: createSSEEmitter
 *
 * Description: 基于 ReadableStreamDefaultController 创建 SSE 事件发射器
 *
 * Parameters:
 *   controller(ReadableStreamDefaultController<Uint8Array>): 流控制器
 *
 * Returns:
 *   emitter(SSEEmitter): SSE 事件发射器实例
 */
function createSSEEmitter(controller: ReadableStreamDefaultController<Uint8Array>): SSEEmitter {
  const encoder = new TextEncoder()

  return {
    send(event: string, data: unknown) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(payload))
    },
    error(message: string, code = 'SSE_ERROR') {
      const payload = `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`
      controller.enqueue(encoder.encode(payload))
      controller.close()
    },
    done(data?: unknown) {
      const payload = `event: done\ndata: ${data ? JSON.stringify(data) : '[DONE]'}\n\n`
      controller.enqueue(encoder.encode(payload))
      controller.close()
    },
  }
}

// ==================== 路由选项与上下文 ====================

/**
 * SSE 流式路由的限流配置
 */
type StreamingRateLimitPolicy = {
  max: number
  windowMs: number
  identity?: (ctx: StreamingRouteContext) => string | null | undefined
  network?: {
    max: number
    windowMs: number
  }
  whitelist?: RateLimitWhitelist | ((ctx: StreamingRouteContext) => RateLimitWhitelist | null | undefined)
  message?: string
}

/**
 * SSE 流式路由选项
 */
export interface StreamingRouteOptions {
  /** 请求操作名称（用于日志和限流标识） */
  action?: string
  /** 需要的访问权限（同时隐含 requireAuth） */
  requireAccess: { action: Action; scope: Scope }
  /** 插件守卫（插件未启用时返回 404） */
  pluginGuard?: string
  /** 限流配置 */
  rateLimit?: StreamingRateLimitPolicy
  /** SSE 流式处理器 */
  handler: (ctx: StreamingRouteContext, emitter: SSEEmitter) => Promise<void>
}

/**
 * SSE 流式路由上下文
 *
 * Description: 提供给 handler 的请求上下文信息
 */
export interface StreamingRouteContext {
  /** 原始请求对象 */
  req: NextRequest
  /** 链路追踪 ID */
  traceId: string
  /** 请求级 logger（已绑定 traceId） */
  logger: Logger
  /** Service 层上下文 */
  serviceContext: ServiceContext
  /** 已认证的用户 ID（认证后可用） */
  userId?: string
  /** 已认证的会话 ID（认证后可用） */
  sessionId?: string
  /** 认证上下文（认证后可用） */
  auth?: ApiAuthContext
}

// ==================== 辅助函数 ====================

/**
 * Function: resolveStreamingRateLimitRule
 *
 * Description: 解析限流规则标识
 *
 * Parameters:
 *   action(string | undefined): 操作名称
 *   req(NextRequest): 请求对象
 *
 * Returns:
 *   rule(string): 限流规则标识
 */
function resolveStreamingRateLimitRule(action: string | undefined, req: NextRequest): string {
  if (action) {
    return action.replace(/\s+/g, '_')
  }
  return `${req.method}:${req.nextUrl.pathname}`
}

/**
 * Function: resolveStreamingRateLimitWhitelist
 *
 * Description: 解析限流白名单配置
 *
 * Parameters:
 *   whitelist: 白名单配置或工厂函数
 *   ctx: 流式路由上下文
 *
 * Returns:
 *   whitelist(RateLimitWhitelist | undefined): 解析后的白名单
 */
function resolveStreamingRateLimitWhitelist(
  whitelist: StreamingRateLimitPolicy['whitelist'],
  ctx: StreamingRouteContext
): RateLimitWhitelist | undefined {
  if (!whitelist) return undefined
  if (typeof whitelist === 'function') return whitelist(ctx) ?? undefined
  return whitelist
}

// ==================== 流式路由包装器 ====================

/**
 * Function: withV1StreamingRoute
 *
 * Description: SSE 流式路由包装器
 *   提供 traceId、日志、维护模式检查、插件守卫、认证、限流等中间件逻辑，
 *   最终以 SSE (text/event-stream) 格式向客户端推送事件流。
 *
 * Parameters:
 *   options(StreamingRouteOptions): 路由配置选项
 *
 * Returns:
 *   routeHandler(function): Next.js Route Handler
 */
export function withV1StreamingRoute(options: StreamingRouteOptions) {
  return async (req: NextRequest): Promise<Response> => {
    const startMs = Date.now()

    // ==================== TraceId + Logger ====================
    const traceId = normalizeTraceId(req.headers.get(TRACE_ID_HEADER))
    const pathname = req.nextUrl.pathname
    const normalizedAction = options.action ?? null

    const requestLogger = createRequestLogger({
      traceId,
      method: req.method,
      pathname,
      ip: null,
      action: normalizedAction,
    })

    const serviceCtx = createServiceContext(traceId, requestLogger, req)

    const ctx: StreamingRouteContext = {
      req,
      traceId,
      logger: requestLogger,
      serviceContext: serviceCtx,
    }

    try {
      // ==================== 维护模式检查 ====================
      try {
        const systemSettings = await createSystemSettingsRepository()
        const featureFlagService = createAdminFeatureFlagService(
          { systemSettings },
          serviceCtx,
        )

        if (await featureFlagService.isMaintenanceMode()) {
          requestLogger.warn(
            { action: 'stream.maintenance_rejected' },
            'SSE stream rejected due to maintenance mode',
          )
          return new Response(
            JSON.stringify(fail('MAINTENANCE_MODE', '系统维护中，请稍后再访问')),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          )
        }
      } catch (error) {
        // 维护模式检查失败时放行，防止数据库故障阻塞所有请求
        requestLogger.error(
          { err: error, action: 'stream.maintenance_check_failed' },
          'Failed to check maintenance mode, allowing stream',
        )
      }

      // ==================== 插件守卫检查 ====================
      if (options.pluginGuard) {
        const { isPluginEnabled } = await import('@/plugins/registry')
        if (!isPluginEnabled(options.pluginGuard)) {
          return new Response(
            JSON.stringify(fail('NOT_FOUND', '请求的资源不存在')),
            { status: 404, headers: { 'Content-Type': 'application/json' } },
          )
        }
      }

      // ==================== 认证处理 ====================
      const { useApiAuth } = await import('@/app/api/v1/_shared/use-api-auth')
      ctx.auth = await useApiAuth(req, serviceCtx)
      ctx.auth.access.assert(options.requireAccess)
      ctx.userId = ctx.auth.userId
      ctx.sessionId = ctx.auth.sessionId

      // ==================== 限流处理 ====================
      if (options.rateLimit) {
        const ipResult = extractClientIpSafe(req, {
          trustProxy: env.RATE_LIMIT_TRUST_PROXY,
          allowPrivateIp: env.RATE_LIMIT_ALLOW_PRIVATE_IP,
          requireIp: true,
        })

        if (!ipResult.ip) {
          requestLogger.warn(
            { action: 'stream.invalid_ip', reason: ipResult.reason },
            'SSE stream rejected: unable to determine client IP',
          )
          return new Response(
            JSON.stringify(fail('INVALID_CLIENT_IP', '无法识别客户端 IP 地址，请求被拒绝')),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const rule = resolveStreamingRateLimitRule(normalizedAction ?? undefined, req)
        const identity = options.rateLimit.identity?.(ctx) ?? ctx.userId
        const whitelist = resolveStreamingRateLimitWhitelist(options.rateLimit.whitelist, ctx)

        const rateLimitResult = await enforceRateLimit(
          {
            rule,
            ip: ipResult.ip,
            now: Date.now(),
            max: options.rateLimit.max,
            windowMs: options.rateLimit.windowMs,
            identity,
            network: options.rateLimit.network,
            whitelist,
            userId: ctx.userId,
            userRoles: ctx.auth?.roles,
          },
          requestLogger,
        )

        if (!rateLimitResult.allowed) {
          requestLogger.warn(
            { action: 'stream.rate_limited', retryAfterSeconds: rateLimitResult.retryAfterSeconds },
            'SSE stream rate limited',
          )
          return new Response(
            JSON.stringify(fail('TOO_MANY_REQUESTS', options.rateLimit.message ?? '请求过于频繁，请稍后再试')),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(rateLimitResult.retryAfterSeconds),
              },
            },
          )
        }
      }

      // ==================== 创建 SSE 流 ====================
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emitter = createSSEEmitter(controller)
          try {
            await options.handler(ctx, emitter)
          } catch (error: unknown) {
            // handler 内部异常，通过 SSE error 事件通知客户端
            const { code, message } = useApiError(error)
            requestLogger.error({ err: error, action: 'stream.handler_error' }, `SSE handler error: ${message}`)
            emitter.error(message, code)
          }
        },
      })

      const durationMs = Date.now() - startMs
      requestLogger.info({ action: 'stream.started', durationMs }, 'SSE stream started')

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          [TRACE_ID_HEADER]: traceId,
        },
      })
    } catch (error: unknown) {
      // 流建立前的异常（认证失败、限流等），返回 JSON 错误响应
      const { status, code, message } = useApiError(error)
      requestLogger.error(
        { err: error, action: 'stream.setup_failed' },
        'SSE stream setup failed',
      )
      return new Response(
        JSON.stringify(fail(code, message)),
        { status, headers: { 'Content-Type': 'application/json', [TRACE_ID_HEADER]: traceId } },
      )
    }
  }
}
