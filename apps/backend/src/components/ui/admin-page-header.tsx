import { cn } from '@/lib/utils'

interface AdminPageHeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

// 标准 admin 页面头部，标题 + 描述 + 操作区
export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  if (!title && !description && !actions) return null

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div>
        {title && <h1 className="text-xl font-bold tracking-tight">{title}</h1>}
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
