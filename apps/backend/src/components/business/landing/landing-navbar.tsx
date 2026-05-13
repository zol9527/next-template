'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import type { PublicSiteConfig } from '@/contracts/dtos/public/site-config.dto'

interface LandingNavbarProps {
  siteConfig: PublicSiteConfig | null
}

/**
 * Landing Page 导航栏
 *
 * 显示站点 Logo + 品牌名称（来自 API），包含关于/课程/证书/联系等链接。
 * 透明背景融入页面，底部有微妙分割线。
 */
export function LandingNavbar({ siteConfig }: LandingNavbarProps) {
  const brandName = siteConfig?.siteName ?? 'EduAdmin'

  return (
    <nav
      className="flex items-center justify-between px-[72px] py-[18px]"
      style={{ borderBottom: '1px solid var(--bl-border)' }}
    >
      {/* Logo + 品牌名 */}
      <Link href="/" className="flex items-center gap-[10px]">
        {siteConfig?.logoUrl ? (
          <Image
            src={siteConfig.logoUrl}
            alt={brandName}
            width={34}
            height={34}
            className="h-[34px] w-[34px] rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-[var(--bl-accent)]">
            <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
          </div>
        )}
        <span
          className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--bl-fg)]"
          style={{ fontFamily: 'var(--font-outfit)' }}
        >
          {brandName}
        </span>
      </Link>

      {/* 导航链接 */}
      <div className="flex items-center gap-[40px]">
        {[
          { label: '关于我们', href: '#about' },
          { label: '课程体系', href: '#courses' },
          { label: '证书认证', href: '#certs' },
          { label: '学员故事', href: '#testimonials' },
          { label: '联系我们', href: '#contact' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-[13.5px] font-medium text-[var(--bl-fg-secondary)] transition-colors hover:text-[var(--bl-fg)]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* CTA 按钮 */}
      <div className="flex items-center gap-[16px]">
        <Link
          href="/login"
          className="text-[13px] font-medium text-[var(--bl-fg-secondary)]"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          登录
        </Link>
        <a
          href="#contact"
          className="rounded-lg bg-[var(--bl-fg)] px-[22px] py-[9px] text-[13px] font-medium text-white"
          style={{ fontFamily: 'var(--font-dm-sans)' }}
        >
          免费咨询
        </a>
      </div>
    </nav>
  )
}
