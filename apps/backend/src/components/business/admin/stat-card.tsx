'use client'

import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

interface StatCardProps {
  title: string
  value: string
  progress?: number
  color: string
  icon: React.ReactNode
}

/**
 * Function: StatCard
 *
 * Description: 管理后台统计卡片组件，显示标题、数值、进度条和图标。
 *
 * Parameters:
 * 	title(string): 卡片标题
 * 	value(string): 显示的数值或描述文字
 * 	progress(number): 进度百分比 (0-100)，可选
 * 	color(string): 进度条颜色的 Tailwind CSS 类名
 * 	icon(React.ReactNode): 卡片左上角显示的图标
 *
 * Returns:
 * 	JSX.Element: 渲染后的统计卡片组件
 */
export function StatCard({ title, value, progress, color, icon }: StatCardProps) {
  return (
    <article className="bg-card p-4 sm:p-6 relative overflow-hidden group rounded-xl border border-border/40 shadow-sm hover:shadow-md hover:border-border transition-shadow motion-safe:duration-300">
      <header className="flex justify-between items-start mb-4 sm:mb-6">
        <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center text-foreground motion-safe:group-hover:scale-110 transition-transform motion-safe:duration-300" aria-hidden="true">
          {icon}
        </div>
        <button
          type="button"
          className="p-1 rounded-sm hover:bg-muted/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
          aria-label={`${title} 更多选项`}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-1">
        <h3 className="text-sm sm:text-base text-foreground font-semibold">{title}</h3>
        <p className="text-muted-foreground/50 text-xs sm:text-sm">{value}</p>
      </div>

      {progress !== undefined && (
        <div className="mt-3 sm:mt-4 space-y-2">
          <dl className="flex justify-between text-[10px]">
            <dt className="text-muted-foreground/50">进度</dt>
            <dd className="text-foreground font-medium">{progress}%</dd>
          </dl>
          <div
            className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} 进度`}
          >
            <div
              className={cn("h-full motion-safe:transition-all motion-safe:duration-1000", color)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </article>
  )
}
