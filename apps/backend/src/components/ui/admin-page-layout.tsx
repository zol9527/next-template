import { cn } from '@/lib/utils'

interface AdminPageLayoutProps {
  children: React.ReactNode
  className?: string
}

// 标准 admin 页面容器，自带淡入动画
export function AdminPageLayout({ children, className }: AdminPageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-6 animate-in fade-in duration-500', className)}>
      {children}
    </div>
  )
}
