/**
 * Component: 系统监控指标卡片测试
 *
 * Description: 测试 MonitorStatCard 组件的渲染逻辑
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonitorStatCard } from '@/components/business/admin/system-monitor/stat-card'

describe('MonitorStatCard', () => {
  it('应该正确渲染标题和数值', () => {
    render(<MonitorStatCard title="CPU" value={45.2} unit="%" />)
    expect(screen.getByText('CPU')).toBeDefined()
    expect(screen.getByText('45.2')).toBeDefined()
  })

  it('应该正确显示单位', () => {
    render(<MonitorStatCard title="内存" value={8.5} unit="GB" />)
    expect(screen.getByText('GB')).toBeDefined()
  })

  it('应该正确渲染图标', () => {
    render(<MonitorStatCard title="CPU" value={45} icon={<span data-testid="test-icon">Icon</span>} />)
    expect(screen.getByTestId('test-icon')).toBeDefined()
  })

  it('传入 progress 时应该显示进度条', () => {
    const { container } = render(<MonitorStatCard title="CPU" value={45} progress={45} />)
    expect(container.querySelector('[data-testid="stat-card-progress"]')).not.toBeNull()
  })

  it('不传 progress 时不应该显示进度条', () => {
    const { container } = render(<MonitorStatCard title="主机名" value="server-01" />)
    expect(container.querySelector('[data-testid="stat-card-progress"]')).toBeNull()
  })

  it('应该正确渲染描述文字', () => {
    render(<MonitorStatCard title="磁盘" value={75} unit="%" description="系统磁盘" />)
    expect(screen.getByText('系统磁盘')).toBeDefined()
  })

  it('应该有正确的 data-testid', () => {
    const { container } = render(<MonitorStatCard title="CPU" value={45} />)
    expect(container.querySelector('[data-testid="monitor-stat-card"]')).not.toBeNull()
  })
})
