'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 状态筛选药丸组件
 *
 * 显示: 全部(N) | 活跃(N) | 未验证(N) | 禁用(N)
 * 选中项: bg-accent text-white
 * 未选中项: bg-white border text-muted
 */

export interface StatusPill {
  value: string
  label: string
  count: number
  color?: string // 语义色，如 --teal, --rose
}

interface UserStatusPillsProps {
  pills: StatusPill[]
  activeValue: string
  onChange: (value: string) => void
}

export function UserStatusPills({ pills, activeValue, onChange }: UserStatusPillsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pills.map((pill) => {
        const isActive = activeValue === pill.value

        return (
          <button
            key={pill.value}
            onClick={() => onChange(pill.value)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-[9999px] text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-[var(--ds-accent,#F54E00)] text-white shadow-sm'
                : 'bg-white border border-[var(--border)] text-[var(--fg-muted,#6B6960)] hover:border-[var(--ds-accent,#F54E00)]/30'
            )}
          >
            <span>{pill.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                isActive
                  ? 'bg-white/20 text-white'
                  : pill.color
                    ? `bg-[var(${pill.color})]/10 text-[var(${pill.color})]`
                    : 'bg-[var(--fg-faint,#9C9A91)]/10 text-[var(--fg-faint,#9C9A91)]'
              )}
            >
              {pill.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
