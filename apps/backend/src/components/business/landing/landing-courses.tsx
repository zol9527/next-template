'use client'

import { Building2, Clock, Heart, BookOpen, FileText, Star } from 'lucide-react'

/**
 * 课程卡片配置
 *
 * 每个课程方向包含图标、名称、描述、标签、课程数和通过率。
 */
const COURSES = [
  {
    icon: Building2,
    title: '一级/二级建造师',
    description: '建筑工程、市政公用、机电工程等多个专业方向',
    badge: '热门',
    badgeColor: 'var(--bl-teal)',
    badgeBg: 'rgba(31,138,101,0.15)',
    iconColor: 'var(--bl-accent)',
    iconBg: 'rgba(245,78,0,0.15)',
    courseCount: '12',
    passRate: '95',
  },
  {
    icon: Clock,
    title: '消防工程师',
    description: '一级注册消防工程师全程辅导，理论+实操全覆盖',
    badge: '推荐',
    badgeColor: 'var(--bl-accent)',
    badgeBg: 'rgba(245,78,0,0.12)',
    iconColor: 'var(--bl-gold)',
    iconBg: 'rgba(192,133,50,0.15)',
    courseCount: '8',
    passRate: '89',
  },
  {
    icon: Heart,
    title: '健康管理师',
    description: '国家健康管理师职业资格认证，大健康行业敲门砖',
    badge: null,
    badgeColor: '',
    badgeBg: '',
    iconColor: 'var(--bl-teal)',
    iconBg: 'rgba(31,138,101,0.15)',
    courseCount: '6',
    passRate: '91',
  },
  {
    icon: BookOpen,
    title: '教师资格证',
    description: '幼教、小学、中学多学段笔面试一体化培训',
    badge: null,
    badgeColor: '',
    badgeBg: '',
    iconColor: 'var(--bl-rose)',
    iconBg: 'rgba(207,45,86,0.12)',
    courseCount: '15',
    passRate: '93',
  },
  {
    icon: FileText,
    title: '人力资源师',
    description: '企业人力资源管理师四级至一级，系统提升专业能力',
    badge: null,
    badgeColor: '',
    badgeBg: '',
    iconColor: 'var(--bl-brown)',
    iconBg: 'rgba(139,111,71,0.15)',
    courseCount: '9',
    passRate: '88',
  },
  {
    icon: Star,
    title: '心理咨询师',
    description: '中科院心理所认证课程，零基础可学的心理咨询入门',
    badge: '新上线',
    badgeColor: 'var(--bl-gold)',
    badgeBg: 'rgba(192,133,50,0.15)',
    iconColor: 'var(--bl-peach)',
    iconBg: 'rgba(223,168,143,0.2)',
    courseCount: '5',
    passRate: '90',
  },
]

/**
 * Landing Page 热门课程区块
 *
 * 深色背景区块，3×2 网格展示课程方向卡片。
 * 每张卡片包含图标、标签、标题、描述、课程数和通过率。
 */
export function LandingCourses() {
  return (
    <section className="bg-[var(--bl-dark)] px-[72px] py-[100px]">
      {/* 区块头部 */}
      <div className="mb-[48px] flex items-end justify-between">
        <div>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--bl-accent)]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Our Programs
          </span>
          <h2
            className="mt-[12px] text-[38px] font-semibold tracking-[-0.025em] text-white"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            热门课程方向
          </h2>
          <p
            className="mt-[10px] text-[14px] text-white/45"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            涵盖建筑、消防、健康、教育等多个行业领域
          </p>
        </div>
        <div
          className="cursor-pointer rounded-lg border border-white/12 px-[22px] py-[10px]"
        >
          <span
            className="text-[13px] font-medium text-white/70"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            查看全部课程 →
          </span>
        </div>
      </div>

      {/* 课程卡片网格 */}
      <div className="grid grid-cols-3 gap-[16px]">
        {COURSES.map((course) => {
          const Icon = course.icon
          return (
            <div
              key={course.title}
              className="cursor-pointer rounded-[12px] border border-white/6 bg-white/6 px-[24px] py-[28px] transition-colors hover:bg-white/10"
            >
              {/* 图标 + 标签 */}
              <div className="mb-[16px] flex items-center gap-[10px]">
                <div
                  className="flex h-[40px] w-[40px] items-center justify-center rounded-lg"
                  style={{ backgroundColor: course.iconBg }}
                >
                  <Icon className="h-[20px] w-[20px]" style={{ color: course.iconColor }} strokeWidth={2} />
                </div>
                {course.badge && (
                  <div
                    className="rounded-full px-[10px] py-[3px]"
                    style={{ backgroundColor: course.badgeBg }}
                  >
                    <span
                      className="text-[10.5px] font-medium"
                      style={{ fontFamily: 'var(--font-dm-sans)', color: course.badgeColor }}
                    >
                      {course.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* 标题 + 描述 */}
              <h3
                className="text-[17px] font-semibold text-white"
                style={{ fontFamily: 'var(--font-outfit)' }}
              >
                {course.title}
              </h3>
              <p
                className="mt-[10px] text-[12.5px] leading-[1.55] text-white/40"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {course.description}
              </p>

              {/* 底部信息 */}
              <div
                className="mt-[20px] flex items-center gap-[16px] border-t border-white/6 pt-[16px]"
              >
                <span className="text-[11.5px] text-white/35" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {course.courseCount} 门课程
                </span>
                <span className="text-[11.5px] text-white/35" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  通过率 {course.passRate}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
