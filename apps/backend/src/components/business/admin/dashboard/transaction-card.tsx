'use client'

import { DollarSign } from 'lucide-react'
import type { TransactionData } from './types'

interface TransactionCardProps {
  data: TransactionData
}

/**
 * Component: TransactionCard
 *
 * Description: 交易数据指标卡片（Paper Design TransactionCard 1S4-0）
 *   - 5 行指标: 今日交易额, 待处理订单, 退款中, 转化率, 客单价
 *   - 语义色: 交易额(teal), 订单(gold), 退款(rose), 其余(fg)
 */
export function TransactionCard({ data }: TransactionCardProps) {
  const metrics = [
    { label: '今日交易额', value: `¥${data.todayAmount.toLocaleString()}`, color: 'text-teal' },
    { label: '待处理订单', value: `${data.pendingOrders} 笔`, color: 'text-gold' },
    { label: '退款中', value: `${data.refunding} 笔`, color: 'text-rose' },
    { label: '今日转化率', value: `${data.conversionRate}%`, color: 'text-fg', progress: data.conversionRate / 10, progressColor: 'bg-teal' },
    { label: '客单价', value: `¥${data.avgOrderValue.toLocaleString()}`, color: 'text-fg' },
  ]

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      {/* 标题行 — 图标 + "交易数据" */}
      <div className="flex items-center gap-1.5 mb-4">
        <DollarSign className="size-4 text-ds-accent" strokeWidth={2} />
        <h2 className="heading-2">交易数据</h2>
      </div>

      {/* 指标行列表 */}
      <div className="flex flex-col">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between py-[11px] ${i < metrics.length - 1 ? 'border-b border-border-default' : ''}`}
          >
            <span className="font-body text-[13px] text-fg-secondary">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-semibold text-[12.5px] tabular-nums ${metric.color}`}>
                {metric.value}
              </span>
              {metric.progress !== undefined && (
                <div className="w-[90px] h-[5px] rounded-[3px] bg-bg overflow-hidden">
                  <div
                    className={`h-full rounded-[3px] ${metric.progressColor}`}
                    style={{ width: `${Math.round(metric.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
