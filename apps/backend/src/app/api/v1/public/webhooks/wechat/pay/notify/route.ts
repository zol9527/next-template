import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createOptionsResponse } from '@/lib/http/response'
import { verifyAndDecryptWechatPayNotify } from '@/lib/wechat/pay'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderRepository, createPaymentRepository, createProductRepository, createOrderFulfillmentJobRepository, createWechatAccountRepository } from '@/repositories/factory'
import { createWechatPayService, WechatPayServiceError } from '@/plugins/wechat/services/wechat-pay.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { env } from '@/config'

function createWechatNotifyFailResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      code: 'FAIL',
      message,
    },
    { status },
  )
}

/**
 * 安全修复 H-2: 微信支付回调 IP 白名单检查
 *
 * 在 RSA 签名验证之前执行 IP 检查，作为纵深防御手段：
 * - 阻止非微信来源的请求触发 RSA 验签（CPU 密集型操作），降低 DoS 风险
 * - 即使签名验证存在未来缺陷，IP 白名单仍可作为第二道防线
 *
 * IP 白名单通过 WECHAT_PAY_NOTIFY_ALLOWED_IPS 环境变量配置（CIDR 格式，逗号分隔）。
 * 未配置时跳过检查，仅依赖 RSA 签名验证。
 *
 * 微信支付回调服务器 IP 段参考：
 * https://pay.weixin.qq.com/doc/v3/merchant/4012791861
 */
function isIpInWhitelist(ip: string | null, allowedCidrs: string[]): boolean {
  if (!ip || allowedCidrs.length === 0) return false

  for (const cidr of allowedCidrs) {
    const trimmed = cidr.trim()
    if (!trimmed) continue

    // 简单 IP 精确匹配
    if (!trimmed.includes('/')) {
      if (ip === trimmed) return true
      continue
    }

    // CIDR 匹配（仅支持 IPv4）
    const [network, prefixStr] = trimmed.split('/')
    const prefix = Number(prefixStr)
    if (!network || !Number.isFinite(prefix) || prefix < 0 || prefix > 32) continue

    const ipParts = ip.split('.').map(Number)
    const netParts = network.split('.').map(Number)
    if (ipParts.length !== 4 || netParts.length !== 4) continue
    if (ipParts.some(isNaN) || netParts.some(isNaN)) continue

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
    const netNum = (netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3]
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0

    if ((ipNum & mask) === (netNum & mask)) return true
  }

  return false
}

export const POST = withV1Route({
  pluginGuard: 'wechat',
  action: 'wechat:pay:notify',
  handler: async ({ req, serviceContext, logger }) => {
    const bodyText = await req.text()
    const headers = new Headers(req.headers)

    /**
     * 安全修复 H-2: IP 白名单检查（在 RSA 验签之前执行）
     *
     * 若配置了 WECHAT_PAY_NOTIFY_ALLOWED_IPS，则先检查请求来源 IP。
     * 不在白名单内的请求直接拒绝（403），避免消耗 CPU 执行 RSA 验签。
     * 未配置时跳过此检查，保持向后兼容。
     */
    const allowedIpsConfig = env.WECHAT_PAY_NOTIFY_ALLOWED_IPS
    if (allowedIpsConfig) {
      const allowedCidrs = allowedIpsConfig.split(',').map((s) => s.trim()).filter(Boolean)
      const ipResult = extractClientIpSafe(req, {
        trustProxy: env.RATE_LIMIT_TRUST_PROXY,
        allowPrivateIp: true, // 允许内网 IP（负载均衡器可能转发内网 IP）
        requireIp: false,
      })

      if (!isIpInWhitelist(ipResult.ip, allowedCidrs)) {
        logger.warn({
          action: 'wechat_pay.notify.ip_rejected',
          clientIp: ipResult.ip,
          allowedCidrs,
        })
        return createWechatNotifyFailResponse(403, 'Forbidden')
      }
    }

    /**
     * 在路由层完成验签 + 解密（含时间戳重放攻击防护），将解码结果传入 service，
     * 避免 service 内部重复执行 RSA 验签。
     *
     * 注意：微信支付回调 IP 白名单需要在运行时配置。
     * 微信服务器的 IP 范围不固定，建议在网关/负载均衡层配置 IP 白名单，
     * 或在中间件中检查请求 IP 是否在微信已知 IP 段内。
     * 参考：https://developers.weixin.qq.com/doc/ downoad/
     */
    let tx: ReturnType<typeof verifyAndDecryptWechatPayNotify>
    try {
      tx = verifyAndDecryptWechatPayNotify({ headers, bodyText })
    } catch {
      return createWechatNotifyFailResponse(400, 'Invalid notify signature')
    }

    const [orders, payments, products, fulfillmentJobs, wechatAccounts] = await Promise.all([
      createOrderRepository(),
      createPaymentRepository(),
      createProductRepository(),
      createOrderFulfillmentJobRepository(),
      createWechatAccountRepository(),
    ])

    const service = createWechatPayService({
      orders,
      payments,
      products,
      fulfillmentJobs,
      wechatAccounts,
    }, serviceContext)

    try {
      await service.handleNotify({ tx })
    } catch (error: unknown) {
      /**
       * 区分"确定性错误"与"可重试错误"：
       *
       * - INVALID_INPUT（如 amount 缺失/不合法）：返回 400，微信视为"拒绝处理"并停止重试。
       *   此类错误说明通知内容存在问题，重试也无法修复。
       *
       * - INTERNAL_ERROR（如支付记录未找到、数据库异常）：向上抛出，withV1Route 返回 500，
       *   微信将按既定频率（最多 15 次）重试，等待系统恢复。
       */
      if (error instanceof WechatPayServiceError && error.code === 'INVALID_INPUT') {
        return createWechatNotifyFailResponse(400, error.message)
      }

      logger.error(
        {
          action: 'wechat_pay.notify.internal_error',
          err: error,
        },
        'Wechat pay notify processing failed',
      )

      return createWechatNotifyFailResponse(500, 'Internal error')
    }

    return new NextResponse(null, { status: 204 })
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
