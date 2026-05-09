import { env } from '@/config'
import { AppError } from '@/lib/errors/app-error'

/**
 * 微信手机号接口响应
 */
type WechatPhoneNumberResponse = {
  errcode: number
  errmsg: string
  phone_info?: {
    phoneNumber: string
    purePhoneNumber: string
    countryCode: string
    watermark: {
      timestamp: number
      appid: string
    }
  }
}

/**
 * Function: getPhoneNumber
 *
 * Description: 通过微信手机号授权 code 获取用户手机号（新版服务端 API）
 *
 * Parameters:
 *   code(string): 微信小程序手机号授权 code
 *
 * Returns:
 *   phone(string): 用户手机号（纯数字，不含区号）
 *   countryCode(string): 国家码（如 86）
 */
export async function getPhoneNumber(code: string): Promise<{ phone: string; countryCode: string }> {
  if (!env.WECHAT_APPID || !env.WECHAT_APPSECRET) {
    throw new AppError(500, 'INTERNAL_ERROR', 'WeChat env is not configured')
  }

  // 获取 access_token
  const accessTokenUrl = new URL('https://api.weixin.qq.com/cgi-bin/token')
  accessTokenUrl.searchParams.set('grant_type', 'client_credential')
  accessTokenUrl.searchParams.set('appid', env.WECHAT_APPID)
  accessTokenUrl.searchParams.set('secret', env.WECHAT_APPSECRET)

  const tokenRes = await fetch(accessTokenUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!tokenRes.ok) {
    throw new AppError(500, 'INTERNAL_ERROR', `WeChat getAccessToken HTTP ${tokenRes.status}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string; errcode?: number; errmsg?: string }
  if (!tokenData.access_token) {
    const errcode = tokenData.errcode ?? -1
    const errmsg = tokenData.errmsg ?? 'Unknown error'
    throw new AppError(500, 'INTERNAL_ERROR', `WeChat getAccessToken failed: ${errcode} - ${errmsg}`)
  }

  // 调用微信手机号接口
  const phoneUrl = new URL('https://api.weixin.qq.com/wxa/business/getuserphonenumber')
  phoneUrl.searchParams.set('access_token', tokenData.access_token)

  const phoneRes = await fetch(phoneUrl.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!phoneRes.ok) {
    throw new AppError(500, 'INTERNAL_ERROR', `WeChat getPhoneNumber HTTP ${phoneRes.status}`)
  }

  const phoneData: WechatPhoneNumberResponse = await phoneRes.json()

  // 错误处理
  if (phoneData.errcode !== 0) {
    // code 无效或已使用
    if (phoneData.errcode === 40029 || phoneData.errcode === 40163) {
      throw new AppError(400, 'INVALID_INPUT', `微信手机号授权 code 无效或已使用: ${phoneData.errmsg}`)
    }

    // 其他错误
    throw new AppError(500, 'INTERNAL_ERROR', `WeChat getPhoneNumber failed: ${phoneData.errcode} - ${phoneData.errmsg}`)
  }

  if (!phoneData.phone_info) {
    throw new AppError(500, 'INTERNAL_ERROR', 'WeChat getPhoneNumber missing phone_info')
  }

  return {
    phone: phoneData.phone_info.purePhoneNumber,
    countryCode: phoneData.phone_info.countryCode,
  }
}
