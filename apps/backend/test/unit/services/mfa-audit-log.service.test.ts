/**
 * File: test/unit/services/mfa-audit-log.service.test.ts
 * Description: MFA 审计日志服务单元测试
（测试日志记录、脱敏、分页、可疑活动检测、审计摘要等）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MfaAuditLogService } from '@/services/core/mfa-audit-log.service'
import type { MfaAuditLogEntry, MfaAuditStatus } from '@/services/core/mfa-audit-log.service'

describe('Unit: MfaAuditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logAction', () => {
    it('should create valid log entry', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        details: { test: 'data' },
      })

      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('userId')
      expect(entry).toHaveProperty('action')
      expect(entry).toHaveProperty('ip')
      expect(entry).toHaveProperty('status')
      expect(entry).toHaveProperty('createdAt')

      expect(entry.userId).toBe('user-123')
      expect(entry.action).toBe('setup')
      expect(entry.status).toBe('success')
      expect(entry.ip).toBe('192.168.1.1')
      expect(entry.userAgent).toBe('Mozilla/5.0...')
      expect(entry.details).toEqual({ test: 'data' })
    })

    it('should generate unique IDs for each log', () => {
      const entry1 = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.1.1',
      })

      const entry2 = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.1.1',
      })

      expect(entry1.id).not.toBe(entry2.id)
    })

    it('should handle null details', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.1.1',
      })

      expect(entry.details).toBe(null)
    })
  })

  describe('logSuccess', () => {
    it('should create success log entry', () => {
      const entry = MfaAuditLogService.logSuccess('user-123', 'enable', '192.168.1.1', 'Mozilla/5.0', {
        verificationMethod: 'totp',
      })

      expect(entry.userId).toBe('user-123')
      expect(entry.action).toBe('enable')
      expect(entry.status).toBe('success')
      expect(entry.ip).toBe('192.168.1.1')
      expect(entry.userAgent).toBe('Mozilla/5.0')
      expect(entry.details).toEqual({ verificationMethod: 'totp' })
    })

    it('should handle missing optional parameters', () => {
      const entry = MfaAuditLogService.logSuccess('user-123', 'verify', '192.168.1.1')

      expect(entry.userId).toBe('user-123')
      expect(entry.userAgent).toBe(null)
      expect(entry.details).toBe(null)
    })
  })

  describe('logFailure', () => {
    it('should create failure log entry', () => {
      const entry = MfaAuditLogService.logFailure(
        'user-123',
        'verify',
        '192.168.1.1',
        'Invalid token',
        'Mozilla/5.0',
        { attempts: 3 },
      )

      expect(entry.userId).toBe('user-123')
      expect(entry.action).toBe('verify')
      expect(entry.status).toBe('failed')
      expect(entry.ip).toBe('192.168.1.1')
      expect(entry.userAgent).toBe('Mozilla/5.0')
      expect(entry.details?.errorMessage).toBe('Invalid token')
      expect(entry.details?.attempts).toBe(3)
    })

    it('should include error message in details', () => {
      const entry = MfaAuditLogService.logFailure(
        'user-123',
        'verify',
        '192.168.1.1',
        'Too many attempts',
      )

      expect(entry.details?.errorMessage).toBe('Too many attempts')
    })
  })

  describe('formatForStorage', () => {
    it('should format log entry for database storage', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.1.1',
      })

      const formatted = MfaAuditLogService.formatForStorage(entry)

      expect(formatted).toHaveProperty('userId')
      expect(formatted).toHaveProperty('action')
      expect(formatted).toHaveProperty('ip')
      expect(formatted).toHaveProperty('status')
      expect(formatted).toHaveProperty('details')

      // 不应该包含 id 和 createdAt（这些由数据库生成）
      expect(formatted).not.toHaveProperty('id')
      expect(formatted).not.toHaveProperty('createdAt')
    })

    it('should preserve all relevant fields', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'verify',
        status: 'failed' as const,
        ip: '10.0.0.1',
        userAgent: 'Test Browser',
        details: { errorCode: 'INVALID_TOKEN' },
      })

      const formatted = MfaAuditLogService.formatForStorage(entry)

      expect(formatted.userId).toBe('user-123')
      expect(formatted.action).toBe('verify')
      expect(formatted.status).toBe('failed')
      expect(formatted.ip).toBe('10.0.0.1')
      expect(formatted.userAgent).toBe('Test Browser')
      expect(formatted.details).toEqual({ errorCode: 'INVALID_TOKEN' })
    })
  })

  describe('sanitizeLogEntry', () => {
    it('should mask IP address (keep first two segments)', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '192.168.100.50',
      })

      const sanitized = MfaAuditLogService.sanitizeLogEntry(entry)

      expect(sanitized.ip).toBe('192.168.***.***')
    })

    it('should preserve all other fields', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '10.20.30.40',
        userAgent: 'Test Agent',
        details: { test: 'data' },
      })

      const sanitized = MfaAuditLogService.sanitizeLogEntry(entry)

      expect(sanitized.userId).toBe('user-123')
      expect(sanitized.action).toBe('setup')
      expect(sanitized.status).toBe('success')
      expect(sanitized.userAgent).toBe('Test Agent')
      expect(sanitized.details).toEqual({ test: 'data' })
    })

    it('should handle short IP addresses', () => {
      const entry = MfaAuditLogService.logAction({
        userId: 'user-123',
        action: 'setup',
        status: 'success',
        ip: '10.0.0.1',
      })

      const sanitized = MfaAuditLogService.sanitizeLogEntry(entry)

      expect(sanitized.ip).toBe('10.0.***.***')
    })
  })

  describe('calculatePagination', () => {
    it('should calculate default pagination', () => {
      const result = MfaAuditLogService.calculatePagination(
        { userId: 'user-123' },
        100,
      )

      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
      expect(result.hasMore).toBe(true)
    })

    it('should calculate custom pagination', () => {
      const result = MfaAuditLogService.calculatePagination(
        { userId: 'user-123', limit: 20, offset: 40 },
        100,
      )

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(40)
      expect(result.hasMore).toBe(true)
    })

    it('should detect last page', () => {
      const result = MfaAuditLogService.calculatePagination(
        { userId: 'user-123', limit: 50, offset: 50 },
        100,
      )

      expect(result.limit).toBe(50)
      expect(result.offset).toBe(50)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('validateActionType', () => {
    it('should return true for valid built-in actions', () => {
      const validActions = ['setup', 'enable', 'disable', 'verify', 'verify-action', 'use-backup-code', 'reset-by-admin', 'generate-backup-codes']

      for (const action of validActions) {
        expect(MfaAuditLogService.validateActionType(action)).toBe(true)
      }
    })

    it('should return true for custom string action', () => {
      expect(MfaAuditLogService.validateActionType('custom-action')).toBe(true)
      expect(MfaAuditLogService.validateActionType('special-operation-123')).toBe(true)
    })

    it('should return false for non-string values', () => {
      expect(MfaAuditLogService.validateActionType(null as unknown as string)).toBe(false)
      expect(MfaAuditLogService.validateActionType(undefined as unknown as string)).toBe(false)
    })
  })

  describe('validateStatus', () => {
    it('should return true for valid statuses', () => {
      expect(MfaAuditLogService.validateStatus('success')).toBe(true)
      expect(MfaAuditLogService.validateStatus('failed')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(MfaAuditLogService.validateStatus('pending')).toBe(false)
      expect(MfaAuditLogService.validateStatus('error')).toBe(false)
      expect(MfaAuditLogService.validateStatus('')).toBe(false)
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect excessive failed attempts', () => {
      const now = Date.now()
      const logs = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        userId: 'user-123',
        action: 'verify',
        ip: '192.168.1.1',
        userAgent: 'Test',
        status: 'failed' as const,
        details: { errorMessage: 'Invalid token' },
        createdAt: new Date(now - i * 1000), // 过去 5 秒
      }))

      const isSuspicious = MfaAuditLogService.detectSuspiciousActivity(logs)

      expect(isSuspicious).toBe(true)
    })

    it('should not detect normal activity', () => {
      const now = Date.now()
      const logs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test',
          status: 'success',
          details: null,
          createdAt: new Date(now),
        },
        {
          id: 'log-2',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test',
          status: 'failed' as const,
          details: { errorMessage: 'Invalid token' },
          createdAt: new Date(now - 1000),
        },
      ]

      const isSuspicious = MfaAuditLogService.detectSuspiciousActivity(logs)

      expect(isSuspicious).toBe(false)
    })

    it('should detect frequent backup code usage', () => {
      const now = Date.now()
      const logs = Array.from({ length: 3 }, (_, i) => ({
        id: `log-${i}`,
        userId: 'user-123',
        action: 'use-backup-code',
        ip: '192.168.1.1',
        userAgent: 'Test',
        status: 'success',
        details: null,
        createdAt: new Date(now - i * 60000), // 过去 3 分钟
      }))

      const isSuspicious = MfaAuditLogService.detectSuspiciousActivity(logs)

      expect(isSuspicious).toBe(true)
    })

    it('should detect multiple IPs in short time', () => {
      const now = Date.now()
      const logs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test',
          status: 'success',
          details: null,
          createdAt: new Date(now),
        },
        {
          id: 'log-2',
          userId: 'user-123',
          action: 'verify',
          ip: '10.0.0.1',
          userAgent: 'Test',
          status: 'success',
          details: null,
          createdAt: new Date(now - 30000),
        },
        {
          id: 'log-3',
          userId: 'user-123',
          action: 'verify',
          ip: '172.16.0.1',
          userAgent: 'Test',
          status: 'success',
          details: null,
          createdAt: new Date(now - 60000),
        },
      ]

      const isSuspicious = MfaAuditLogService.detectSuspiciousActivity(logs)

      expect(isSuspicious).toBe(true)
    })

    it('should use custom time window and threshold', () => {
      const now = Date.now()
      const logs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test',
          status: 'failed' as const,
          details: null,
          createdAt: new Date(now - 2000), // 2 秒前
        },
      ]

      // 使用短时间窗口（10 秒）和低阈值（1 次）
      const isSuspicious = MfaAuditLogService.detectSuspiciousActivity(logs, 10000, 1)

      expect(isSuspicious).toBe(true)
    })
  })

  describe('getAuditSummary', () => {
    it('should calculate summary correctly', () => {
      const now = Date.now()
      const logs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test1',
          status: 'success',
          details: null,
          createdAt: new Date(now - 60000),
        },
        {
          id: 'log-2',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test2',
          status: 'success',
          details: null,
          createdAt: new Date(now - 30000),
        },
        {
          id: 'log-3',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test3',
          status: 'failed' as const,
          details: { errorMessage: 'Invalid token' },
          createdAt: new Date(now - 10000),
        },
        {
          id: 'log-4',
          userId: 'user-123',
          action: 'verify',
          ip: '192.168.1.1',
          userAgent: 'Test4',
          status: 'failed' as const,
          details: { errorMessage: 'Invalid token' },
          createdAt: new Date(now - 5000),
        },
      ]

      const summary = MfaAuditLogService.getAuditSummary(logs)

      expect(summary.totalLogs).toBe(4)
      expect(summary.successCount).toBe(2)
      expect(summary.failureCount).toBe(2)
      expect(summary.lastSuccessAt).toBeDefined()
      expect(summary.lastFailureAt).toBeDefined()
    })

    it('should handle empty logs', () => {
      const summary = MfaAuditLogService.getAuditSummary([])

      expect(summary.totalLogs).toBe(0)
      expect(summary.successCount).toBe(0)
      expect(summary.failureCount).toBe(0)
      expect(summary.lastSuccessAt).toBe(null)
      expect(summary.lastFailureAt).toBe(null)
      expect(summary.suspiciousActivity).toBe(false)
    })

    it('should include suspicious activity in summary', () => {
      const now = Date.now()
      const logs = Array.from({ length: 5 }, (_, i) => ({
        id: `log-${i}`,
        userId: 'user-123',
        action: 'verify',
        ip: '192.168.1.1',
        userAgent: 'Test',
        status: 'failed' as const,
        details: null,
        createdAt: new Date(now - i * 1000),
      }))

      const summary = MfaAuditLogService.getAuditSummary(logs)

      expect(summary.suspiciousActivity).toBe(true)
    })
  })

  describe('integration: complete logging workflow', () => {
    it('should complete full log entry lifecycle', () => {
      // 1. 创建日志
      const entry = MfaAuditLogService.logSuccess('user-123', 'setup', '192.168.1.1', 'Mozilla/5.0', {
        verificationMethod: 'totp',
      })

      // 2. 格式化用于存储
      const formatted = MfaAuditLogService.formatForStorage(entry)

      // 3. 清理用于输出
      const sanitized = MfaAuditLogService.sanitizeLogEntry(entry)

      // 4. 验证
      expect(formatted.userId).toBe('user-123')
      expect(sanitized.ip).toBe('192.168.***.***')
    })
  })
})
