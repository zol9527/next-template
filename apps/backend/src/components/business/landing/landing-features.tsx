'use client'

import { Users, GraduationCap, Monitor, ShieldCheck } from 'lucide-react'

/**
 * 核心优势卡片配置
 *
 * icon: lucide-react 图标组件
 * title: 卡片标题
 * description: 卡片描述
 * colorTheme: 对应 CSS 变量的颜色主题
 */
const FEATURES = [
  {
    icon: Users,
    title: '名师团队',
    description: '行业资深讲师亲自授课，平均教龄 10 年以上，实战经验丰富。',
    bgVar: '--bl-accent-subtle',
    colorVar: '--bl-accent',
  },
  {
    icon: GraduationCap,
    title: '系统课程',
    description: '从基础到冲刺，完整课程体系覆盖考试大纲，不遗漏任何考点。',
    bgVar: '--bl-teal-subtle',
    colorVar: '--bl-teal',
  },
  {
    icon: Monitor,
    title: '在线学习',
    description: 'PC + 手机双端学习，录播+直播结合，随时随地碎片化备考。',
    bgVar: '--bl-gold-subtle',
    colorVar: '--bl-gold',
  },
  {
    icon: ShieldCheck,
    title: '协议保障',
    description: '签约保障通过，未通过可免费重学，让你无后顾之忧地备考。',
    bgVar: '--bl-rose-subtle',
    colorVar: '--bl-rose',
  },
]

/**
 * Landing Page 核心优势区块
 *
 * 4 列网格卡片，展示平台的核心竞争力。
 */
export function LandingFeatures() {
  return (
    <section className="flex flex-col items-center px-[72px] pb-[100px]">
      {/* 区块标题 */}
      <span
        className="mb-[12px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--bl-accent)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        Why EduAdmin
      </span>
      <h2
        className="text-[38px] font-semibold tracking-[-0.025em] text-[var(--bl-fg)]"
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        为什么选择我们
      </h2>
      <p
        className="mt-[14px] max-w-[460px] text-center text-[15px] leading-[1.6] text-[var(--bl-fg-secondary)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        八年深耕职业教育领域，我们比谁都知道如何帮你高效通关。
      </p>

      {/* 卡片网格 */}
      <div className="mt-[48px] grid w-full max-w-[1312px] grid-cols-4 gap-[16px]">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="rounded-[12px] border bg-[var(--bl-surface)] px-[24px] py-[28px]"
              style={{ borderColor: 'var(--bl-border)' }}
            >
              {/* 图标色块 */}
              <div
                className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `var(${feature.bgVar})` }}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  style={{ color: `var(${feature.colorVar})` }}
                  strokeWidth={2}
                />
              </div>

              <h3
                className="mt-[20px] text-[16px] font-semibold text-[var(--bl-fg)]"
                style={{ fontFamily: 'var(--font-outfit)' }}
              >
                {feature.title}
              </h3>
              <p
                className="mt-[10px] text-[13px] leading-[1.55] text-[var(--bl-fg-secondary)]"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
