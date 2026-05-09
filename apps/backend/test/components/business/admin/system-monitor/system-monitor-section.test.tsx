/**
 * Component: 系统监控区块组件测试
 *
 * Description: 测试 SystemMonitorSection 组件的加载、错误和成功渲染状态
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { SystemMonitorSection } from '@/components/business/admin/system-monitor/system-monitor-section'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

describe('SystemMonitorSection', () => {
  const mockStats = {
    cpu: { model: 'Test CPU', cores: 4, usage: 45.2, loadAvg: [1.0, 0.8, 0.6] },
    memory: { total: 16 * 1024 * 1024 * 1024, used: 8 * 1024 * 1024 * 1024, free: 8 * 1024 * 1024 * 1024, usagePercent: 50, process: { rss: 100 * 1024 * 1024, heapTotal: 80 * 1024 * 1024, heapUsed: 60 * 1024 * 1024, external: 10 * 1024 * 1024 } },
    disk: { total: 500 * 1024 * 1024 * 1024, used: 250 * 1024 * 1024 * 1024, free: 250 * 1024 * 1024 * 1024, usagePercent: 50 },
    uptime: { system: 86400, process: 3600 },
    process: { pid: 1234, nodeVersion: 'v20.0.0', platform: 'darwin', arch: 'arm64' },
    network: { hostname: 'test-server', interfaces: [{ name: 'en0', address: '192.168.1.1', family: 'IPv4' as const }], publicIp: '1.2.3.4' },
    database: { status: 'connected' as const, responseTime: 5.2, version: null },
    timestamp: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('加载中状态应该显示骨架屏', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    const { container } = render(<SystemMonitorSection />)
    expect(container.querySelector('[data-testid="system-monitor-loading"]')).not.toBeNull()
  })

  it('错误状态应该显示错误提示和重试按钮', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('获取系统指标失败'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    render(<SystemMonitorSection />)
    expect(screen.getByText('获取系统指标失败')).toBeDefined()
    expect(screen.getByText('重试')).toBeDefined()
  })

  it('成功状态应该显示系统监控数据', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    const { container } = render(<SystemMonitorSection />)
    expect(container.querySelector('[data-testid="system-monitor"]')).not.toBeNull()
    expect(screen.getByText('系统监控')).toBeDefined()
  })

  it('成功状态应该显示 8 张指标卡片', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    const { container } = render(<SystemMonitorSection />)
    const cards = container.querySelectorAll('[data-testid="monitor-stat-card"]')
    expect(cards.length).toBe(8)
  })

  it('应该显示 CPU 使用率', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    render(<SystemMonitorSection />)
    expect(screen.getByText('CPU')).toBeDefined()
    expect(screen.getByText('45.2')).toBeDefined()
  })

  it('应该显示数据库状态', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    render(<SystemMonitorSection />)
    expect(screen.getByText('数据库')).toBeDefined()
    expect(screen.getByText('正常')).toBeDefined()
  })

  it('数据库异常时应该显示异常状态', async () => {
    const errorStats = { ...mockStats, database: { ...mockStats.database, status: 'error' as const, responseTime: -1 } }
    vi.mocked(useQuery).mockReturnValue({
      data: errorStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    render(<SystemMonitorSection />)
    expect(screen.getByText('异常')).toBeDefined()
  })

  it('无数据时应该不渲染任何内容', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    const { container } = render(<SystemMonitorSection />)
    expect(container.querySelector('[data-testid="system-monitor"]')).toBeNull()
    expect(container.querySelector('[data-testid="system-monitor-loading"]')).toBeNull()
    expect(container.querySelector('[data-testid="system-monitor-error"]')).toBeNull()
  })

  it('应该显示 10 秒刷新提示', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    render(<SystemMonitorSection />)
    expect(screen.getByText('实时 · 10秒刷新')).toBeDefined()
  })
})
