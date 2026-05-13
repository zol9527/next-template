'use client'

import type { PublicSiteConfig } from '@/contracts/dtos/public/site-config.dto'

interface LandingStatsProps {
  siteConfig: PublicSiteConfig | null
}

/** 默认统计数据（API 未配置时的 fallback） */
const DEFAULT_STATS = [
  { value: '50,000+', label: '累计培训学员' },
  { value: '92%', label: '考试通过率' },
  { value: '200+', label: '认证课程' },
  { value: '8年', label: '行业深耕' },
]

/**
 * Landing Page 数据亮点条
 *
 * 4 列统计数据卡片，展示平台实力。
 * 数据来自 API 的 aboutStats 字段，未配置时使用默认值。
 */
export function LandingStats({ siteConfig }: LandingStatsProps) {
  const stats = siteConfig?.aboutStats?.length ? siteConfig.aboutStats : DEFAULT_STATS

  return (
    <section className="flex justify-center px-[72px] pb-[80px]">
      <div
        className="flex w-full max-w-[900px] overflow-hidden rounded-[14px] border bg-[var(--bl-surface)] shadow-[0_1px_3px_rgba(38,37,30,0.04),0_8px_24px_rgba(38,37,30,0.06)]"
        style={{ borderColor: 'var(--bl-border)' }}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-1 flex-col items-center py-[32px]">
            <div className="flex items-baseline gap-[2px]">
              <span
                className="text-[36px] font-semibold tracking-[-0.03em] text-[var(--bl-fg)]"
                style={{ fontFamily: 'var(--font-outfit)', fontVariantNumeric: 'tabular-nums' }}
              >
                {stat.value.replace(/[^0-9.%+年万]/g, '')}
              </span>
              {stat.value.match(/[^0-9]+$/)?.[0] && (
                <span
                  className="text-[20px] text-[var(--bl-fg-secondary)]"
                  style={{ fontFamily: 'var(--font-outfit)' }}
                >
                  {stat.value.match(/[^0-9]+$/)?.[0]}
                </span>
              )}
            </div>
            <span
              className="mt-[6px] text-[13px] text-[var(--bl-fg-muted)]"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
