/**
 * File: error-page.tsx
 * Description: 通用错误页面组件，支持 404 / 通用错误 / 500 三种状态
 * 基于 Paper Design System 的 Error Pages 设计规范
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ChevronLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/** 错误页面类型 */
type ErrorType = '404' | 'general' | '500'

interface ErrorPageProps {
  /** 错误类型：404=未找到, general=通用错误, 500=服务器错误 */
  type: ErrorType
  /** 重试回调（仅 error.tsx / global-error.tsx 提供） */
  reset?: () => void
}

/** 各错误类型的文案配置 */
interface ErrorConfig {
  illustration: React.ReactNode
  errorCode: string
  title: string
  description: string
}

// ============================================
// 错误类型配置（Error Configurations）
// ============================================

/** 404 指南针插画 — 暖橙色系，表达「迷失方向」 */
function NotFoundIllustration() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 外圈装饰 */}
      <circle cx="100" cy="100" r="70" stroke="var(--ds-accent)" opacity="0.12" />
      <circle cx="100" cy="100" r="58" stroke="var(--ds-accent)" strokeWidth="1.5" opacity="0.08" />
      {/* 中心刻度盘 */}
      <circle cx="100" cy="100" r="48" stroke="var(--fg)" strokeWidth="1.5" opacity="0.12" />
      {/* 四个方位刻度 */}
      <line x1="100" y1="44" x2="100" y2="54" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="100" y1="146" x2="100" y2="156" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="44" y1="100" x2="54" y2="100" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      <line x1="146" y1="100" x2="156" y2="100" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
      {/* 指南针指针（旋转 35°） */}
      <g transform="rotate(35 100 100)">
        <polygon points="100,55 95,105 105,105" fill="var(--ds-accent)" opacity="0.9" />
        <polygon points="100,145 95,95 105,95" fill="var(--ds-accent)" opacity="0.15" />
      </g>
      {/* 中心点 */}
      <circle cx="100" cy="100" r="4" fill="var(--ds-accent)" />
      <circle cx="100" cy="100" r="2" fill="var(--surface)" />
      {/* 散落装饰粒子 */}
      <rect x="28" y="42" width="10" height="10" rx="2" transform="rotate(25 33 47)" fill="var(--ds-accent)" opacity="0.08" />
      <polygon points="170,52 175,45 180,55" fill="var(--ds-accent)" opacity="0.1" />
      <circle cx="35" cy="155" r="5" fill="var(--ds-accent)" opacity="0.06" />
      <rect x="160" y="148" width="8" height="8" rx="1" transform="rotate(-20 164 152)" fill="var(--ds-accent)" opacity="0.08" />
      <polygon points="50,30 54,25 56,33" fill="var(--ds-accent)" opacity="0.07" />
      <circle cx="155" cy="38" r="3" fill="var(--ds-accent)" opacity="0.1" />
    </svg>
  )
}

/** 通用错误碎片网格插画 — 金棕色系，表达「缺失拼图」 */
function GeneralErrorIllustration() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 网格外框（空白位置） */}
      <g stroke="var(--fg)" strokeWidth="1.2" opacity="0.1">
        <rect x="40" y="60" width="40" height="40" rx="2" />
        <rect x="80" y="60" width="40" height="40" rx="2" />
        <rect x="120" y="60" width="40" height="40" rx="2" />
        <rect x="40" y="100" width="40" height="40" rx="2" />
        <rect x="120" y="100" width="40" height="40" rx="2" />
      </g>
      {/* 已有格子（低透明度填充） */}
      <g fill="var(--gold)" opacity="0.06" stroke="var(--gold)" strokeOpacity="0.15">
        <rect x="40" y="60" width="40" height="40" rx="2" />
        <rect x="80" y="60" width="40" height="40" rx="2" />
        <rect x="120" y="60" width="40" height="40" rx="2" />
        <rect x="40" y="100" width="40" height="40" rx="2" />
        <rect x="120" y="100" width="40" height="40" rx="2" />
      </g>
      {/* 缺失格子（虚线） */}
      <rect
        x="80" y="100" width="40" height="40" rx="2"
        fill="var(--gold)" fillOpacity="0.03"
        stroke="var(--gold)" strokeWidth="1.5"
        strokeDasharray="4 3" opacity="0.5"
      />
      {/* 脱落的拼图块（旋转偏移） */}
      <g transform="translate(140, 130) rotate(12)">
        <rect width="40" height="40" rx="2" fill="var(--gold)" opacity="0.15" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="20" cy="0" r="6" fill="var(--gold)" opacity="0.12" />
        <text x="20" y="26" fontFamily="DM Sans" fontSize="18" fontWeight="600" fill="var(--gold)" textAnchor="middle" opacity="0.5">
          ?
        </text>
      </g>
      {/* 连接虚线 */}
      <path d="M110 125 Q125 135 138 140" stroke="var(--gold)" strokeDasharray="3 3" fill="none" opacity="0.3" />
      {/* 格子内文字行 */}
      <g fill="var(--gold)" opacity="0.06">
        <rect x="48" y="68" width="24" height="2" rx="1" />
        <rect x="48" y="74" width="16" height="2" rx="1" />
        <rect x="88" y="68" width="24" height="2" rx="1" />
        <rect x="88" y="74" width="16" height="2" rx="1" />
        <rect x="128" y="68" width="24" height="2" rx="1" />
        <rect x="128" y="74" width="16" height="2" rx="1" />
        <rect x="48" y="108" width="24" height="2" rx="1" />
        <rect x="48" y="114" width="16" height="2" rx="1" />
        <rect x="128" y="108" width="24" height="2" rx="1" />
        <rect x="128" y="114" width="16" height="2" rx="1" />
      </g>
      {/* 散落装饰 */}
      <rect x="30" y="155" width="6" height="6" rx="1" fill="var(--gold)" opacity="0.08" transform="rotate(20 33 158)" />
      <rect x="50" y="160" width="4" height="4" rx="0.5" fill="var(--gold)" opacity="0.06" transform="rotate(-10 52 162)" />
      <circle cx="165" cy="48" r="3" fill="var(--gold)" opacity="0.08" />
      <circle cx="35" cy="50" r="2" fill="var(--gold)" opacity="0.06" />
      <circle cx="170" cy="90" r="2.5" fill="var(--gold)" opacity="0.06" />
    </svg>
  )
}

/** 500 服务器终端插画 — 玫红色系，表达「服务崩溃」 */
function ServerErrorIllustration() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 服务器主体 */}
      <rect x="60" y="70" width="80" height="90" rx="6" fill="none" stroke="var(--fg)" strokeWidth="1.5" opacity="0.15" />
      {/* 分隔线 */}
      <line x1="60" y1="100" x2="140" y2="100" stroke="var(--fg)" opacity="0.1" />
      <line x1="60" y1="130" x2="140" y2="130" stroke="var(--fg)" opacity="0.1" />
      {/* 状态指示灯 */}
      <circle cx="76" cy="85" r="3" fill="var(--rose)" opacity="0.9" />
      <circle cx="88" cy="85" r="3" fill="var(--rose)" opacity="0.5" />
      <circle cx="76" cy="115" r="3" fill="var(--fg)" opacity="0.12" />
      <circle cx="88" cy="115" r="3" fill="var(--fg)" opacity="0.12" />
      <circle cx="76" cy="145" r="3" fill="var(--fg)" opacity="0.12" />
      <circle cx="88" cy="145" r="3" fill="var(--rose)" opacity="0.3" />
      {/* 数据行 */}
      <g opacity="0.08" stroke="var(--fg)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="110" y1="78" x2="132" y2="78" />
        <line x1="110" y1="84" x2="132" y2="84" />
        <line x1="110" y1="90" x2="132" y2="90" />
        <line x1="110" y1="108" x2="132" y2="108" />
        <line x1="110" y1="114" x2="132" y2="114" />
        <line x1="110" y1="120" x2="132" y2="120" />
        <line x1="110" y1="138" x2="132" y2="138" />
        <line x1="110" y1="144" x2="132" y2="144" />
        <line x1="110" y1="150" x2="132" y2="150" />
      </g>
      {/* 烟雾/蒸汽效果 */}
      <path d="M80 70 Q82 55 78 42 Q76 34 80 25" stroke="var(--rose)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.15" />
      <path d="M100 70 Q98 50 102 38 Q104 28 100 18" stroke="var(--rose)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.2" />
      <path d="M120 70 Q118 58 122 46 Q124 38 120 30" stroke="var(--rose)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.12" />
      {/* 闪电/火花 */}
      <line x1="68" y1="62" x2="58" y2="52" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="58" y1="52" x2="52" y2="58" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="132" y1="65" x2="142" y2="55" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="142" y1="55" x2="148" y2="62" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* 警告三角 */}
      <g transform="translate(140, 140)" opacity="0.6">
        <path d="M10 2 L18 18 L2 18 Z" fill="none" stroke="var(--rose)" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="10" y1="8" x2="10" y2="13" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="15.5" r="0.8" fill="var(--rose)" />
      </g>
      {/* 底部阴影 */}
      <ellipse cx="100" cy="168" rx="50" ry="4" fill="var(--fg)" opacity="0.04" />
    </svg>
  )
}

// ============================================
// 配置映射（Configuration Map）
// ============================================

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  '404': {
    illustration: <NotFoundIllustration />,
    errorCode: '404',
    title: '页面未找到',
    description: '你访问的页面可能已被移动、删除或从未存在。请检查 URL 是否正确，或返回首页重新导航。',
  },
  general: {
    illustration: <GeneralErrorIllustration />,
    errorCode: 'Oops!',
    title: '出了点问题',
    description: '我们在处理你的请求时遇到了意外错误。请刷新页面重试，如果问题持续存在，请联系技术支持。',
  },
  '500': {
    illustration: <ServerErrorIllustration />,
    errorCode: '500',
    title: '服务器内部错误',
    description: '服务器遇到了意外情况，无法完成请求。我们的技术团队已收到通知，正在紧急修复中。请稍后再试。',
  },
}

// ============================================
// 组件实现（Component Implementation）
// ============================================

/**
 * Component: ErrorPage
 *
 * Description: 通用错误页面组件，根据类型渲染对应的插画、文案和操作按钮
 *
 * Props:
 *     type(ErrorType): 错误类型 — '404' | 'general' | '500'
 *     reset?(() => void): 重试回调，用于 error.tsx / global-error.tsx
 *
 * Example:
 *     <ErrorPage type="404" />
 *     <ErrorPage type="general" reset={() => reset()} />
 */
export function ErrorPage({ type, reset }: ErrorPageProps) {
  const router = useRouter()
  const config = ERROR_CONFIGS[type]

  /** 返回上一页：优先使用 reset，否则使用路由后退 */
  const handleGoBack = () => {
    if (reset) {
      reset()
    } else {
      router.back()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-10">
      {/* 错误卡片 — 白色圆角卡片 + 卡片阴影 */}
      <div className="flex w-full max-w-[480px] flex-col items-center gap-7 rounded-lg bg-surface px-12 py-14 shadow-md">
        {/* 插画区域 */}
        <div className="flex h-[200px] w-[200px] shrink-0 items-center justify-center">
          {config.illustration}
        </div>

        {/* 错误码 — Outfit 600 48px */}
        <h1 className="font-display text-[48px] font-semibold leading-[110%] tracking-tight text-fg">
          {config.errorCode}
        </h1>

        {/* 标题 — Outfit 600 18px */}
        <h2 className="-mt-3 font-display text-lg font-semibold leading-[130%] text-fg">
          {config.title}
        </h2>

        {/* 描述文字 — DM Sans 400 13px */}
        <p className="-mt-2 max-w-[320px] text-center font-sans text-[13px] leading-[160%] text-fg-secondary">
          {config.description}
        </p>

        {/* 操作按钮组 */}
        <div className="mt-1 flex items-center gap-3">
          {/* 主按钮 — 返回首页 */}
          <Button
            asChild
            variant="solid"
            size="md"
            className="gap-2 rounded-sm"
          >
            <Link href="/">
              <Home size={16} />
              返回首页
            </Link>
          </Button>

          {/* 次要按钮 — 返回上一页 / 重试 */}
          <Button
            variant="outline"
            size="md"
            onClick={handleGoBack}
            className="gap-2 rounded-sm text-fg-secondary"
          >
            {reset ? <RefreshCw size={16} /> : <ChevronLeft size={16} />}
            {reset ? '重试' : '返回上一页'}
          </Button>
        </div>
      </div>
    </div>
  )
}
