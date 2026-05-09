import { env } from '@/config'
import { AppError } from '@/lib/errors/app-error'

export type WechatCode2SessionResponse = {
  openid: string
  unionid?: string
  session_key: string
}

type WechatCode2SessionError = {
  errcode: number
  errmsg: string
}

/**
 * 微信 API 错误码映射
 *
 * Function: mapWechatError
 *
 * Description: 将微信 API 错误码映射为适当的 HTTP 错误
 *
 * Parameters:
 * 	errcode(number): 微信错误码
 * 	errmsg(string): 微信错误消息
 *
 * Returns:
 * 	Never(void): 总是抛出 AppError
 */
function mapWechatError(errcode: number, errmsg: string): never {
  // 客户端错误：code 无效
  if (errcode === 40029) {
    throw new AppError(400, 'INVALID_INPUT', `微信登录 code 无效: ${errmsg}`)
  }

  // 客户端错误：code 已使用
  if (errcode === 40163) {
    throw new AppError(400, 'INVALID_INPUT', `微信登录 code 已被使用: ${errmsg}`)
  }

  // 配置错误：appid/secret 配置错误
  if (errcode === 40125 || errcode === 40013 || errcode === 40126) {
    throw new AppError(500, 'INTERNAL_ERROR', `微信配置错误: ${errmsg}`)
  }

  // 其他未知错误
  throw new AppError(500, 'INTERNAL_ERROR', `微信 API 错误: ${errcode} - ${errmsg}`)
}

export async function code2Session(code: string): Promise<WechatCode2SessionResponse> {
  if (!env.WECHAT_APPID || !env.WECHAT_APPSECRET) {
    throw new AppError(500, 'INTERNAL_ERROR', 'WeChat env is not configured')
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', env.WECHAT_APPID)
  url.searchParams.set('secret', env.WECHAT_APPSECRET)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new AppError(500, 'INTERNAL_ERROR', `WeChat code2Session HTTP ${res.status}`)
  }

  const data: unknown = await res.json()
  const err = data as Partial<WechatCode2SessionError>
  if (typeof err.errcode === 'number' && err.errcode !== 0) {
    mapWechatError(err.errcode, err.errmsg ?? 'Unknown error')
  }

  const ok = data as Partial<WechatCode2SessionResponse>
  if (!ok.openid || !ok.session_key) {
    throw new AppError(500, 'INTERNAL_ERROR', 'WeChat code2Session missing fields')
  }

  return {
    openid: ok.openid,
    unionid: ok.unionid,
    session_key: ok.session_key,
  }
}
