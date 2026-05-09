import { beforeEach, vi } from 'vitest'
import { uniMock, clearLogs, clearStorage } from './mocks/uni'

beforeEach(() => {
  global.uni = uniMock as any

  clearLogs()
  clearStorage()

  vi.clearAllMocks()
})
