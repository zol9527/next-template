import { describe, it, expect, beforeEach } from 'vitest'
import { createPrismaUserRepository } from '@/repositories/prisma/core/user.repository'

// Simple integration test for new methods
describe('PrismaUserRepository - WeChat Profile Methods', () => {
  let repo: ReturnType<typeof createPrismaUserRepository>

  beforeEach(() => {
    repo = createPrismaUserRepository()
  })

  describe('updateWechatDisplayProfile', () => {
    it('should exist as a method', () => {
      expect(repo.updateWechatDisplayProfile).toBeDefined()
      expect(typeof repo.updateWechatDisplayProfile).toBe('function')
    })
  })

  describe('updateUserPhone', () => {
    it('should exist as a method', () => {
      expect(repo.updateUserPhone).toBeDefined()
      expect(typeof repo.updateUserPhone).toBe('function')
    })
  })
})
