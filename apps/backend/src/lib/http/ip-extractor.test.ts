import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { extractClientIpSafe, validateAndSanitizeIp } from '@/lib/http/ip-extractor'

// Mock env
vi.mock('@/config', () => ({
  env: {
    RATE_LIMIT_TRUST_PROXY: false,
    RATE_LIMIT_ALLOW_PRIVATE_IP: false,
    RATE_LIMIT_REQUIRE_IP: true,
  },
}))

describe('validateAndSanitizeIp', () => {
  it('应该接受有效的公网 IPv4', () => {
    expect(validateAndSanitizeIp('1.2.3.4')).toBe('1.2.3.4')
    expect(validateAndSanitizeIp('8.8.8.8')).toBe('8.8.8.8')
  })

  it('应该拒绝 0.0.0.0', () => {
    expect(validateAndSanitizeIp('0.0.0.0')).toBeNull()
  })

  it('应该拒绝 0.x.x.x', () => {
    expect(validateAndSanitizeIp('0.1.2.3')).toBeNull()
  })

  it('应该拒绝无效格式', () => {
    expect(validateAndSanitizeIp('invalid-ip')).toBeNull()
    expect(validateAndSanitizeIp('256.1.1.1')).toBeNull()
    expect(validateAndSanitizeIp('')).toBeNull()
  })

  it('应该拒绝内网 IP（默认配置）', () => {
    expect(validateAndSanitizeIp('192.168.1.1')).toBeNull()
    expect(validateAndSanitizeIp('10.0.0.1')).toBeNull()
    expect(validateAndSanitizeIp('172.16.0.1')).toBeNull()
    expect(validateAndSanitizeIp('127.0.0.1')).toBeNull()
  })

  it('应该允许内网 IP（配置允许）', () => {
    expect(validateAndSanitizeIp('192.168.1.1', { allowPrivateIp: true })).toBe('192.168.1.1')
    expect(validateAndSanitizeIp('10.0.0.1', { allowPrivateIp: true })).toBe('10.0.0.1')
    expect(validateAndSanitizeIp('127.0.0.1', { allowPrivateIp: true })).toBe('127.0.0.1')
  })

  it('应该接受有效的 IPv6', () => {
    // ::1 是 localhost，默认配置下会被拒绝
    expect(validateAndSanitizeIp('::1', { allowPrivateIp: true })).toBe('::1')
    expect(validateAndSanitizeIp('2001:4860:4860::8888')).toBe('2001:4860:4860::8888')
  })

  it('应该拒绝 :: （空 IPv6）', () => {
    expect(validateAndSanitizeIp('::')).toBeNull()
  })

  it('应该拒绝 localhost IPv6（默认配置）', () => {
    expect(validateAndSanitizeIp('::1')).toBeNull()
  })

  it('应该清理空格', () => {
    expect(validateAndSanitizeIp('  192.168.1.1  ', { allowPrivateIp: true })).toBe('192.168.1.1')
  })
})

describe('extractClientIpSafe', () => {
  const mockReq = (headers: Record<string, string>): NextRequest => {
    return {
      headers: new Map(Object.entries(headers)),
    } as unknown as NextRequest
  }

  it('应该从 cf-connecting-ip 获取（trustProxy=true）', () => {
    const req = mockReq({ 'cf-connecting-ip': '1.2.3.4' })
    const result = extractClientIpSafe(req, { trustProxy: true })
    expect(result.ip).toBe('1.2.3.4')
    expect(result.reason).toBeUndefined()
  })

  it('应该从 x-forwarded-for 获取第一个 IP（trustProxy=true）', () => {
    const req = mockReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    const result = extractClientIpSafe(req, { trustProxy: true })
    expect(result.ip).toBe('1.2.3.4')
  })

  it('应该拒绝无效 IP 并返回原因（trustProxy=true）', () => {
    const req = mockReq({ 'x-forwarded-for': 'invalid' })
    const result = extractClientIpSafe(req, { trustProxy: true, requireIp: true })
    expect(result.ip).toBeNull()
    expect(result.reason).toBe('invalid_ip_format')
  })

  it('应该拒绝内网 IP（默认配置）', () => {
    const req = mockReq({ 'cf-connecting-ip': '192.168.1.1' })
    const result = extractClientIpSafe(req, { trustProxy: true })
    expect(result.ip).toBeNull()
    expect(result.reason).toBe('invalid_ip_format')
  })

  it('应该允许内网 IP（配置允许）', () => {
    const req = mockReq({ 'cf-connecting-ip': '192.168.1.1' })
    const result = extractClientIpSafe(req, { trustProxy: true, allowPrivateIp: true })
    expect(result.ip).toBe('192.168.1.1')
  })

  it('应该拒绝 0.0.0.0', () => {
    const req = mockReq({ 'cf-connecting-ip': '0.0.0.0' })
    const result = extractClientIpSafe(req, { trustProxy: true })
    expect(result.ip).toBeNull()
    expect(result.reason).toBe('invalid_ip_format')
  })

  it('当 trustProxy=false 时应该不使用代理头', () => {
    const req = mockReq({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' })
    const result = extractClientIpSafe(req, { trustProxy: false, requireIp: true })
    expect(result.ip).toBeNull()
    expect(result.reason).toBe('no_ip_source')
  })

  it('当 requireIp=false 时应该返回 null', () => {
    const req = mockReq({})
    const result = extractClientIpSafe(req, { requireIp: false })
    expect(result.ip).toBeNull()
    expect(result.reason).toBe('ip_not_required')
  })
})
