'use client'

import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import type { PublicSiteConfig } from '@/contracts/dtos/public/site-config.dto'

interface LandingFooterProps {
  siteConfig: PublicSiteConfig | null
}

/**
 * Landing Page 页脚
 *
 * 深色背景页脚，包含品牌信息、导航链接、联系方式和备案信息。
 * 所有数据来自 API siteConfig：
 * - siteName: 品牌名称
 * - logoUrl: 品牌 Logo
 * - contactPhone / contactEmail: 客服联系方式
 * - icpFiling: ICP 备案号
 * - copyright: 版权信息
 */
export function LandingFooter({ siteConfig }: LandingFooterProps) {
  const brandName = siteConfig?.siteName ?? 'EduAdmin'
  const copyright = siteConfig?.copyright ?? `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`
  const icpFiling = siteConfig?.icpFiling

  return (
    <footer className="flex flex-col bg-[var(--bl-dark)] px-[72px] py-[48px]">
      {/* 上半部分：品牌 + 链接 */}
      <div
        className="flex justify-between border-b border-white/6 pb-[40px]"
      >
        {/* 品牌信息 */}
        <div className="max-w-[260px]">
          <div className="mb-[16px] flex items-center gap-[10px]">
            {siteConfig?.logoUrl ? (
              <Image src={siteConfig.logoUrl} alt={brandName} width={30} height={30} className="h-[30px] w-[30px] rounded-md object-cover" />
            ) : (
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-[var(--bl-accent)]">
                <BookOpen className="h-[16px] w-[16px] text-white" strokeWidth={2.5} />
              </div>
            )}
            <span
              className="text-[15px] font-semibold tracking-[-0.02em] text-white"
              style={{ fontFamily: 'var(--font-outfit)' }}
            >
              {brandName}
            </span>
          </div>
          <p className="text-[12.5px] leading-[1.6] text-white/35" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            专注成人职业教育与职业资格认证培训，让每位学员都能高效拿到理想的证书。
          </p>
        </div>

        {/* 链接区域 */}
        <div className="flex gap-[64px]">
          {/* 课程 */}
          <div>
            <div
              className="mb-[16px] text-[11px] font-semibold uppercase tracking-[0.06em] text-white/50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              课程
            </div>
            <div className="flex flex-col gap-[10px]">
              {['建造师', '消防工程师', '健康管理师', '教师资格证'].map((item) => (
                <span key={item} className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 关于 */}
          <div>
            <div
              className="mb-[16px] text-[11px] font-semibold uppercase tracking-[0.06em] text-white/50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              关于
            </div>
            <div className="flex flex-col gap-[10px]">
              {['关于我们', '师资团队', '学员故事', '联系我们'].map((item) => (
                <span key={item} className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 联系方式（来自 API） */}
          <div>
            <div
              className="mb-[16px] text-[11px] font-semibold uppercase tracking-[0.06em] text-white/50"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              联系方式
            </div>
            <div className="flex flex-col gap-[10px]">
              {siteConfig?.contactPhone && (
                <span className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {siteConfig.contactPhone}
                </span>
              )}
              {siteConfig?.contactEmail && (
                <span className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {siteConfig.contactEmail}
                </span>
              )}
              {siteConfig?.contactWechat && (
                <span className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  微信: {siteConfig.contactWechat}
                </span>
              )}
              {!siteConfig?.contactPhone && !siteConfig?.contactEmail && !siteConfig?.contactWechat && (
                <span className="text-[12.5px] text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  暂无联系方式
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 下半部分：版权 + 备案 */}
      <div className="flex items-center justify-between pt-[24px]">
        <span className="text-[11.5px] text-white/25" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          {copyright}
        </span>
        <div className="flex gap-[20px]">
          <a href="#" className="text-[11.5px] text-white/25 hover:text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            隐私政策
          </a>
          <a href="#" className="text-[11.5px] text-white/25 hover:text-white/40" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            用户协议
          </a>
          {icpFiling && (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="text-[11.5px] text-white/25 hover:text-white/40"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              {icpFiling}
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
