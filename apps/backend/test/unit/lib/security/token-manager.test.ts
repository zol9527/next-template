import { describe, it, expect } from 'vitest'
import { TokenManager } from '@/lib/security/token-manager'

describe('TokenManager', () => {
  describe('verifyRefreshToken', () => {
    it('should return true for valid token and hash', () => {
      // Mock secrets if needed, but TokenManager uses env directly
      // Assuming env is loaded in test environment

      const token = 'valid-token'
      const hash = TokenManager.hashRefreshToken(token)

      const isValid = TokenManager.verifyRefreshToken(token, hash)
      expect(isValid).toBe(true)
    })

    it('should return false for invalid token (same length)', () => {
      const token = 'valid-token'
      const hash = TokenManager.hashRefreshToken(token)

      // invalid-tok is commented out in previous version or unused

      const wrongToken = 'wrong-token'
      // Ensure wrongToken produces a hash of same length (SHA256 always does)

      const isValid = TokenManager.verifyRefreshToken(wrongToken, hash)
      expect(isValid).toBe(false)
    })

    it('should return false for invalid token (different length hash)', () => {
        const token = 'valid-token'
        const hash = TokenManager.hashRefreshToken(token)

        // Construct a hash that is definitely different length
        const shortHash = hash.substring(0, 10)

        const isValid = TokenManager.verifyRefreshToken(token, shortHash)
        expect(isValid).toBe(false)
    })

    it('should return false for completely different string', () => {
      const token = 'valid-token'
      // hash unused in previous version
      const otherHash = TokenManager.hashRefreshToken('other-token')

      const isValid = TokenManager.verifyRefreshToken(token, otherHash)
      expect(isValid).toBe(false)
    })
  })
})
