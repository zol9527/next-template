'use client'

/**
 * Landing Page CTA 区块
 *
 * 号召行动区域，包含手机号输入框和咨询按钮。
 * 底部有隐私政策提示文字。
 */
export function LandingCTA() {
  return (
    <section className="flex flex-col items-center px-[72px] py-[100px] text-center">
      <h2
        className="max-w-[600px] text-[42px] font-semibold tracking-[-0.03em] text-[var(--bl-fg)]"
        style={{ fontFamily: 'var(--font-outfit)' }}
      >
        准备好开始你的考证之旅了吗？
      </h2>
      <p
        className="mt-[18px] max-w-[440px] text-[15px] leading-[1.6] text-[var(--bl-fg-secondary)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        留下联系方式，课程顾问将在 30 分钟内与您沟通。
      </p>

      {/* 输入框 + 按钮 */}
      <div className="mt-[36px] flex items-center gap-[10px]">
        <div
          className="flex h-[46px] w-[280px] items-center rounded-[10px] border bg-[var(--bl-surface)] px-[20px]"
          style={{ borderColor: 'var(--bl-border-medium)' }}
        >
          <span
            className="text-[13.5px] text-[var(--bl-fg-muted)]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            输入您的手机号
          </span>
        </div>
        <button
          className="flex h-[46px] cursor-pointer items-center justify-center rounded-[10px] bg-[var(--bl-accent)] px-[28px] shadow-[0_4px_12px_rgba(245,78,0,0.2)]"
          type="button"
        >
          <span className="text-[14px] font-semibold text-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            免费咨询
          </span>
        </button>
      </div>

      <p
        className="mt-[14px] text-[11.5px] text-[var(--bl-fg-muted)]"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        提交即表示同意我们的隐私政策 · 不会泄露您的信息
      </p>
    </section>
  )
}
