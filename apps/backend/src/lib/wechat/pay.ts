import 'server-only'

import crypto from 'node:crypto'
import { env } from '@/config'

export type WechatPayJsapiParams = {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA'
  paySign: string
}

export type WechatPayJsapiCreateResult = {
  prepayId: string
  params: WechatPayJsapiParams
}

export type WechatPayNotifyResource = {
  algorithm: 'AEAD_AES_256_GCM'
  ciphertext: string
  associated_data: string
  nonce: string
}

export type WechatPayNotifyBody = {
  id: string
  create_time: string
  resource_type: string
  event_type: string
  summary: string
  resource: WechatPayNotifyResource
}

type WechatPayVerifyKey = {
  serial: string
  publicKeyPem: string
}

export type WechatPayTransaction = {
  mchid: string
  appid: string
  out_trade_no: string
  transaction_id: string
  trade_state: string
  success_time?: string
  payer?: { openid?: string }
  amount?: {
    total?: number
    payer_total?: number
    currency?: string
    payer_currency?: string
  }
}

function requireWechatPayEnv() {
  const mchid = env.WECHAT_PAY_MCHID
  const merchantCertSerial = env.WECHAT_PAY_CERT_SERIAL
  const privateKeyPemRaw = env.WECHAT_PAY_PRIVATE_KEY_PEM
  const publicKeyPemRaw = env.WECHAT_PAY_PUBLIC_KEY
  const publicKeyId = env.WECHAT_PAY_PUBLIC_KEY_ID
  const publicKeysJson = env.WECHAT_PAY_PUBLIC_KEYS_JSON
  const apiV3Key = env.WECHAT_PAY_API_V3_KEY
  const notifyUrl = env.WECHAT_PAY_NOTIFY_URL
  const appid = env.WECHAT_PAY_APPID ?? env.WECHAT_APPID

  /**
   * 规范化来自环境变量的 PEM 内容。
   *
   * 在许多部署环境中，多行 PEM 字符串会以字面 "\\n" 序列而不是实际换行字符的形式存储。
   * Node.js 的 `crypto` API 期望 PEM 包含真实的换行符，因此在使用之前需要将转义的 "\\n"
   * 序列转换为换行字符并去除首尾空白。
   */
  const normalizePem = (value: string | undefined): string | undefined => {
    if (!value) return value
    return value.replace(/\\n/g, '\n').trim()
  }

  const privateKeyPem = normalizePem(privateKeyPemRaw)
  const publicKeyPem = normalizePem(publicKeyPemRaw)
  const parseVerifyKeys = (): WechatPayVerifyKey[] => {
    const normalizedSingle = publicKeyPem && publicKeyId ? [{ serial: publicKeyId, publicKeyPem }] : []
    if (!publicKeysJson) return normalizedSingle

    let parsed: unknown
    try {
      parsed = JSON.parse(publicKeysJson)
    } catch {
      throw new Error('Invalid WECHAT_PAY_PUBLIC_KEYS_JSON')
    }

    if (!Array.isArray(parsed)) {
      throw new Error('WECHAT_PAY_PUBLIC_KEYS_JSON must be an array')
    }

    const fromJson = parsed.map((item) => {
      const serial = typeof item === 'object' && item ? (item as { serial?: unknown }).serial : undefined
      const key = typeof item === 'object' && item ? (item as { publicKeyPem?: unknown }).publicKeyPem : undefined

      if (typeof serial !== 'string' || !serial.trim()) {
        throw new Error('WECHAT_PAY_PUBLIC_KEYS_JSON item.serial is required')
      }

      if (typeof key !== 'string' || !key.trim()) {
        throw new Error('WECHAT_PAY_PUBLIC_KEYS_JSON item.publicKeyPem is required')
      }

      return {
        serial: serial.trim(),
        publicKeyPem: normalizePem(key)!,
      }
    })

    const merged = new Map<string, WechatPayVerifyKey>()
    for (const item of [...normalizedSingle, ...fromJson]) {
      merged.set(item.serial, item)
    }
    return [...merged.values()]
  }

  const verifyKeys = parseVerifyKeys()

  if (verifyKeys.length === 0) {
    throw new Error('Missing WechatPay verify keys (WECHAT_PAY_PUBLIC_KEY[_ID] or WECHAT_PAY_PUBLIC_KEYS_JSON)')
  }

  if (!appid) throw new Error('Missing WECHAT_PAY_APPID/WECHAT_APPID')
  if (!mchid) throw new Error('Missing WECHAT_PAY_MCHID')
  if (!merchantCertSerial) throw new Error('Missing WECHAT_PAY_CERT_SERIAL')
  if (!privateKeyPem) throw new Error('Missing WECHAT_PAY_PRIVATE_KEY_PEM')
  if (!apiV3Key) throw new Error('Missing WECHAT_PAY_API_V3_KEY')

  /**
   * 校验 APIv3 密钥长度：AES-256-GCM 要求密钥必须是 32 字节（UTF-8 编码）。
   *
   * 若密钥长度不符，Node.js crypto 模块会在实际解密时抛出晦涩的 OpenSSL 错误
   * ("Invalid key length"），极难排查。启动时提前校验可快速定位配置问题。
   */
  if (Buffer.byteLength(apiV3Key, 'utf8') !== 32) {
    throw new Error(`WECHAT_PAY_API_V3_KEY must be exactly 32 bytes (UTF-8), got ${Buffer.byteLength(apiV3Key, 'utf8')} bytes`)
  }

  if (!notifyUrl) throw new Error('Missing WECHAT_PAY_NOTIFY_URL')

  return {
    appid,
    mchid,
    merchantCertSerial,
    privateKeyPem,
    verifyKeys,
    apiV3Key,
    notifyUrl,
  }
}

function nonceStr(): string {
  return crypto.randomBytes(16).toString('hex')
}

function signMessage(params: { privateKeyPem: string; message: string }): string {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(params.message)
  signer.end()
  return signer.sign(params.privateKeyPem, 'base64')
}

function createAuthorizationHeader(params: {
  mchid: string
  certSerial: string
  privateKeyPem: string
  method: 'GET' | 'POST'
  urlPathWithQuery: string
  body: string
  timestamp: string
  nonce: string
}): string {
  const message = `${params.method}\n${params.urlPathWithQuery}\n${params.timestamp}\n${params.nonce}\n${params.body}\n`
  const signature = signMessage({ privateKeyPem: params.privateKeyPem, message })

  return (
    'WECHATPAY2-SHA256-RSA2048 ' +
    `mchid="${params.mchid}",nonce_str="${params.nonce}",timestamp="${params.timestamp}",serial_no="${params.certSerial}",signature="${signature}"`
  )
}

async function wechatPayRequest<TResponse>(params: {
  method: 'GET' | 'POST'
  urlPathWithQuery: string
  jsonBody?: unknown
  idempotencyKey?: string
}): Promise<TResponse> {
  const { mchid, merchantCertSerial, privateKeyPem } = requireWechatPayEnv()

  const body = params.jsonBody ? JSON.stringify(params.jsonBody) : ''
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = nonceStr()

  const authorization = createAuthorizationHeader({
    mchid,
    certSerial: merchantCertSerial,
    privateKeyPem,
    method: params.method,
    urlPathWithQuery: params.urlPathWithQuery,
    body,
    timestamp,
    nonce,
  })

  const headers: Record<string, string> = {
    Authorization: authorization,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'generic-admin',
  }

  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey
  }

  /**
   * 请求超时保护：微信支付 API 要求在 5 秒内应答回调，实际请求超时设为 30 秒。
   *
   * 若不设置超时，当微信 API 无响应时，fetch 将挂起直到 serverless 函数运行时限
   * 到期（通常 10～60 秒），占用函数实例且无有效错误信息返回。
   */
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  let res: Response
  try {
    res = await fetch(`https://api.mch.weixin.qq.com${params.urlPathWithQuery}`, {
      method: params.method,
      headers,
      body: params.method === 'POST' ? body : undefined,
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`WechatPay API timeout after 30s: ${params.urlPathWithQuery}`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  const text = await res.text()

  if (!res.ok) {
    /**
     * 错误信息安全处理：仅提取结构化错误码和消息，不包含完整响应体。
     *
     * 微信支付 API 的错误响应可能包含商户号、请求参数等敏感配置信息，
     * 将完整响应文本写入日志或错误消息存在信息泄露风险。
     */
    let errorCode = 'UNKNOWN'
    let errorMessage = 'Request failed'
    try {
      const errorJson = JSON.parse(text) as { code?: string; message?: string }
      errorCode = errorJson.code ?? errorCode
      errorMessage = errorJson.message ?? errorMessage
    } catch { /* 响应非 JSON，忽略解析错误 */ }

    throw new Error(`WechatPay API error: ${res.status} [${errorCode}] ${errorMessage}`)
  }

  return JSON.parse(text) as TResponse
}

export type WechatPayRefundResult = {
  refund_id: string
  out_refund_no: string
  transaction_id: string
  out_trade_no: string
  channel: string
  user_received_account: string
  success_time?: string
  create_time: string
  status: string
  amount: {
    total: number
    refund: number
    payer_total: number
    payer_refund: number
    settlement_refund: number
    settlement_total: number
    discount_refund: number
    currency: string
  }
}

/**
 * 函数: refundWechatPayTransaction
 *
 * 描述: 发起微信支付退款（原路退回）
 *
 * 参数:
 *   outTradeNo(string): 商户订单号
 *   outRefundNo(string): 商户退款单号
 *   reason(string): 退款原因
 *   refundAmountFen(number): 退款金额（分）
 *   totalAmountFen(number): 原订单总金额（分）
 *
 * 返回:
 *   result(WechatPayRefundResult): 微信退款结果
 */
export async function refundWechatPayTransaction(params: {
  outTradeNo: string
  outRefundNo: string
  reason?: string
  refundAmountFen: number
  totalAmountFen: number
}): Promise<WechatPayRefundResult> {
  const body = {
    out_trade_no: params.outTradeNo,
    out_refund_no: params.outRefundNo,
    reason: params.reason,
    amount: {
      refund: params.refundAmountFen,
      total: params.totalAmountFen,
      currency: 'CNY',
    },
  }

  return await wechatPayRequest<WechatPayRefundResult>({
    method: 'POST',
    urlPathWithQuery: '/v3/refund/domestic/refunds',
    jsonBody: body,
    idempotencyKey: params.outRefundNo,
  })
}

/**
 * 函数: createWechatPayJsapiTransaction
 *
 * 描述: 创建微信支付 JSAPI 预下单，并生成小程序端可直接拉起支付的签名参数
 *
 * 参数:
 *   outTradeNo(string): 商户订单号（推荐使用系统生成的 order_no）
 *   description(string): 商品/订单描述
 *   amountFen(number): 支付金额（单位：分）
 *   payerOpenId(string): 支付者 openid
 *
 * 返回:
 *   result(WechatPayJsapiCreateResult): 包含 prepayId 与小程序拉起支付所需的 params
 */
export async function createWechatPayJsapiTransaction(params: {
  outTradeNo: string
  description: string
  amountFen: number
  payerOpenId: string
}): Promise<WechatPayJsapiCreateResult> {
  const { appid, mchid, notifyUrl, privateKeyPem } = requireWechatPayEnv()

  const body = {
    appid,
    mchid,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: notifyUrl,
    amount: { total: params.amountFen, currency: 'CNY' },
    payer: { openid: params.payerOpenId },
  }

  const data = await wechatPayRequest<{ prepay_id: string }>({
    method: 'POST',
    urlPathWithQuery: '/v3/pay/transactions/jsapi',
    jsonBody: body,
    idempotencyKey: params.outTradeNo,
  })

  const prepayId = data.prepay_id
  if (!prepayId) throw new Error('Missing prepay_id from WechatPay response')

  const timeStamp = String(Math.floor(Date.now() / 1000))
  const nonce = nonceStr()
  const pkg = `prepay_id=${prepayId}`
  const message = `${appid}\n${timeStamp}\n${nonce}\n${pkg}\n`
  const paySign = signMessage({ privateKeyPem, message })

  return {
    prepayId,
    params: {
      timeStamp,
      nonceStr: nonce,
      package: pkg,
      signType: 'RSA',
      paySign,
    },
  }
}

function verifyWechatPaySignature(params: {
  verifyKeyPem: string
  timestamp: string
  nonce: string
  body: string
  signature: string
}): boolean {
  const message = `${params.timestamp}\n${params.nonce}\n${params.body}\n`
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(message)
  verifier.end()
  return verifier.verify(params.verifyKeyPem, params.signature, 'base64')
}

function decryptAes256Gcm(params: { apiV3Key: string; nonce: string; associatedData: string; ciphertext: string }): string {
  const key = Buffer.from(params.apiV3Key, 'utf8')
  const nonce = Buffer.from(params.nonce, 'utf8')
  const aad = Buffer.from(params.associatedData, 'utf8')
  const cipherBuffer = Buffer.from(params.ciphertext, 'base64')

  const authTag = cipherBuffer.subarray(cipherBuffer.length - 16)
  const data = cipherBuffer.subarray(0, cipherBuffer.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(authTag)
  decipher.setAAD(aad)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * 函数: verifyAndDecryptWechatPayNotify
 *
 * 描述: 验证微信支付回调签名并解密 resource，返回交易明文数据（仅用于服务端回调处理）
 *
 * 参数:
 *   headers(Headers): NextRequest.headers（需包含 wechatpay-timestamp / wechatpay-nonce / wechatpay-signature / wechatpay-serial）
 *   bodyText(string): 回调原始 body 字符串（用于验签，必须与接收时一致）
 *
 * 返回:
 *   transaction(WechatPayTransaction): 解密后的交易数据（包含 out_trade_no/transaction_id/trade_state 等）
 */
export function verifyAndDecryptWechatPayNotify(params: { headers: Headers; bodyText: string }): WechatPayTransaction {
  const { verifyKeys, apiV3Key } = requireWechatPayEnv()

  const timestamp = params.headers.get('wechatpay-timestamp')
  const nonce = params.headers.get('wechatpay-nonce')
  const signature = params.headers.get('wechatpay-signature')
  const serial = params.headers.get('wechatpay-serial')

  if (!timestamp || !nonce || !signature || !serial) {
    throw new Error('Missing WechatPay signature headers')
  }

  /**
   * 防重放攻击：校验时间戳与服务器当前时间偏差是否在 5 分钟内。
   *
   * 微信支付官方文档要求：若 Wechatpay-Timestamp 与服务器时间偏差超过 5 分钟，
   * 应直接拒绝该请求，以防止攻击者截获合法通知后无限期重放。
   * 参考：https://pay.weixin.qq.com/doc/v3/merchant/4012791861
   */
  const timestampNum = Number(timestamp)
  if (!Number.isFinite(timestampNum)) {
    throw new Error('WechatPay notify timestamp is not a valid number')
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  const diffSeconds = Math.abs(nowSeconds - timestampNum)
  if (diffSeconds > 300) {
    throw new Error(`WechatPay notify timestamp deviation too large: ${diffSeconds}s (max 300s)`)
  }

  const verifyKey = verifyKeys.find((item) => item.serial === serial)
  if (!verifyKey) {
    throw new Error('WechatPay verify serial mismatch')
  }

  const ok = verifyWechatPaySignature({
    verifyKeyPem: verifyKey.publicKeyPem,
    timestamp,
    nonce,
    body: params.bodyText,
    signature,
  })

  if (!ok) {
    throw new Error('Invalid WechatPay notify signature')
  }

  const payload = JSON.parse(params.bodyText) as WechatPayNotifyBody

  const plaintext = decryptAes256Gcm({
    apiV3Key,
    nonce: payload.resource.nonce,
    associatedData: payload.resource.associated_data,
    ciphertext: payload.resource.ciphertext,
  })

  return JSON.parse(plaintext) as WechatPayTransaction
}
