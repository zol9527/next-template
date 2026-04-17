/**
Function: SENSITIVE_KEYS

Description: 定义需要在日志中自动脱敏的敏感字段路径（用于 SIEM 兼容的结构化日志）

Parameters:

Returns:
    SENSITIVE_KEYS(string[]): 需要脱敏的字段 key 列表
*/
export const SENSITIVE_KEYS: string[] = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accessToken',
  'refreshToken',
  'idToken',
  'headers.authorization',
  'headers.cookie',
  'headers["authorization"]',
  'headers["cookie"]',
  'headers["set-cookie"]',
  'headers["wechatpay-signature"]',
  'headers["wechatpay-serial"]',
  'headers["wechatpay-timestamp"]',
  'headers["wechatpay-nonce"]',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["authorization"]',
  'req.headers["cookie"]',
  'req.headers["set-cookie"]',
  'req.headers["wechatpay-signature"]',
  'req.headers["wechatpay-serial"]',
  'req.headers["wechatpay-timestamp"]',
  'req.headers["wechatpay-nonce"]',
  'request.headers.authorization',
  'request.headers.cookie',
  'request.headers["authorization"]',
  'request.headers["cookie"]',
  'request.headers["set-cookie"]',
  'request.headers["wechatpay-signature"]',
  'request.headers["wechatpay-serial"]',
  'request.headers["wechatpay-timestamp"]',
  'request.headers["wechatpay-nonce"]',

  'body',
  'rawBody',
  'bodyText',
  'req.body',
  'req.rawBody',
  'req.bodyText',
  'request.body',
  'request.rawBody',
  'request.bodyText',
  'WECHAT_PAY_API_V3_KEY',
  'WECHAT_PAY_PRIVATE_KEY_PEM',
  'WECHAT_PAY_PLATFORM_CERT_PEM',
  'creditCard',
]
