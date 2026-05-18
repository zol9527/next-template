'use client'

import * as LucideIcons from 'lucide-react'
import type { KpiItem } from './types'
import { KPI_COLOR_MAP, TREND_COLOR_MAP } from './types'

interface KpiCellProps {
  item: KpiItem
  isLast: boolean
}

/**
 * Component: KpiCell
 *
 * Description: 单个 KPI 指标单元（Paper Design KPI 列 243-0 ~ 26L-0）
 *   - 图标色块 28×28px
 *   - 数值 Outfit 600 18px tabular-nums
 *   - 标签 11px --fg-muted
 *   - 趋势标签 rounded-full 10px
 *   - 底部分隔线 + 详情区 (2 行 key-value + 3px 进度条)
 *   - 列间 border-r 分割线（最后一列无）
 */
export function KpiCell({ item, isLast }: KpiCellProps) {
  const colors = KPI_COLOR_MAP[item.colorTheme]
  const trendColor = TREND_COLOR_MAP[item.trend.direction]
  // 动态图标解析 — 通过 unknown 中转避免类型不兼容
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[item.icon]

  return (
    <div className={`flex flex-col py-0 px-3.5 ${!isLast ? 'border-r border-border-default' : ''}`}>
      {/* 图标色块 */}
      <div className={`flex items-center justify-center size-7 rounded-sm ${colors.bg}`}>
        {IconComponent && <IconComponent className={`size-3.5 ${colors.text}`} strokeWidth={2} />}
      </div>

      {/* 数值 */}
      <span className="font-display font-semibold text-[18px] leading-[22px] text-fg mt-2 tabular-nums">
        {item.value}
      </span>

      {/* 标签 */}
      <span className="text-caption mt-0.5">{item.label}</span>

      {/* 趋势标签 */}
      <div className={`inline-flex items-center rounded-full py-px px-1.5 mt-1.5 self-start ${trendColor}`}>
        <span className="font-body font-semibold text-[10px] leading-[12px]">
          {item.trend.direction === 'up' ? '↑' : item.trend.direction === 'down' ? '↓' : ''} {item.trend.value}
        </span>
      </div>

      {/* 底部分隔线 */}
      <div className="border-t border-[rgba(38,37,30,0.06)] mt-3 pt-2.5">
        {item.details.map((detail) => (
          <div key={detail.label} className="flex justify-between mb-1 last:mb-0">
            <span className="text-caption">{detail.label}</span>
            <span className="font-mono font-medium text-[11px] text-fg-secondary tabular-nums">{detail.value}</span>
          </div>
        ))}

        {/* 进度条 */}
        {item.progress !== undefined && (
          <div className="w-full h-[3px] rounded-xs bg-bg overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-xs ${colors.bar}`}
              style={{ width: `${Math.round(item.progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
