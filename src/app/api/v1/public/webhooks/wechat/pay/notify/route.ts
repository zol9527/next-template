import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createOptionsResponse } from '@/lib/http/response'
import { verifyAndDecryptWechatPayNotify } from '@/lib/wechat/pay'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderRepository, createPaymentRepository, createProductRepository, createOrderFulfillmentJobRepository, createWechatAccountRepository } from '@/repositories/factory'
import { createWechatPayService, WechatPayServiceError } from '@/plugins/wechat/services/wechat-pay.service'

function createWechatNotifyFailResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      code: 'FAIL',
      message,
    },
    { status },
  )
}

export const POST = withV1Route({
  pluginGuard: 'wechat',
  action: 'wechat:pay:notify',
  handler: async ({ req, serviceContext, logger }) => {
    const bodyText = await req.text()
    const headers = new Headers(req.headers)

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
