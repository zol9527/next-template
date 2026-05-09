import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLocal } from '@/lib/storage/providers/local'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

describe('Local Storage Security Tests', () => {
  const testUploadDir = 'test-uploads-sec'
  const rootTestFile = 'root-test-file.txt'

  beforeEach(async () => {
    await fs.mkdir(testUploadDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testUploadDir, { recursive: true, force: true }).catch(() => {})
    await fs.unlink(rootTestFile).catch(() => {})
  })

  it('should prevent path traversal in uploadFile', async () => {
    const provider = createLocal({
      provider: 'local',
      uploadDir: testUploadDir,
    })

    const fileContent = Buffer.from('malicious content')
    const key = `../${rootTestFile}` // Try to write to root

    // Expect this to FAIL with specific error
    await expect(provider.uploadFile({
        file: fileContent,
        key,
        contentType: 'text/plain',
    })).rejects.toThrow('Invalid file path: Access denied')

    // Verify file does NOT exist outside upload dir
    const exists = await fs.access(rootTestFile).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('should prevent path traversal in deleteFile', async () => {
      const provider = createLocal({
        provider: 'local',
        uploadDir: testUploadDir,
      })

      const key = `../${rootTestFile}`

      // Create a file outside (manually) to simulate existing sensitive file
      await fs.writeFile(rootTestFile, 'sensitive')

      // Attempt to delete it via provider
      // Should fail or at least not delete it
      // Since deleteFile implementation re-throws the error 'Invalid file path: Access denied'
      await expect(provider.deleteFile(key)).rejects.toThrow('Invalid file path: Access denied')

      const exists = await fs.access(rootTestFile).then(() => true).catch(() => false)
      expect(exists).toBe(true)
  })

  it('should prevent sibling directory traversal', async () => {
    // If uploadDir is "test-uploads-sec", attacker tries "test-uploads-sec-sibling/file.txt"
    // which starts with "test-uploads-sec"

    // We need to create the sibling directory manually
    const siblingDir = `${testUploadDir}-sibling`
    const siblingFile = 'secret.txt'

    await fs.mkdir(siblingDir, { recursive: true })
    await fs.writeFile(path.join(siblingDir, siblingFile), 'secret')

    const provider = createLocal({
      provider: 'local',
      uploadDir: testUploadDir,
    })

    const key = `../${siblingDir}/${siblingFile}`

    await expect(provider.uploadFile({
        file: Buffer.from('hacked'),
        key,
        contentType: 'text/plain',
    })).rejects.toThrow('Invalid file path: Access denied')

    // Cleanup sibling
    await fs.rm(siblingDir, { recursive: true, force: true }).catch(() => {})
  })
})
