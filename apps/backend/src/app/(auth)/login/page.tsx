import { AdminLoginForm } from '@/components/business/admin/admin-login-form'
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/**
Function: AdminLoginPage

Description: SaaS 极简主义风格的后台登录页面 - 单列布局，简洁优雅

Parameters:

Returns:
	element(React.ReactElement): 登录页面组件
*/
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 relative">
      {/* 主题切换按钮 - 右上角 */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* 品牌标识 */}
      <div className="mb-8 flex flex-col items-center space-y-4">
        {/* Logo - 极简设计 */}
        <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
        </div>

        {/* 品牌名称 */}
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
          硕博达教育后台管理
        </h1>
      </div>

      {/* 登录表单容器 - 居中单列布局 */}
      <div className="w-full max-w-sm">
        {/* 欢迎标题 */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            欢迎回来
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            请输入您的账号和密码登录
          </p>
        </div>

        {/* 登录表单 */}
        <AdminLoginForm />
      </div>

      {/* 底部版权信息 - 极简设计 */}
      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>© 2026 硕博达教育后台管理. All rights reserved.</p>
        <PublicIcpFiling className="mt-2" />
      </footer>
    </div>
  )
}
