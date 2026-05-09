'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PasswordLoginRequestSchema } from '@/contracts/dtos/auth/password-login.dto'
import { MfaVerifyRequestSchema } from '@/contracts/dtos/mfa/mfa-verify.dto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth'
import type { ApiResponse } from '@/contracts/api-response.schema'

type AuthFailureFeedback = {
  title: string
  description: string
}

type BlockingState =
  | {
      kind: 'rate-limit'
      secondsLeft: number
    }
  | {
      kind: 'locked'
      secondsLeft: number
      lockedUntilIso: string | null
    }

const RATE_LIMIT_FALLBACK_MESSAGE = '尝试次数过多，请稍后再试'
const LOCKED_FALLBACK_MESSAGE = '账号已锁定，请稍后再试'

function isValidRetryAfterSeconds(value: number | null): value is number {
  return value !== null && !Number.isNaN(value) && value > 0
}

function formatDurationLabel(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} 秒`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours} 小时`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} 分钟`)
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} 秒`)
  }

  return parts.join(' ')
}

function formatLockedUntilLabel(lockedUntilIso: string | null): string | null {
  if (!lockedUntilIso) {
    return null
  }

  const lockExpiry = new Date(lockedUntilIso)
  if (Number.isNaN(lockExpiry.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(lockExpiry)
}

function resolveRetryAfterMessage(retryAfterSeconds: number | null, fallback: string): string {
  if (!isValidRetryAfterSeconds(retryAfterSeconds)) {
    return fallback
  }

  return `尝试次数过多，请在 ${formatDurationLabel(retryAfterSeconds)}后重试`
}

function resolveLockedMessage(lockSecondsLeft: number | null, lockedUntilIso: string | null, fallback: string): string {
  if (!isValidRetryAfterSeconds(lockSecondsLeft)) {
    return fallback
  }

  const lockedUntilLabel = formatLockedUntilLabel(lockedUntilIso)
  if (lockedUntilLabel) {
    return `账号已锁定，请在 ${formatDurationLabel(lockSecondsLeft)}后重试，预计 ${lockedUntilLabel} 解锁`
  }

  return `账号已锁定，请在 ${formatDurationLabel(lockSecondsLeft)}后重试`
}

function resolveAuthFailureFeedback(
  response: ApiResponse<unknown>,
  fallbackTitle: string,
  fallbackDescription: string,
  retryAfterSeconds: number | null = null,
  lockSecondsLeft: number | null = null,
  lockedUntilIso: string | null = null,
): AuthFailureFeedback {
  if (response.success) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    }
  }

  if (response.error.code === 'TOO_MANY_REQUESTS') {
    return {
      title: '操作过于频繁',
      description: resolveRetryAfterMessage(retryAfterSeconds, RATE_LIMIT_FALLBACK_MESSAGE),
    }
  }

  if (response.error.code === 'LOCKED') {
    return {
      title: '账号已锁定',
      description: resolveLockedMessage(lockSecondsLeft, lockedUntilIso, LOCKED_FALLBACK_MESSAGE),
    }
  }

  if (response.error.code === 'INVALID_MFA_TOKEN') {
    return {
      title: fallbackTitle,
      description: '验证码错误或已过期，请重新输入',
    }
  }

  return {
    title: fallbackTitle,
    description: fallbackDescription,
  }
}

/**
Function: AdminLoginForm

Description: 后台登录表单 - SaaS 极简主义设计，简洁优雅的交互体验
支持密码登录和 MFA 双因素认证两步验证流程

Parameters:

Returns:
	element(React.ReactElement): 登录表单组件
*/
export function AdminLoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const loginFailedMessage = '登录失败'
  const mfaFailedMessage = '验证失败'

  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [step, setStep] = React.useState<'password' | 'mfa'>('password')
  const [mfaUserId, setMfaUserId] = React.useState<string | null>(null)
  const [mfaToken, setMfaToken] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [blockingState, setBlockingState] = React.useState<BlockingState | null>(null)
  const submitLockRef = React.useRef(false)

  React.useEffect(() => {
    if (!blockingState || !isValidRetryAfterSeconds(blockingState.secondsLeft)) {
      return
    }

    const timer = window.setInterval(() => {
      setBlockingState((current) => {
        if (!current || !isValidRetryAfterSeconds(current.secondsLeft)) {
          return null
        }

        if (current.secondsLeft <= 1) {
          return null
        }

        return {
          ...current,
          secondsLeft: current.secondsLeft - 1,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [blockingState])

  const isTemporarilyBlocked = blockingState !== null && isValidRetryAfterSeconds(blockingState.secondsLeft)

  const displayedFormError = React.useMemo(() => {
    if (blockingState?.kind === 'rate-limit') {
      return resolveRetryAfterMessage(blockingState.secondsLeft, RATE_LIMIT_FALLBACK_MESSAGE)
    }

    if (blockingState?.kind === 'locked') {
      return resolveLockedMessage(blockingState.secondsLeft, blockingState.lockedUntilIso, LOCKED_FALLBACK_MESSAGE)
    }

    return formError
  }, [blockingState, formError])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (submitLockRef.current || isTemporarilyBlocked) {
      return
    }

    setFormError(null)
    setBlockingState(null)

    submitLockRef.current = true
    setSubmitting(true)
    try {
      if (step === 'password') {
        const parsed = PasswordLoginRequestSchema.safeParse({ identifier, password })
        if (!parsed.success) {
          setFormError(loginFailedMessage)
          toast({
            title: loginFailedMessage,
            description: loginFailedMessage,
            variant: 'destructive',
          })
          return
        }

        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(parsed.data),
        })

        const json = (await res.json()) as ApiResponse<
          { userId: string; accessToken?: string; refreshToken?: string } | { requiresMfa: true; userId: string }
        >
        if (!json.success) {
          const retryAfterSeconds = Number(res.headers.get('Retry-After'))
          const lockSecondsLeft = Number(res.headers.get('X-Lock-Remaining-Seconds'))
          const lockedUntilIso = res.headers.get('X-Locked-Until')
          const feedback = resolveAuthFailureFeedback(
            json,
            loginFailedMessage,
            loginFailedMessage,
            Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
            Number.isNaN(lockSecondsLeft) ? null : lockSecondsLeft,
            lockedUntilIso,
          )

          if (json.error.code === 'TOO_MANY_REQUESTS' && isValidRetryAfterSeconds(Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds)) {
            setFormError(null)
            setBlockingState({ kind: 'rate-limit', secondsLeft: retryAfterSeconds })
          } else if (json.error.code === 'LOCKED' && isValidRetryAfterSeconds(Number.isNaN(lockSecondsLeft) ? null : lockSecondsLeft)) {
            setFormError(null)
            setBlockingState({
              kind: 'locked',
              secondsLeft: lockSecondsLeft,
              lockedUntilIso,
            })
          } else {
            setFormError(feedback.description)
          }

          toast({ title: feedback.title, description: feedback.description, variant: 'destructive' })
          return
        }

        if ('requiresMfa' in json.data && json.data.requiresMfa) {
          setStep('mfa')
          setMfaUserId(json.data.userId)
          setMfaToken('')
          return
        }

        // 登录成功后立刻刷新 /me，确保菜单权限（Lock）即时更新
        await auth.refetch().catch(() => {})
        router.replace('/admin')
        return
      }

      const parsed = MfaVerifyRequestSchema.safeParse({ userId: mfaUserId, token: mfaToken })
      if (!parsed.success) {
        setFormError(mfaFailedMessage)
        toast({ title: mfaFailedMessage, description: mfaFailedMessage, variant: 'destructive' })
        return
      }

      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      const json = (await res.json()) as ApiResponse<{ userId: string }>
      if (!json.success) {
        const retryAfterSeconds = Number(res.headers.get('Retry-After'))
        const feedback = resolveAuthFailureFeedback(
          json,
          mfaFailedMessage,
          mfaFailedMessage,
          Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
        )

        if (json.error.code === 'TOO_MANY_REQUESTS' && isValidRetryAfterSeconds(Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds)) {
          setFormError(null)
          setBlockingState({ kind: 'rate-limit', secondsLeft: retryAfterSeconds })
        } else {
          setFormError(feedback.description)
        }

        toast({ title: feedback.title, description: feedback.description, variant: 'destructive' })
        return
      }

      await auth.refetch().catch(() => {})
      router.replace('/admin')
    } catch {
      const message = step === 'mfa'
        ? `${mfaFailedMessage}，请稍后再试`
        : `${loginFailedMessage}，请稍后再试`
      setFormError(message)
      toast({ title: step === 'mfa' ? mfaFailedMessage : loginFailedMessage, description: message, variant: 'destructive' })
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} className="grid gap-4">
        {step === 'password' ? (
          <>
            {/* 账号输入框 - 极简设计 */}
            <div className="grid gap-2">
              <Label htmlFor="identifier" className="text-sm font-medium text-foreground">
                账号
              </Label>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="用户名/邮箱/手机号"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={submitting}
                className="h-11 border-input transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 密码输入框 - 极简设计 */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="h-11 border-input transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 登录按钮 - 居中主 CTA */}
            <Button
              type="submit"
              disabled={submitting || isTemporarilyBlocked}
              className="mt-2 h-11 w-full bg-primary text-primary-foreground transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '登录中…' : blockingState?.kind === 'locked' ? '等待解锁…' : blockingState?.kind === 'rate-limit' ? '请稍后重试…' : '登录'}
            </Button>
          </>
        ) : (
          <>
            {/* MFA 验证码输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="mfaToken" className="text-sm font-medium text-foreground">
                验证码
              </Label>
              <Input
                id="mfaToken"
                placeholder="请输入 6 位验证码"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                disabled={submitting}
                className="h-11 border-input text-center text-lg tracking-widest transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* 验证按钮 - 居中主 CTA */}
            <Button
              type="submit"
              disabled={submitting || isTemporarilyBlocked}
              className="mt-2 h-11 w-full bg-primary text-primary-foreground transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '验证中…' : blockingState?.kind === 'rate-limit' ? '请稍后重试…' : '验证并登录'}
            </Button>
          </>
        )}

        {/* 错误提示 - 极简设计 */}
        {displayedFormError ? (
          <div className="flex items-center justify-center rounded-md border border-error/20 bg-error/5 px-4 py-3">
            <p data-testid="login-error" className="text-sm text-error">
              {displayedFormError}
            </p>
          </div>
        ) : null}
      </form>
    </div>
  )
}
