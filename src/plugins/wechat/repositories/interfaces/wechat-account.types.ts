export type WechatAccountRecord = {
  id: string
  userId: string
  openid: string
  unionid: string | null

  /**
   * 服务端加密存储的 session_key（严禁返回给客户端）
   */
  sessionKey: string | null
}
