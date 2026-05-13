'use client'

import type { PublicSiteConfig } from '@/contracts/dtos/public/site-config.dto'

interface LandingHeroProps {
  siteConfig: PublicSiteConfig | null
}

/**
 * Landing Page Hero 区块
 *
 * 品牌主视觉区域，大标题 + 副文案 + 双 CTA 按钮。
 * 品牌标语来自 API siteSlogan 字段。
 */
export function LandingHero({ siteConfig }: LandingHeroProps) {
  const slogan = siteConfig?.siteSlogan ?? '专注成人职业教育八年'

  return (
    <section className="flex flex-col items-center px-[72px] pb-[80px] pt-[100px] text-center">
      {/* 标签 */}
      <div className="mb-[32px] inline-flex items-center gap-[8px] rounded-full bg-[var(--bl-accent-subtle)] px-[16px] py-[6px]">
        <div className="h-[6px] w-[6px] rounded-full bg-[var(--bl-accent)]" />
        <span
          className="text-[12.5px] font-medium text-[var(--bl-accent)]"
          style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '0.02em' }}
        >
          {slogan}
        </span>
      </div>

      {/* 主标题 */}
      <h1
        className="max-w-[820px] text-[62px] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--bl-fg)]"
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        让每一位学员
        <br />
        拿到理想的证书
      </h1>

      {/* 副文案 */}
      <p
        className="mt-[28px] max-w-[500px] text-[17px] leading-[1.65] text-[var(--bl-fg-secondary)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        我们提供专业的职业资格培训与考证辅导，涵盖建造师、消防工程师、健康管理师等热门方向，助你高效通关。
      </p>

      {/* CTA 按钮组 */}
      <div className="mt-[44px] flex items-center gap-[14px]">
        <a
          href="#courses"
          className="rounded-[10px] bg-[var(--bl-accent)] px-[32px] py-[13px] text-[14.5px] font-semibold text-white shadow-[0_4px_16px_rgba(245,78,0,0.2)]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          浏览课程
        </a>
        <a
          href="#about"
          className="rounded-[10px] border border-[var(--bl-border-medium)] px-[32px] py-[13px] text-[14.5px] font-medium text-[var(--bl-fg)]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          了解详情 →
        </a>
      </div>
    </section>
  )
}
