/**
 * File: test/api/utils/mfa-test-utils.ts
 * Description: MFA API 测试工具函数
 */

import { vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * Function: createMockMfaRepository
 *
 * Description: 创建 Mock MFA Repository
 */
export function createMockMfaRepository() {
  return {
    getUserMfaData: vi.fn(),
    updateUserMfa: vi.fn(),
    disableUserMfa: vi.fn(),
    createActionToken: vi.fn(),
    getActionToken: vi.fn(),
    consumeActionToken: vi.fn(),
    createAuditLog: vi.fn(),
  }
}

/**
 * Function: createMockAuth
 *
 * Description: 创建 Mock Auth Service
 */
export function createMockAuth() {
  return {
    loginWithPassword: vi.fn(),
    issueSession: vi.fn(),
    getMe: vi.fn(),
  }
}

/**
 * Function: createMockRequest
 *
 * Description: 创建 Mock NextRequest
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
}): NextRequest {
  const { method = 'POST', url = 'http://localhost', body, headers = {} } = options

  const request = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return request as unknown as NextRequest
}

/**
 * Function: createMockServiceContext
 *
 * Description: 创建 Mock Service Context
 */
export function createMockServiceContext() {
  return {
    traceId: 'test-trace-id',
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  }
}

/**
 * Function: mockVerifyToken
 *
 * Description: Mock JWT 验证，返回指定用户 ID
 */
export function mockVerifyToken(userId: string) {
  return vi.fn().mockReturnValue({ sub: userId, sessionId: 'test-session-id' })
}
