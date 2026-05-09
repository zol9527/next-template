import * as React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLoginForm } from '@/components/business/admin/admin-login-form'

const mockReplace = vi.fn()
const mockToast = vi.fn()
const mockRefetch = vi.fn().mockResolvedValue(undefined)

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    refetch: mockRefetch,
  }),
}))

describe('AdminLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('应该在登录限流时显示明确的重试提示', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: '请求过多，请稍后再试',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        },
      ),
    )

    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong-password' } })
    fireEvent.submit(screen.getByRole('button', { name: '登录' }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByTestId('login-error').textContent).toContain('尝试次数过多，请在 1 分钟后重试')
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '操作过于频繁',
        description: '尝试次数过多，请在 1 分钟后重试',
        variant: 'destructive',
      }),
    )
  })

  it('应该继续对普通登录失败保持泛化提示', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong-password' } })
    fireEvent.submit(screen.getByRole('button', { name: '登录' }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByTestId('login-error').textContent).toContain('登录失败')
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '登录失败',
        description: '登录失败',
        variant: 'destructive',
      }),
    )
  })
})
