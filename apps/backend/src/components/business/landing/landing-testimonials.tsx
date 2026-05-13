'use client'

/**
 * 学员评价数据配置
 */
const TESTIMONIALS = [
  {
    quote: '在职备考时间不多，但课程安排得很合理，每天一个小时就能跟上进度。班主任也很负责，经常催我交作业，最终一次过了二建。',
    name: '张先生',
    title: '二级建造师 · 2025 届',
    avatar: '张',
    gradient: 'linear-gradient(135deg, #F54E00, #c08532)',
  },
  {
    quote: '之前自己看书复习了半年没过，后来报了这里的消防工程师冲刺班，老师划重点特别准，模考题和真题风格很像，推荐！',
    name: '李女士',
    title: '消防工程师 · 2025 届',
    avatar: '李',
    gradient: 'linear-gradient(135deg, #1F8A65, #8b6f47)',
  },
  {
    quote: '我是宝妈，只有晚上孩子睡了才能学。录播课可以反复看很方便，不懂的在群里问老师，回复也很快。笔试面试都是一次过的。',
    name: '王女士',
    title: '教师资格证 · 2024 届',
    avatar: '王',
    gradient: 'linear-gradient(135deg, #cf2d56, #dfa88f)',
    stars: 4,
  },
]

/**
 * Landing Page 学员评价区块
 *
 * 3 列 testimonial 卡片，展示真实学员反馈。
 */
export function LandingTestimonials() {
  return (
    <section className="px-[72px] pb-[100px] pt-[80px]">
      {/* 标题 */}
      <div className="mb-[48px] flex items-end justify-between">
        <div>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--bl-accent)]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Testimonials
          </span>
          <h2
            className="mt-[12px] text-[38px] font-semibold tracking-[-0.025em] text-[var(--bl-fg)]"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            学员真实反馈
          </h2>
        </div>
      </div>

      {/* 评价卡片 */}
      <div className="grid grid-cols-3 gap-[16px]">
        {TESTIMONIALS.map((item) => (
          <div
            key={item.name}
            className="rounded-[12px] border bg-[var(--bl-surface)] px-[24px] py-[28px]"
            style={{ borderColor: 'var(--bl-border)' }}
          >
            {/* 星级评分 */}
            <div className="mb-[16px] flex gap-[2px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < (item.stars ?? 5) ? '#c08532' : '#e0dfd8'}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>

            {/* 评价内容 */}
            <p
              className="text-[13.5px] leading-[1.65] text-[var(--bl-fg)]"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              &ldquo;{item.quote}&rdquo;
            </p>

            {/* 用户信息 */}
            <div
              className="mt-[20px] flex items-center gap-[12px] border-t pt-[16px]"
              style={{ borderColor: 'var(--bl-border)' }}
            >
              <div
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full"
                style={{ background: item.gradient }}
              >
                <span className="text-[13px] font-semibold text-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {item.avatar}
                </span>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[var(--bl-fg)]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {item.name}
                </div>
                <div className="text-[11px] text-[var(--bl-fg-muted)]" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  {item.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
