'use client'

/**
 * 学习步骤配置
 */
const STEPS = [
  {
    number: '1',
    title: '免费咨询评估',
    description: '专属课程顾问一对一沟通，评估你的基础情况与考证需求，推荐最合适的课程方案。',
    bgVar: '--bl-accent-subtle',
    colorVar: '--bl-accent',
  },
  {
    number: '2',
    title: '系统学习备考',
    description: '按计划完成录播课程 + 直播答疑 + 模考练习，班主任全程督学，保障学习进度。',
    bgVar: '--bl-gold-subtle',
    colorVar: '--bl-gold',
  },
  {
    number: '3',
    title: '顺利通过拿证',
    description: '考前冲刺集训 + 考试技巧辅导，助你一次性通过考试，拿取职业资格证书。',
    bgVar: '--bl-teal-subtle',
    colorVar: '--bl-teal',
  },
]

/**
 * Landing Page 学习流程区块
 *
 * 三步走流程展示：免费咨询 → 系统备考 → 通过拿证。
 */
export function LandingProcess() {
  return (
    <section className="flex flex-col items-center px-[72px] py-[100px]">
      {/* 标题 */}
      <span
        className="mb-[12px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--bl-accent)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        How It Works
      </span>
      <h2
        className="text-[38px] font-semibold tracking-[-0.025em] text-[var(--bl-fg)]"
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        三步开始你的考证之路
      </h2>
      <p
        className="mt-[14px] text-[14px] text-[var(--bl-fg-secondary)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        简单三步，从咨询到拿证，全程有专人跟进。
      </p>

      {/* 步骤卡片 */}
      <div className="mt-[56px] flex w-full max-w-[1000px] gap-[32px]">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex flex-1 items-start gap-[32px]">
            {/* 步骤内容 */}
            <div className="flex-1 text-center">
              <div
                className="mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-2xl"
                style={{ backgroundColor: `var(${step.bgVar})` }}
              >
                <span
                  className="text-[24px] font-semibold"
                  style={{ fontFamily: 'var(--font-outfit)', color: `var(${step.colorVar})` }}
                >
                  {step.number}
                </span>
              </div>
              <h3
                className="mt-[20px] text-[17px] font-semibold text-[var(--bl-fg)]"
                style={{ fontFamily: 'var(--font-outfit)' }}
              >
                {step.title}
              </h3>
              <p
                className="mt-[10px] text-[13px] leading-[1.6] text-[var(--bl-fg-secondary)]"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                {step.description}
              </p>
            </div>

            {/* 连接箭头（最后一个步骤不显示） */}
            {index < STEPS.length - 1 && (
              <div className="flex items-start pt-[28px]">
                <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                  <path
                    d="M0 6h32m0 0l-6-5m6 5l-6 5"
                    stroke="#e0dfd8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
