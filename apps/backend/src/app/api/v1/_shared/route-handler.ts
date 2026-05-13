import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Logger } from 'pino'
import { z } from 'zod'

import type { ApiAuthContext } from './use-api-auth'
import { createJsonApiResponse, appendCorsHeaders } from '@/lib/http/response'
import { fail } from '@/contracts/api-response.schema'
import { TRACE_ID_HEADER, normalizeTraceId } from '@/lib/http'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { createRequestLogger } from '@/lib/logger'
import { useApiError } from '@/lib/errors/error-handler'
import { AppError } from '@/lib/errors/app-error'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createAdminFeatureFlagService } from '@/services/core/admin-feature-flag.service'
import { createServiceContext } from '@/types/service/service-context'
import type { RateLimitWhitelist } from '@/lib/utils/rate-limit'
import { enforceRateLimit } from '@/lib/utils/rate-limit'
import { env } from '@/config'
import type { Action, Scope } from '@/config/access'

export type V1RouteContext<TParams extends Record<string, unknown> = Record<string, unknown>> = {
  req: NextRequest
  params: TParams
  query: Record<string, string | string[]>
  body: unknown
  traceId: string
  logger: Logger
  auth?: ApiAuthContext  // 预注入的认证上下文
  // 便捷访问属性（仅在 requireAuth/requireAccess 时可用，运行时保证存在）
  userId?: string
  sessionId?: string
  serviceContext: import('@/types/service/service-context').ServiceContext
}

// 经过认证的上下文类型（serviceContext 和 userId 保证存在）
export type V1AuthenticatedRouteContext<TParams extends Record<string, unknown> = Record<string, unknown>> = Omit<V1RouteContext<TParams>, 'serviceContext' | 'userId' | 'sessionId'> & {
  serviceContext: import('@/types/service/service-context').ServiceContext
  userId: string
  sessionId: string
}

export type V1RouteContextWithInput<
  TParams extends Record<string, unknown>,
  TQuery,
  TBody,
> = Omit<V1RouteContext<TParams>, 'query' | 'body'> & {
  query: TQuery
  body: TBody | undefined
}

// 经过认证的上下文类型（带 query）
export type V1AuthenticatedRouteContextWithInput<
  TParams extends Record<string, unknown>,
  TQuery,
  TBody,
> = Omit<V1AuthenticatedRouteContext<TParams>, 'query' | 'body'> & {
  query: TQuery
  body: TBody | undefined
}

export type V1RouteContextWithBody<
  TParams extends Record<string, unknown>,
  TQuery,
  TBody,
> = Omit<V1RouteContextWithInput<TParams, TQuery, TBody>, 'body'> & {
  body: TBody
}

// 经过认证的上下文类型（带 body）
export type V1AuthenticatedRouteContextWithBody<
  TParams extends Record<string, unknown>,
  TQuery,
  TBody,
> = Omit<V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>, 'body'> & {
  body: TBody
}

function getQueryObject(req: NextRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}

  req.nextUrl.searchParams.forEach((value, key) => {
    const existing = out[key]
    if (existing === undefined) {
      out[key] = value
      return
    }

    if (Array.isArray(existing)) {
      existing.push(value)
      return
    }

    out[key] = [existing, value]
  })

  return out
}

type HttpPayloadFormat = 'json' | 'text' | 'empty' | 'unreadable'

type HttpPayloadSnapshot = {
  contentType: string | null
  payloadFormat: HttpPayloadFormat
  payload: unknown
}

const SENSITIVE_FIELD_KEYWORDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'setcookie',
  'wechatpaysignature',
  'wechatpayserial',
  'wechatpaytimestamp',
  'wechatpaynonce',
  'creditcard',
]

/**
Function: isRecord

Description: 判断输入是否为普通对象记录

Parameters:
  value(unknown): 待判断值

Returns:
  ok(boolean): 是否为对象记录
*/
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
Function: normalizeSensitiveKey

Description: 归一化字段名用于敏感关键词匹配

Parameters:
  key(string): 原始字段名

Returns:
  normalized(string): 归一化后的字段名
*/
function normalizeSensitiveKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
Function: shouldMaskKey

Description: 判断字段名是否命中敏感关键词

Parameters:
  key(string): 字段名

Returns:
  matched(boolean): 是否需要脱敏
*/
function shouldMaskKey(key: string): boolean {
  const normalizedKey = normalizeSensitiveKey(key)
  return SENSITIVE_FIELD_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))
}

/**
Function: maskSensitiveData

Description: 递归脱敏对象中的敏感字段，同时保留非敏感内容细节

Parameters:
  value(unknown): 原始数据

Returns:
  masked(unknown): 脱敏后的数据
*/
function maskSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item))
  }

  if (isRecord(value)) {
    const maskedRecord: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value)) {
      if (shouldMaskKey(key)) {
        maskedRecord[key] = '[REDACTED]'
      } else {
        maskedRecord[key] = maskSensitiveData(item)
      }
    }

    return maskedRecord
  }

  return value
}

/**
Function: headersToObject

Description: 将 Headers 转换为普通对象用于结构化日志输出

Parameters:
  headers(Headers): 请求或响应头对象

Returns:
  headerObject(Record<string, string>): 可序列化的头对象
*/
function headersToObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries())
}

/**
Function: readRequestPayloadSnapshot

Description: 读取请求体快照（基于 clone，不影响后续业务读取）

Parameters:
  req(NextRequest): 当前请求对象

Returns:
  snapshot(HttpPayloadSnapshot): 请求体快照信息
*/
async function readRequestPayloadSnapshot(req: NextRequest): Promise<HttpPayloadSnapshot> {
  const contentType = req.headers.get('content-type')

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return {
      contentType,
      payloadFormat: 'empty',
      payload: null,
    }
  }

  try {
    const text = await req.clone().text()

    if (text.trim().length === 0) {
      return {
        contentType,
        payloadFormat: 'empty',
        payload: null,
      }
    }

    if (contentType?.toLowerCase().includes('application/json')) {
      try {
        return {
          contentType,
          payloadFormat: 'json',
          payload: JSON.parse(text),
        }
      } catch {
        return {
          contentType,
          payloadFormat: 'text',
          payload: text,
        }
      }
    }

    return {
      contentType,
      payloadFormat: 'text',
      payload: text,
    }
  } catch {
    return {
      contentType,
      payloadFormat: 'unreadable',
      payload: null,
    }
  }
}

/**
Function: readResponsePayloadSnapshot

Description: 读取响应体快照（基于 clone，不影响实际返回）

Parameters:
  res(NextResponse): 当前响应对象

Returns:
  snapshot(HttpPayloadSnapshot): 响应体快照信息
*/
async function readResponsePayloadSnapshot(res: NextResponse): Promise<HttpPayloadSnapshot> {
  const contentType = res.headers.get('content-type')

  try {
    const text = await res.clone().text()

    if (text.trim().length === 0) {
      return {
        contentType,
        payloadFormat: 'empty',
        payload: null,
      }
    }

    if (contentType?.toLowerCase().includes('application/json')) {
      try {
        return {
          contentType,
          payloadFormat: 'json',
          payload: JSON.parse(text),
        }
      } catch {
        return {
          contentType,
          payloadFormat: 'text',
          payload: text,
        }
      }
    }

    return {
      contentType,
      payloadFormat: 'text',
      payload: text,
    }
  } catch {
    return {
      contentType,
      payloadFormat: 'unreadable',
      payload: null,
    }
  }
}

/**
Function: shouldCaptureHttpDetails

Description: 判断当前路径是否应采集详细请求/响应日志

Parameters:
  pathname(string): 当前请求路径

Returns:
  shouldCapture(boolean): 是否采集详细日志
*/
function shouldCaptureHttpDetails(pathname: string): boolean {
  if (pathname.startsWith('/api/v1/admin/logs')) {
    return false
  }

  // 文件下载路由：流式响应，clone().text() 会将整个文件读入内存做日志，必须跳过
  if (pathname.startsWith('/api/v1/public/files/')) {
    return false
  }

  return true
}

/**
 * 维护模式下豁免的路径前缀
 * 这些路径在维护模式下仍然可以访问
 */
const MAINTENANCE_EXEMPT_PATH_PREFIXES = [
  '/api/v1/admin', // 管理员 API（管理员需要能够关闭维护模式）
  '/api/v1/user', // 用户认证 API（维护模式下允许用户访问）
  '/api/v1/auth', // 认证 API（允许管理员登录）
  '/api/health', // 健康检查
] as const

/**
 * 检查路径是否在维护模式豁免白名单中
 */
function isPathExemptFromMaintenance(pathname: string): boolean {
  return MAINTENANCE_EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
Function: withV1Route

Description: 为 v1 API Route Handler 提供统一的 traceId 注入与全局错误处理骨架

Parameters:
	params(object): 包装器参数
	params.handler(function): 业务 handler
	params.action(string | undefined): 动作标识（用于审计日志，可选）
	params.onSuccess(function | undefined): 成功后对响应做二次处理（可选）
	params.onError(function | undefined): 错误响应生成后对响应做二次处理（可选）

Returns:
	route(function): Next.js Route Handler
*/

type RouteOptions<
  TParams extends Record<string, unknown>,
  TQuery,
  TBody,
  TCtx
> = {
  handler: (ctx: TCtx) => Promise<NextResponse>
  action?: string
  pluginGuard?: string
  rateLimit?: RouteRateLimitPolicy<TCtx>
  schemas?: {
    params?: z.ZodType<TParams>
    query?: z.ZodType<TQuery>
    body?: z.ZodType<TBody>
  }
  onSuccess?: (ctx: TCtx, res: NextResponse) => void
  onError?: (ctx: TCtx, res: NextResponse, error: unknown) => void
}

type RouteRateLimitPolicy<TCtx> = {
  max: number
  windowMs: number
  identity?: (ctx: TCtx) => string | null | undefined
  network?: {
    max: number
    windowMs: number
  }
  whitelist?: RateLimitWhitelist | ((ctx: TCtx) => RateLimitWhitelist | null | undefined)
  message?: string
}

function normalizeRouteRateLimitPolicy<TCtx>(policy: RouteRateLimitPolicy<TCtx>) {
  return {
    max: policy.max,
    windowMs: policy.windowMs,
    identity: policy.identity,
    network: policy.network,
    whitelist: policy.whitelist,
    message: policy.message ?? 'Too many requests',
  }
}

function resolveRouteRateLimitRule(action: string | undefined, req: NextRequest): string {
  if (action) {
    return action.replace(/\s+/g, '_')
  }

  return `${req.method}:${req.nextUrl.pathname}`
}

function resolveRouteRateLimitWhitelist<TCtx>(
  whitelist: RouteRateLimitPolicy<TCtx>['whitelist'],
  ctx: TCtx
): RateLimitWhitelist | undefined {
  if (!whitelist) {
    return undefined
  }

  if (typeof whitelist === 'function') {
    return whitelist(ctx) ?? undefined
  }

  return whitelist
}

/**
 * 重载 1: 需要认证 (requireAuth: true)
 * 推导类型: V1AuthenticatedRouteContextWithInput (包含 userId, serviceContext)
 */
export function withV1Route<
  TParams extends Record<string, unknown>,
  TQuery = unknown,
  TBody = unknown
>(
  params: RouteOptions<
    TParams,
    TQuery,
    TBody,
    V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>
  > & {
    requireAuth: true
  }
): (req: NextRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse>

/**
 * 重载 2.5: 需要细粒度访问控制 (requireAccess)
 * 推导类型: V1AuthenticatedRouteContextWithInput (管理员和推广员均可访问)
 */
export function withV1Route<
  TParams extends Record<string, unknown>,
  TQuery = unknown,
  TBody = unknown
>(
  params: RouteOptions<
    TParams,
    TQuery,
    TBody,
    V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>
  > & {
    requireAccess: { action: Action; scope: Scope }
  }
): (req: NextRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse>

/**
 * 重载 3: 公开接口 (默认)
 * 推导类型: V1RouteContextWithInput (无 userId, serviceContext 可选)
 */
export function withV1Route<
  TParams extends Record<string, unknown>,
  TQuery = unknown,
  TBody = unknown
>(
  params: RouteOptions<
    TParams,
    TQuery,
    TBody,
    V1RouteContextWithInput<TParams, TQuery, TBody>
  > & {
    requireAuth?: false
    requireAccess?: never
  }
): (req: NextRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse>

/**
 * 实现: 保持原有逻辑，但在内部处理类型断言
 */
export function withV1Route<TParams extends Record<string, unknown>, TQuery = unknown, TBody = unknown>(
  params: RouteOptions<
    TParams,
    TQuery,
    TBody,
    V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>
  > & {
    requireAuth?: boolean
    requireAccess?: { action: Action; scope: Scope }
  }
): (req: NextRequest, ctx: { params: Promise<TParams> }) => Promise<NextResponse> {
  return async (req, ctx) => {
    const startMs = Date.now()
    const traceId = normalizeTraceId(req.headers.get(TRACE_ID_HEADER)) // 获取或生成 traceId
    const pathname = req.nextUrl.pathname
    const enableHttpDetails = env.LOG_HTTP_DETAILS_ENABLED && shouldCaptureHttpDetails(pathname)
    const normalizedAction = params.action ?? null

    // 创建 request-scoped logger (绑定 traceId 等上下文)
    const ipResult = extractClientIpSafe(req, {
      trustProxy: env.RATE_LIMIT_TRUST_PROXY,
      allowPrivateIp: env.RATE_LIMIT_ALLOW_PRIVATE_IP,
      requireIp: false,  // 日志不需要强制要求 IP
    })

    const requestLogger = createRequestLogger({
      traceId,
      method: req.method,
      pathname,
      ip: ipResult.ip,  // 可能为 null
      action: normalizedAction,
    })

    // 创建 ServiceContext（所有路由都需要）
    const serviceCtx = createServiceContext(traceId, requestLogger, req)

    // 构造 route 上下文
    const routeCtx: V1RouteContextWithInput<TParams, TQuery, TBody> = {
      req,
      params: await ctx.params,
      query: getQueryObject(req) as unknown as TQuery,
      body: undefined,
      traceId,
      logger: requestLogger,
      serviceContext: serviceCtx,
    }

    let requestPayloadSnapshot: HttpPayloadSnapshot | null = null

    if (enableHttpDetails) {
      requestPayloadSnapshot = await readRequestPayloadSnapshot(req)
    }

    // ==================== 维护模式检查 ====================
    // 跳过豁免路径的维护模式检查
    if (!isPathExemptFromMaintenance(pathname)) {
      try {
        // 使用已创建的 ServiceContext 检查维护模式
        const systemSettings = await createSystemSettingsRepository()
        const featureFlagService = createAdminFeatureFlagService(
          { systemSettings },
          serviceCtx,
        )

        const isMaintenance = await featureFlagService.isMaintenanceMode()

        if (isMaintenance) {
          requestLogger.warn(
            { action: 'maintenance_mode.rejected' },
            'Request rejected due to maintenance mode',
          )

          const res = createJsonApiResponse(
            req,
            fail('MAINTENANCE_MODE', '系统维护中，请稍后再访问'),
            { status: 503 },
          )
          res.headers.set(TRACE_ID_HEADER, traceId)
          return res
        }
      } catch (error) {
        // 如果维护模式检查失败，记录错误但放行请求
        // 这样可以防止数据库故障导致所有 API 不可用
        requestLogger.error(
          { err: error, action: 'maintenance_mode.check_failed' },
          'Failed to check maintenance mode, allowing request',
        )
      }
    }

    // ==================== 原有的请求处理逻辑 ====================
    // 使用 try-catch 包裹整个处理流程以捕获所有错误, 避免未处理异常导致进程崩溃
    try {
      // ==================== 插件守卫检查 ====================
      if (params.pluginGuard) {
        const { isPluginEnabled } = await import('@/plugins/registry');
        if (!isPluginEnabled(params.pluginGuard)) {
          return createJsonApiResponse(
            req,
            fail('NOT_FOUND', '请求的资源不存在'),
            { status: 404 },
          )
        }
      }

      // ==================== 认证处理 ====================
      // 在参数校验之前执行认证
      if (params.requireAuth || params.requireAccess) {
        // 动态导入避免循环依赖（同时使用统一的 module specifier，便于测试 mock）
        const { useApiAuth } = await import(
          '@/app/api/v1/_shared/use-api-auth'
        )

        // 执行认证（使用已创建的 serviceCtx）
        if (params.requireAccess) {
          // 需要细粒度访问控制（管理员和推广员均可，按 grants 区分）
          routeCtx.auth = await useApiAuth(req, serviceCtx)
          routeCtx.auth.access.assert(params.requireAccess)
        } else {
          // 只需要认证
          routeCtx.auth = await useApiAuth(req, serviceCtx)
        }

        // 设置便捷访问属性
        routeCtx.userId = routeCtx.auth.userId
        routeCtx.sessionId = routeCtx.auth.sessionId
      }

      // 参数校验，尝试获取并解析 params/query/body
      if (params.schemas?.params) {
        routeCtx.params = params.schemas.params.parse(routeCtx.params)
      }

      if (params.schemas?.query) {
        routeCtx.query = params.schemas.query.parse(routeCtx.query)
      }

      if (params.schemas?.body) {
        // 只要声明了 body schema，就统一按“可读取 body”的请求处理。
        // 不要依赖 Content-Length（在 NextRequest/Node 测试里经常缺失），
        // 通过读取 text 来区分“空 body”与“非法 JSON”。
        const rawText = await req.text()

        if (rawText.trim().length === 0) {
          throw new AppError(400, 'INVALID_INPUT', 'Request body is required')
        }

        let rawBody: unknown
        try {
          rawBody = JSON.parse(rawText)
        } catch {
          throw new AppError(400, 'INVALID_INPUT', 'Invalid JSON format in request body')
        }

        routeCtx.body = params.schemas.body.parse(rawBody)
      }

      if (params.rateLimit) {
        const rateLimitConfig = normalizeRouteRateLimitPolicy(params.rateLimit)

        // 1. 提取并验证 IP
        const ipResult = extractClientIpSafe(req, {
          trustProxy: env.RATE_LIMIT_TRUST_PROXY,
          allowPrivateIp: env.RATE_LIMIT_ALLOW_PRIVATE_IP,
          requireIp: true,
        })

        if (!ipResult.ip) {
          const res = createJsonApiResponse(
            req,
            fail('INVALID_CLIENT_IP', '无法识别客户端 IP 地址，请求被拒绝'),
            { status: 400 }
          )
          res.headers.set(TRACE_ID_HEADER, traceId)

          routeCtx.logger.warn(
            {
              action: 'request.invalid_ip',
              reason: ipResult.reason,
              headers: Object.fromEntries(req.headers.entries()),
            },
            'Request rejected: unable to determine client IP'
          )

          return res
        }

        const typedRouteCtx = routeCtx as V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>
        const rateLimitRule = resolveRouteRateLimitRule(normalizedAction ?? undefined, req)
        const identity = rateLimitConfig.identity?.(typedRouteCtx) ?? routeCtx.userId
        const whitelist = resolveRouteRateLimitWhitelist(rateLimitConfig.whitelist, typedRouteCtx)

        const rateLimitResult = await enforceRateLimit(
          {
            rule: rateLimitRule,
            ip: ipResult.ip,
            now: Date.now(),
            max: rateLimitConfig.max,
            windowMs: rateLimitConfig.windowMs,
            identity,
            network: rateLimitConfig.network,
            whitelist,
            userId: routeCtx.userId,
            userRoles: routeCtx.auth?.roles,
          },
          routeCtx.logger
        )

        if (!rateLimitResult.allowed) {
          const res = createJsonApiResponse(
            req,
            fail('TOO_MANY_REQUESTS', rateLimitConfig.message),
            { status: 429 }
          )
          res.headers.set('Retry-After', String(rateLimitResult.retryAfterSeconds))
          res.headers.set(TRACE_ID_HEADER, traceId)
          routeCtx.logger.warn(
            { action: 'request.rate_limited', retryAfterSeconds: rateLimitResult.retryAfterSeconds },
            'Request rate limited'
          )
          return res
        }
      }

      // 调用业务 handler（类型断言以支持认证和非认证处理器）
      const res = await params.handler(routeCtx as V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>)

      // 记录完成日志
      const durationMs = Date.now() - startMs
      const completedLog: Record<string, unknown> = {
        statusCode: res.status,
        durationMs,
      }

      if (enableHttpDetails) {
        const responsePayloadSnapshot = await readResponsePayloadSnapshot(res)

        completedLog.request = {
          method: req.method,
          pathname,
          headers: maskSensitiveData(headersToObject(req.headers)),
          params: maskSensitiveData(routeCtx.params),
          query: maskSensitiveData(routeCtx.query),
          payloadFormat: requestPayloadSnapshot?.payloadFormat ?? 'empty',
          contentType: requestPayloadSnapshot?.contentType ?? null,
          body: maskSensitiveData(routeCtx.body ?? requestPayloadSnapshot?.payload ?? null),
        }

        completedLog.response = {
          headers: headersToObject(res.headers),
          payloadFormat: responsePayloadSnapshot.payloadFormat,
          contentType: responsePayloadSnapshot.contentType,
          payload: maskSensitiveData(responsePayloadSnapshot.payload),
        }
      }

      // 根据响应状态码区分日志级别
      if (res.status >= 500) {
        routeCtx.logger.error(completedLog, 'request.completed')
      } else if (res.status >= 400) {
        routeCtx.logger.warn(completedLog, 'request.completed')
      } else {
        routeCtx.logger.info(completedLog, 'request.completed')
      }

      // 附加 traceId 到响应头
      res.headers.set(TRACE_ID_HEADER, traceId)
      params.onSuccess?.(routeCtx as V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>, res) // 可选二次处理响应

      // 返回响应并附加 CORS 头
      return appendCorsHeaders(req, res)
    } catch (error: unknown) {

      // 统一错误处理流程
      const { status, code, message } = useApiError(error) // 映射错误
      const body = fail(code, message) // 构造错误响应体
      const res = createJsonApiResponse(req, body, { status }) // 构造响应
      const durationMs = Date.now() - startMs // 计算请求处理时长

      // 记录错误日志
      if (error instanceof z.ZodError) {
        routeCtx.logger.warn(
          {
            statusCode: status,
            durationMs,
            errorCode: body.error.code,
            errorMessage: body.error.message,
            issueCount: error.issues.length,
            request: enableHttpDetails
              ? {
                  method: req.method,
                  pathname,
                  headers: maskSensitiveData(headersToObject(req.headers)),
                  params: maskSensitiveData(routeCtx.params),
                  query: maskSensitiveData(routeCtx.query),
                  payloadFormat: requestPayloadSnapshot?.payloadFormat ?? 'empty',
                  contentType: requestPayloadSnapshot?.contentType ?? null,
                  body: maskSensitiveData(routeCtx.body ?? requestPayloadSnapshot?.payload ?? null),
                }
              : undefined,
            response: enableHttpDetails
              ? {
                  statusCode: status,
                  payload: maskSensitiveData(body),
                }
              : undefined,
          },
          'request.validation_failed',
        )
      } else {
        // 构造日志对象
        const logObject: Record<string, unknown> = {
          statusCode: status,
          durationMs,
          errorCode: body.error.code,
          errorMessage: body.error.message,
        }

        // 仅对 500+ 错误记录完整的 error 对象（包含 stack trace）
        if (status >= 500 && error instanceof Error) {
          logObject.err = error
        }

        if (enableHttpDetails) {
          logObject.request = {
            method: req.method,
            pathname,
            headers: maskSensitiveData(headersToObject(req.headers)),
            params: maskSensitiveData(routeCtx.params),
            query: maskSensitiveData(routeCtx.query),
            payloadFormat: requestPayloadSnapshot?.payloadFormat ?? 'empty',
            contentType: requestPayloadSnapshot?.contentType ?? null,
            body: maskSensitiveData(routeCtx.body ?? requestPayloadSnapshot?.payload ?? null),
          }

          logObject.response = {
            statusCode: status,
            payload: maskSensitiveData(body),
          }
        }

        routeCtx.logger.error(logObject, 'request.failed')
      }

      res.headers.set(TRACE_ID_HEADER, traceId)
      params.onError?.(routeCtx as V1AuthenticatedRouteContextWithInput<TParams, TQuery, TBody>, res, error)
      return res
    }
  }
}
