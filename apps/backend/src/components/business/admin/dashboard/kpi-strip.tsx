'use client'

import type { KpiItem } from './types'
import { KpiCell } from './kpi-cell'

interface KpiStripProps {
  items: KpiItem[]
}

/**
 * Component: KpiStrip
 *
 * Description: KPI 指标条容器（Paper Design KpiStrip 242-0）
 *   - 6 列等宽网格
 *   - 容器: rounded-md + border + bg-surface + py-4 px-5
 */
export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div className="rounded-md bg-surface border border-border-default py-4 px-5">
      <div className="grid grid-cols-6">
        {items.map((item, i) => (
          <KpiCell key={item.id} item={item} isLast={i === items.length - 1} />
        ))}
      </div>
    </div>
  )
}
