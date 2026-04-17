import type { Logger } from 'pino'
import type { NextRequest } from 'next/server'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'

/**
 * Service 层执行上下文
 * 用于在 API 层与 Service 层之间传播 traceId 和 logger
 */
export interface ServiceContext {
  /** 链路追踪 ID */
  traceId: string
  /** 已绑定 traceId 的 logger 实例 */
  logger: Logger
  /** 客户端 User-Agent (可选) */
  userAgent?: string | null
  /** 客户端 IP 地址 (可选) */
  clientIp?: string | null
}

/**
 * 创建 Service 上下文
 * @param traceId 链路追踪 ID
 * @param logger 父 logger 实例
 * @param req Next.js 请求对象（可选，用于提取 userAgent 和 clientIp）
 * @returns ServiceContext
 */
export function createServiceContext(traceId: string, logger: Logger, req?: NextRequest): ServiceContext {
  // 从 req 提取 userAgent 和 clientIp
  const userAgent = req?.headers.get('user-agent') ?? null
  let clientIp: string | null = null

  if (req) {
    const extractionResult = extractClientIpSafe(req)
    clientIp = extractionResult.ip
  }

  return {
    traceId,
    logger: logger.child({ layer: 'service' }),
    userAgent,
    clientIp,
  }
}
