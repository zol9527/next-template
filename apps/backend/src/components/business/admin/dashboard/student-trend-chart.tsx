'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TrendDataPoint } from './types'

interface StudentTrendChartProps {
  data: TrendDataPoint[]
}

/**
 * Component: StudentTrendChart
 *
 * Description: 学员增长趋势折线图（Paper Design LineChartCard 1V4-0）
 *   - Tab 切换: 周/月/年
 *   - 渐变填充: accent 12% 透明度 → 透明
 *   - 折线: accent 色, strokeWidth 2.5
 *   - 数据点: 白色填充 + accent 边框
 *   - 网格线: border 颜色
 */
export function StudentTrendChart({ data }: StudentTrendChartProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const tabs = [
    { key: 'week' as const, label: '周' },
    { key: 'month' as const, label: '月' },
    { key: 'year' as const, label: '年' },
  ]

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      {/* 标题行 + Tab 切换 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-2">学员增长趋势</h2>
        <div className="flex gap-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`rounded-full py-1 px-[11px] text-[13px] leading-[16px] font-body font-medium border transition-colors ${
                period === tab.key
                  ? 'bg-ds-accent border-ds-accent text-white'
                  : 'bg-surface border-border-default text-fg-secondary hover:bg-surface-alt'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--ds-accent)"
              strokeWidth={2.5}
              fill="url(#trendGradient)"
              dot={{ fill: 'white', stroke: 'var(--ds-accent)', strokeWidth: 2, r: 4 }}
              activeDot={{ fill: 'var(--ds-accent)', stroke: 'white', strokeWidth: 2, r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
