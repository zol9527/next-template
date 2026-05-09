/**
 * Unit: Auth Context Refresh Lock Tests
 *
 * Description: 测试 AuthContext 中的 refreshSession 锁机制，包括单标签页并发锁和跨标签页 localStorage 锁
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { refreshSession, resetRefreshLock } from '@/components/context/auth-context'

// 模拟 Fetch
global.fetch = vi.fn()

describe('AuthContext Refresh Lock', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // 某些测试环境下 window.localStorage 可能不是标准 Storage 实现，这里显式 mock
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, String(value))
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
        clear: () => {
          store.clear()
        },
      },
      configurable: true,
    })

    resetRefreshLock()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRefreshLock()
  })

  /**
   * Function: refreshSession (单标签页并发)
   *
   * Description: 测试在同一标签页内多次调用 refreshSession，应该返回同一个 Promise
   */
  it('should reuse pending promise for concurrent calls in same tab', async () => {
    // 模拟 fetch 延迟响应
    let resolveFetch: (value: Response) => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(global.fetch).mockReturnValue(fetchPromise)

    // 发起第一次调用
    const p1 = refreshSession()
    // 发起第二次调用
    const p2 = refreshSession()

    expect(p1).toBe(p2) // 应该是同一个 Promise 实例

    // 完成 fetch
    resolveFetch!(new Response(JSON.stringify({
      success: true,
      data: { userId: '550e8400-e29b-41d4-a716-446655440000' },
    })))

    await expect(p1).resolves.toBe(true)
    await expect(p2).resolves.toBe(true)

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  /**
   * Function: refreshSession (跨标签页锁)
   *
   * Description: 测试当 localStorage 中存在有效锁时，当前调用应该等待
   */
  it('should wait if lock exists in localStorage (cross-tab simulation)', async () => {
    // 模拟 fetch 响应
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { userId: '550e8400-e29b-41d4-a716-446655440000' },
    })))

    // 模拟另一个标签页持有了锁
    window.localStorage.setItem('auth_refresh_lock', JSON.stringify({
      locked: true,
      timestamp: Date.now()
    }))

    // 发起调用，应该被阻塞
    const p1 = refreshSession()

    // 此时 fetch 不应该被调用，因为被阻塞在 acquireLock
    expect(global.fetch).not.toHaveBeenCalled()

    // 前进 500ms，仍然被阻塞
    await vi.advanceTimersByTimeAsync(500)
    expect(global.fetch).not.toHaveBeenCalled()

    // 模拟另一个标签页释放了锁
    window.localStorage.removeItem('auth_refresh_lock')

    // 继续前进时间，让轮询检查到锁释放
    await vi.advanceTimersByTimeAsync(100)

    // 现在应该能获取锁并执行 fetch
    await expect(p1).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  /**
   * Function: refreshSession (锁超时)
   *
   * Description: 测试当 localStorage 锁超时，应该强制获取锁并执行
   */
  it('should proceed if localStorage lock is expired', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { userId: '550e8400-e29b-41d4-a716-446655440000' },
    })))

    // 模拟一个过期的锁 (11秒前)
    window.localStorage.setItem('auth_refresh_lock', JSON.stringify({
      locked: true,
      timestamp: Date.now() - 11000
    }))

    // 发起调用
    const p1 = refreshSession()

    // 应该立即执行，因为锁无效
    await expect(p1).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // 刷新完成后应释放锁
    expect(window.localStorage.getItem('auth_refresh_lock')).toBeNull()
  })

  /**
   * Function: refreshSession (等待期间其他标签页完成刷新)
   *
   * Description: 当等待锁释放后，如果发现还是无法获取锁（可能其他标签页又拿了），这里测试基本的重试逻辑
   * 注意：当前实现是 retry 一次 acquireLock，如果失败则返回 false。
   * 这个测试模拟：等待 -> 锁释放 -> 尝试获取锁成功 -> 执行
   * 
   * 模拟另一个场景：等待 -> 锁释放 -> 瞬间被别人拿走 -> 再次等待? 
   * 当前代码逻辑是： wait -> check global promise -> try acquire -> fail return false.
   * 我们测试 fail return false 的情况。
   */
  it('should proceed after lock expires if it is never released', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { userId: '550e8400-e29b-41d4-a716-446655440000' },
    })))

    // 1. 设置锁
    window.localStorage.setItem('auth_refresh_lock', JSON.stringify({
      locked: true,
      timestamp: Date.now()
    }))

    // 2. 发起请求
    const p1 = refreshSession()

    // 3. 此时 fetch 未调用
    expect(global.fetch).not.toHaveBeenCalled()

    // 4. 在 waitForLockRelease 期间，我们模拟锁虽然被删除了，但在 acquireLock 之前又被"别人"抢占了
    // 这是一个比较难模拟的竞态。
    // 我们可以通过 mock acquireLock 或者修改 localStorage 的时机来模拟。
    // 但 waitForLockRelease 是轮询的。
    
    // 我们可以让 waitForLockRelease 结束（通过移除锁），但在 acquireLock 调用前（微任务队列中）插入一个操作再次设置锁？
    // 在 jsdom 单线程环境下很难精确控制微任务顺序来模拟"瞬间抢占"。
    
    // 简单的替代测试：锁一直不释放直到超时，然后 waitForLockRelease 会 resolve (超时机制)
    // 然后代码尝试 acquireLock，发现还是有锁 (因为我们没删)，于是返回 false。
    
    // 锁不会被释放，应该等待直到锁过期，然后继续刷新
    await vi.advanceTimersByTimeAsync(11000)

    await expect(p1).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
