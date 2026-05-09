import { describe, expect, it } from 'vitest'
import { Writable } from 'node:stream'
import pino from 'pino'

import { SENSITIVE_KEYS } from '@/lib/logger/sensitive'

describe('logger sensitive redaction', () => {
  it('redacts WeChat Pay notify headers and body fields', () => {
    const chunks: string[] = []

    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString())
        callback()
      },
    })

    const testLogger = pino(
      {
        level: 'info',
        redact: {
          paths: SENSITIVE_KEYS,
          censor: '[REDACTED]',
        },
      },
      stream,
    )

    testLogger.info({
      headers: {
        'wechatpay-signature': 'SIGNATURE',
        'wechatpay-serial': 'SERIAL',
        'wechatpay-timestamp': 'TIMESTAMP',
        'wechatpay-nonce': 'NONCE',
        authorization: 'Bearer abc',
        cookie: 'sid=123',
        'set-cookie': 'sid=123; HttpOnly',
      },
      bodyText: '{"sensitive":"payload"}',
      rawBody: '{"raw":"payload"}',
    })

    const last = chunks.at(-1)
    expect(last).toBeTruthy()

    const parsed = JSON.parse(last as string) as {
      headers: Record<string, string>
      bodyText: string
      rawBody: string
    }

    expect(parsed.headers['wechatpay-signature']).toBe('[REDACTED]')
    expect(parsed.headers['wechatpay-serial']).toBe('[REDACTED]')
    expect(parsed.headers['wechatpay-timestamp']).toBe('[REDACTED]')
    expect(parsed.headers['wechatpay-nonce']).toBe('[REDACTED]')
    expect(parsed.headers.authorization).toBe('[REDACTED]')
    expect(parsed.headers.cookie).toBe('[REDACTED]')
    expect(parsed.headers['set-cookie']).toBe('[REDACTED]')
    expect(parsed.bodyText).toBe('[REDACTED]')
    expect(parsed.rawBody).toBe('[REDACTED]')
  })
})
