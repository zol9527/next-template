/**
 * Component: AdminDashboardShell
 *
 * Description: 管理后台首页 Shell 组件的测试
 *              测试不同角色用户下各区域的条件渲染逻辑，包括欢迎区域、
 *              系统监控区域和电商数据区域的显示与隐藏
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminDashboardShell } from '@/components/business/admin/admin-dashboard-shell'

// Mock hooks
vi.mock('@/hooks/use-auth')
vi.mock('@/hooks/use-access')

// Mock 子组件，简化为 data-testid 标记的 div
vi.mock('@/components/business/admin/system-monitor/system-monitor-section', () => ({
  SystemMonitorSection: () => <div data-testid="system-monitor">SystemMonitor</div>,
}))
vi.mock('@/components/business/admin/ecommerce-dashboard-section', () => ({
  EcommerceDashboardSection: () => <div data-testid="ecommerce-dashboard">Ecommerce</div>,
}))

// 动态导入被 mock 的模块以获取类型
const mockUseAuth = vi.mocked(await import('@/hooks/use-auth')).useAuth
const mockUseAccess = vi.mocked(await import('@/hooks/use-access')).useAccess

describe('AdminDashboardShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('admin 用户', () => {
    beforeEach(() => {
      // Given: admin 用户已登录，拥有全部权限
      mockUseAuth.mockReturnValue({
        user: { username: 'admin', email: 'admin@test.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        grants: [{ action: 'read', scope: 'dashboard' }],
        roles: [],
        login: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        refetch: vi.fn(),
        hasRole: vi.fn(),
        sessions: [],
        sessionsLoading: false,
        sessionsError: null,
        revokeSession: vi.fn(),
        revokeOtherSessions: vi.fn(),
        refreshSessions: vi.fn(),
      } as ReturnType<typeof mockUseAuth>)

      mockUseAccess.mockReturnValue({
        grants: [{ action: 'read', scope: 'dashboard' }],
        has: vi.fn(() => true),
        assert: vi.fn(),
        canRead: vi.fn(() => true),
        canWrite: vi.fn(() => true),
        canExecute: vi.fn(() => true),
        scopesFor: vi.fn(() => []),
        hasAny: vi.fn(() => true),
        hasAll: vi.fn(() => true),
      })
    })

    it('应该显示 Welcome 区域', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument()
      expect(screen.getByText(/欢迎回来，admin/)).toBeInTheDocument()
    })

    it('应该显示 SystemMonitorSection', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.getByTestId('system-monitor')).toBeInTheDocument()
    })

    it('ecommerce 插件开启时应该显示电商数据', () => {
      // When
      render(<AdminDashboardShell enabledPlugins={['ecommerce']} />)

      // Then
      expect(screen.getByTestId('ecommerce-section')).toBeInTheDocument()
      expect(screen.getByTestId('ecommerce-dashboard')).toBeInTheDocument()
    })

    it('ecommerce 插件关闭时应该隐藏电商数据', () => {
      // When
      render(<AdminDashboardShell enabledPlugins={[]} />)

      // Then
      expect(screen.queryByTestId('ecommerce-section')).not.toBeInTheDocument()
    })
  })

  describe('promoter 用户', () => {
    beforeEach(() => {
      // Given: promoter 用户已登录，仅有 dashboard read 权限，无 ecommerce 插件
      mockUseAuth.mockReturnValue({
        user: { username: 'promoter', email: 'promoter@test.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        grants: [{ action: 'read', scope: 'dashboard' }],
        roles: [],
        login: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        refetch: vi.fn(),
        hasRole: vi.fn(),
        sessions: [],
        sessionsLoading: false,
        sessionsError: null,
        revokeSession: vi.fn(),
        revokeOtherSessions: vi.fn(),
        refreshSessions: vi.fn(),
      } as ReturnType<typeof mockUseAuth>)

      mockUseAccess.mockReturnValue({
        grants: [{ action: 'read', scope: 'dashboard' }],
        has: vi.fn((req: { action: string; scope: string }) => req.action === 'read' && req.scope === 'dashboard'),
        assert: vi.fn(),
        canRead: vi.fn((scope: string) => scope === 'dashboard'),
        canWrite: vi.fn(() => false),
        canExecute: vi.fn(() => false),
        scopesFor: vi.fn(() => []),
        hasAny: vi.fn(() => false),
        hasAll: vi.fn(() => false),
      })
    })

    it('应该显示 Welcome 区域', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument()
      expect(screen.getByText(/欢迎回来，promoter/)).toBeInTheDocument()
    })

    it('应该显示 SystemMonitorSection [有 dashboard read]', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.getByTestId('system-monitor')).toBeInTheDocument()
    })

    it('不应该显示电商数据', () => {
      // When: 未启用 ecommerce 插件
      render(<AdminDashboardShell enabledPlugins={[]} />)

      // Then
      expect(screen.queryByTestId('ecommerce-section')).not.toBeInTheDocument()
    })
  })

  describe('普通用户 (无 dashboard read)', () => {
    beforeEach(() => {
      // Given: 普通用户已登录，无任何权限
      mockUseAuth.mockReturnValue({
        user: { username: 'user', email: 'user@test.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        grants: [],
        roles: [],
        login: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        refetch: vi.fn(),
        hasRole: vi.fn(),
        sessions: [],
        sessionsLoading: false,
        sessionsError: null,
        revokeSession: vi.fn(),
        revokeOtherSessions: vi.fn(),
        refreshSessions: vi.fn(),
      } as ReturnType<typeof mockUseAuth>)

      mockUseAccess.mockReturnValue({
        grants: [],
        has: vi.fn(() => false),
        assert: vi.fn(),
        canRead: vi.fn(() => false),
        canWrite: vi.fn(() => false),
        canExecute: vi.fn(() => false),
        scopesFor: vi.fn(() => []),
        hasAny: vi.fn(() => false),
        hasAll: vi.fn(() => false),
      })
    })

    it('应该显示 Welcome 区域', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.getByTestId('welcome-section')).toBeInTheDocument()
      expect(screen.getByText(/欢迎回来，user/)).toBeInTheDocument()
    })

    it('不应该显示 SystemMonitorSection', () => {
      // When
      render(<AdminDashboardShell />)

      // Then
      expect(screen.queryByTestId('system-monitor')).not.toBeInTheDocument()
    })

    it('不应该显示电商数据', () => {
      // When
      render(<AdminDashboardShell enabledPlugins={[]} />)

      // Then
      expect(screen.queryByTestId('ecommerce-section')).not.toBeInTheDocument()
    })
  })
})
