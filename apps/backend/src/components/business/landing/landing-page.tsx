'use client'

import { usePublicSiteConfig } from '@/hooks/use-public-site-config'
import { LandingNavbar } from './landing-navbar'
import { LandingHero } from './landing-hero'
import { LandingStats } from './landing-stats'
import { LandingFeatures } from './landing-features'
import { LandingCourses } from './landing-courses'
import { LandingProcess } from './landing-process'
import { LandingTestimonials } from './landing-testimonials'
import { LandingCTA } from './landing-cta'
import { LandingFooter } from './landing-footer'

/**
 * Landing Page 主组件
 *
 * 教育培训平台官网首页，bookish（书卷气）设计风格。
 * 使用暖灰色调 + 品牌橙强调色，Outfit/DM Sans 字体组合。
 *
 * 区块结构（自上而下）：
 * 1. 导航栏 — 品牌名 + Logo（来自 API）+ 导航链接 + 登录/咨询
 * 2. Hero — 品牌主标语 + 副文案 + CTA 按钮
 * 3. 数据亮点 — 4 列统计条（来自 API aboutStats）
 * 4. 核心优势 — 4 卡片网格
 * 5. 热门课程 — 深色区块 + 3×2 课程卡片
 * 6. 学习流程 — 三步走
 * 7. 学员评价 — 3 张 testimonial 卡片
 * 8. CTA — 手机号输入 + 咨询按钮
 * 9. 页脚 — 联系方式 + 备案号 + 版权（来自 API）
 */
export function LandingPage() {
  const { siteConfig, isLoading } = usePublicSiteConfig()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bl-bg)]">
      {/* 加载状态 — 简单的顶部进度条 */}
      {isLoading && (
        <div className="fixed left-0 right-0 top-0 z-50 h-[2px] bg-[var(--bl-accent)]" />
      )}

      {/* 导航栏 */}
      <LandingNavbar siteConfig={siteConfig} />

      {/* 主要内容 */}
      <main className="flex-1">
        {/* Hero 品牌主视觉 */}
        <LandingHero siteConfig={siteConfig} />

        {/* 数据亮点 */}
        <LandingStats siteConfig={siteConfig} />

        {/* 核心优势 */}
        <LandingFeatures />

        {/* 热门课程（深色区块） */}
        <LandingCourses />

        {/* 学习流程 */}
        <LandingProcess />

        {/* 学员评价 */}
        <LandingTestimonials />

        {/* CTA 号召行动 */}
        <LandingCTA />
      </main>

      {/* 页脚 */}
      <LandingFooter siteConfig={siteConfig} />
    </div>
  )
}
