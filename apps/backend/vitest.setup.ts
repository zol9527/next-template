// Load env files for integration tests
import { config } from 'dotenv'
import { resolve } from 'node:path'

// 优先加载 test 配置，其次使用默认 .env
for (const file of ['.env.test', '.env']) {
  const result = config({ path: resolve(process.cwd(), file) })
  if (!result.error) break
}

// Required by src/env.mjs validations (min length 32)
// NODE_ENV is read-only in modern Node.js, only set if not already defined
if (!process.env.NODE_ENV) {
  // @ts-expect-error - Setting NODE_ENV for testing purposes
  process.env.NODE_ENV = 'test'
}
process.env.AUTH_JWT_ACCESS_SECRET =
  process.env.AUTH_JWT_ACCESS_SECRET ?? 'test_access_secret_0123456789_0123456789'
process.env.AUTH_REFRESH_TOKEN_PEPPER =
  process.env.AUTH_REFRESH_TOKEN_PEPPER ?? 'test_refresh_pepper_0123456789_0123456789'

// WeChat session_key encryption secret for tests (min length 32)
process.env.WECHAT_SESSION_KEY_SECRET =
  process.env.WECHAT_SESSION_KEY_SECRET ?? 'test_wechat_session_secret_0123456789_0123456789'

// Seed memory store with an initial admin user for service tests
process.env.INITIAL_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME ?? 'admin'
process.env.INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD ?? 'AdminPassw0rd!'

// Keep auth TTLs small-ish for tests (optional)
process.env.AUTH_ACCESS_TTL_SECONDS = process.env.AUTH_ACCESS_TTL_SECONDS ?? '900'
process.env.AUTH_REFRESH_TTL_SECONDS = process.env.AUTH_REFRESH_TTL_SECONDS ?? String(15 * 24 * 60 * 60)
process.env.AUTH_MAX_SESSIONS_PER_USER = process.env.AUTH_MAX_SESSIONS_PER_USER ?? '3'

// OSS Config for tests
process.env.ALIYUN_OSS_BUCKET = process.env.ALIYUN_OSS_BUCKET ?? 'test-bucket'
process.env.ALIYUN_OSS_DIR_PREFIX = process.env.ALIYUN_OSS_DIR_PREFIX ?? 'uploads/'

// WeChat Pay Config for tests
process.env.WECHAT_PAY_MCHID = process.env.WECHAT_PAY_MCHID ?? '1234567890'
process.env.WECHAT_PAY_API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY ?? 'test_key_0123456789_0123456789'
process.env.WECHAT_PAY_CERT_SERIAL = process.env.WECHAT_PAY_CERT_SERIAL ?? 'ABC123DEF456'
process.env.WECHAT_PAY_PRIVATE_KEY_PEM = process.env.WECHAT_PAY_PRIVATE_KEY_PEM ?? 'test_private_key'
process.env.WECHAT_PAY_PLATFORM_CERT_PEM = process.env.WECHAT_PAY_PLATFORM_CERT_PEM ?? 'test_platform_cert'

// Polyfill ResizeObserver for jsdom (required by Radix UI components)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

// Setup testing library for React component tests
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
process.env.MFA_SECRET_ENCRYPTION_KEY = process.env.MFA_SECRET_ENCRYPTION_KEY ?? 'test_mfa_encryption_key_0123456789_0123456789'
