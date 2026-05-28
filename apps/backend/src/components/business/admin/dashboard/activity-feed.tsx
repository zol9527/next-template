'use client'

import type { ActivityItem } from './types'
import { ACTIVITY_COLOR_MAP } from './types'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

/**
 * Component: ActivityFeed
 *
 * Description: 最近动态时间线（Paper Design ActivityFeed 274-0）
 *   - 标题: "最近动态" Outfit 600 15px
 *   - 每条: 色点 7×7px + 内容 13px + 时间戳 11.5px
 *   - 条目间距 py-3, 底部 border 分割
 */
export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-md bg-surface border border-border-default p-5">
      <h2 className="heading-2 mb-3">最近动态</h2>

      <div className="flex flex-col">
        {activities.map((activity, i) => {
          const dotColor = ACTIVITY_COLOR_MAP[activity.type]
          return (
            <div
              key={activity.id}
              className={`flex items-start py-3 gap-2.5 ${i < activities.length - 1 ? 'border-b border-border-default' : ''}`}
            >
              {/* 色点 */}
              <div className={`w-[7px] h-[7px] mt-1.5 shrink-0 rounded-full ${dotColor}`} />

              {/* 内容 */}
              <span className="font-body text-[13px] leading-[16px] text-fg grow">
                {activity.content}
              </span>

              {/* 时间戳 */}
              <span className="font-body text-[11.5px] leading-[14px] text-fg-muted shrink-0">
                {activity.time}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
