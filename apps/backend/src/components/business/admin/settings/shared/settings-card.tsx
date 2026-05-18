'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Component: SettingsCard
 *
 * Description: 通用设置卡片组件
 * 结构: 圆角白色卡片 → 图标+标题头(带底部分隔线) → 内容区
 *
 * 用于各 Tab 面板中的分组卡片展示
 */
interface SettingsCardProps {
  /** 卡片图标，通常为 Lucide 图标组件 */
  icon: React.ReactNode
  /** 图标背景色（Tailwind 色值），如 '#F54E00' */
  iconColor?: string
  /** 卡片标题 */
  title: string
  /** 卡片描述（可选） */
  description?: string
  /** 卡片内容 */
  children: React.ReactNode
  /** 额外的 className */
  className?: string
  /** 延迟动画时间（秒） */
  delay?: number
}

export function SettingsCard({
  icon,
  iconColor,
  title,
  description,
  children,
  className,
  delay = 0,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--surface)] rounded-[var(--radius-md)] border border-[var(--border)]/10',
        'shadow-[var(--shadow-card)] overflow-hidden',
        'animate-in fade-in slide-in-from-bottom-4 duration-400',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 卡片头部: 图标 + 标题 + 描述 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]/10 bg-[var(--surface-alt)]/40">
        <div
          className="flex items-center justify-center size-9 rounded-[var(--radius-sm)]"
          style={iconColor ? { backgroundColor: `${iconColor}15`, color: iconColor } : undefined}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--fg)]">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* 卡片内容区 */}
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  )
}
