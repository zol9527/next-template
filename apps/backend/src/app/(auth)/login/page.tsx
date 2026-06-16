import { connection } from 'next/server'
import { AdminLoginForm } from '@/components/business/admin/admin-login-form'
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing'
import { APP_NAME, getCopyrightText } from '@/config/site'

/**
 * Function: AdminLoginPage
 *
 * Description: NextAdmin 登录页面 — 基于 Paper Design System 设计稿实现
 * 暖灰背景 + 居中单列布局 + 品牌标识 + 分隔线 + 登录表单
 *
 * 布局结构（自上而下）:
 *   1. 品牌 Logo（48×48 暖橙圆角方块 + 图标）
 *   2. 品牌名称（Outfit 600 18px）
 *   3. 分隔线（1px border-default）
 *   4. 欢迎标题 + 副标题
 *   5. 登录表单（400px 宽度）
 *   6. 底部版权（absolute bottom-8）
 */
export default async function AdminLoginPage() {
  // 标记为动态渲染：页面包含基于 new Date() 的版权年份
  await connection()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 relative">
      {/* ── 品牌区域：Logo + 名称 ── */}
      <div className="w-[400px] flex flex-col items-center gap-7">
        {/* Logo + 品牌名称 */}
        <div className="flex flex-col items-center gap-3">
          {/* Logo 图标 — 48×48, rounded-xl (--radius-md), 暖橙背景 */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ds-accent shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
          </div>

          {/* 品牌名称 — heading-2 规范（Outfit 600 15px） */}
          <h1 className="heading-1 text-center">
            {APP_NAME}
          </h1>
        </div>

        {/* 分隔线 — border-default 颜色 */}
        <div className="w-full h-px bg-border-default shrink-0" />

        {/* 欢迎标题 + 副标题 */}
        <div className="flex flex-col items-center gap-2 w-full">
          <h2 className="heading-2 text-center">
            欢迎回来
          </h2>
          <p className="text-body text-fg-secondary text-center">
            请输入您的账号和密码登录
          </p>
        </div>
      </div>

      {/* ── 登录表单区域 — 400px 宽度 ── */}
      <div className="w-[400px] mt-7">
        <AdminLoginForm />
      </div>

      {/* ── 底部版权信息 — absolute 定位 ── */}
      <footer className="absolute bottom-8 flex gap-1">
        <p className="text-caption">
          {getCopyrightText()}
        </p>
        <PublicIcpFiling className="mt-2" />
      </footer>
    </div>
  )
}
