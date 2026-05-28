'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { DistributionItem } from './types'

interface CourseDistributionChartProps {
  data: DistributionItem[]
}

/**
 * Component: CourseDistributionChart
 *
 * Description: 课程分类分布环形图（Paper Design DonutChartCard 1WW-0）
 *   - 5 色数据系列: accent, gold, teal, rose, brown
 *   - 中心汇总值: Outfit 600 22px + "总课程" 11px
 *   - 右侧图例: 色块 9×9px + 分类名 + 百分比
 */
export function CourseDistributionChart({ data }: CourseDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-md bg-surface border border-border-default p-5">
      <h2 className="heading-2 mb-4">课程分类分布</h2>

      <div className="flex items-center gap-6">
        {/* 环形图 */}
        <div className="relative w-[150px] h-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* 中心汇总值 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-semibold text-[22px] leading-[28px] text-fg tabular-nums">
              {total}
            </span>
            <span className="text-caption">总课程</span>
          </div>
        </div>

        {/* 图例列表 */}
        <div className="flex flex-col gap-2.5 grow">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <div
                className="w-[9px] h-[9px] rounded-[3px] shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-body text-[13px] text-fg-secondary grow">{item.name}</span>
              <span className="font-mono font-semibold text-[13px] text-fg tabular-nums">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
