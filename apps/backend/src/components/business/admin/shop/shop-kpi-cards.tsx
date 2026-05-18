'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Function: ShopKPICards
 *
 * Description: 商城管理 KPI 统计卡片组组件
 *
 * 设计规范:
 *   - 布局: 4 列等宽 grid, gap 16px
 *   - 每个卡片: 白色背景, 1px border #26251E14, border-radius 12px
 *   - 卡片尺寸: 高度约 92px
 *   - 内容: 图标色块(28px) + 标题(弱化) + 数值(突出)
 *   - 可选趋势指示: 上升/下降/持平
 *
 * Parameters:
 *   cards(KPICard[]): KPI 卡片数据数组
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): KPI 统计卡片组
 */
export interface KPICard {
  /** 指标标签 */
  label: string
  /** 指标值 */
  value: string | number
  /** 图标元素 */
  icon: React.ReactNode
  /** 图标背景色类名，如 'bg-primary/10' */
  iconBg?: string
  /** 图标颜色类名，如 'text-primary' */
  iconColor?: string
  /** 趋势信息 */
  trend?: {
    /** 趋势值文本，如 '+12%' */
    value: string
    /** 趋势方向 */
    direction: 'up' | 'down' | 'neutral'
  }
}

interface ShopKPICardsProps {
  /** KPI 卡片数据数组（通常 4 个） */
  cards: KPICard[]
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopKPICards({ cards, className }: ShopKPICardsProps) {
  return (
    <div
      className={cn(
        // 4 列等宽 grid
        'grid grid-cols-2 md:grid-cols-4',
        // 间距
        'gap-4',
        className
      )}
    >
      {cards.map((card, index) => (
        <KPICardItem key={index} card={card} />
      ))}
    </div>
  )
}

/**
 * 单个 KPI 卡片
 */
function KPICardItem({ card }: { card: KPICard }) {
  return (
    <div
      className={cn(
        // 背景、边框、圆角
        'bg-surface border border-border-default rounded-xl',
        // 内边距
        'p-4',
        // flex 布局
        'flex items-center gap-3',
        // 悬停效果
        'hover:shadow-sm motion-safe:transition-shadow motion-safe:duration-200'
      )}
    >
      {/* 图标色块 */}
      <div
        className={cn(
          // 尺寸: 28px (--kpi-icon-size)
          'w-7 h-7',
          // 圆角
          'rounded-lg',
          // 居中
          'flex items-center justify-center',
          'flex-shrink-0',
          // 颜色
          card.iconBg || 'bg-surface-alt'
        )}
      >
        <span className={card.iconColor || 'text-fg-muted'}>
          {card.icon}
        </span>
      </div>

      {/* 文字信息 */}
      <div className="flex-1 min-w-0">
        {/* 标签 */}
        <p className="text-caption text-fg-muted mb-0.5">{card.label}</p>

        {/* 数值 + 趋势 */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-display text-fg">{card.value}</span>

          {/* 趋势指示 */}
          {card.trend && (
            <span
              className={cn(
                'text-trend',
                card.trend.direction === 'up' && 'text-success',
                card.trend.direction === 'down' && 'text-destructive',
                card.trend.direction === 'neutral' && 'text-fg-muted'
              )}
            >
              {card.trend.direction === 'up' && '↑'}
              {card.trend.direction === 'down' && '↓'}
              {card.trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
