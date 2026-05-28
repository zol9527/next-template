'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { SIDEBAR_ITEMS } from './sidebar-items'
import { useAuth } from '@/hooks/use-auth'
import { useAccess } from '@/hooks/use-access'
import { PermissionDeniedModal, usePermissionDeniedModal } from './permission-denied-modal'
import { cn } from '@/lib/utils'

/**
 * Component: AppSidebarMenu
 *
 * Description: 扁平化侧边栏导航列表（Paper Design SidebarNav FJ6-1）
 *   - 10 个导航项，无分组 label
 *   - 导航项尺寸: 204×36px (px-3 py-[9px])
 *   - 圆角: rounded-sm (8px)
 *   - 间距: gap-0.5 (2px)
 *   - Active: accent-subtle 背景 + 左侧 3px accent 指示条
 */
export function AppSidebarMenu() {
  const pathname = usePathname()
  const auth = useAuth()
  const access = useAccess()
  const modal = usePermissionDeniedModal()

  return (
    <nav className="flex flex-col grow py-2 px-2.5 gap-0.5 overflow-y-auto">
      {SIDEBAR_ITEMS.map((item) => {
        const hasAccess = item.requiredAccess
          ? access.has(item.requiredAccess)
          : true
        const isActive = pathname === item.href
        const isLocked = item.requiredAccess && !hasAccess && !auth.isLoading

        const handleClick = (e: React.MouseEvent) => {
          if (isLocked) {
            e.preventDefault()
            modal.show(item.name, `${item.requiredAccess?.action}:${item.requiredAccess?.scope}`)
          }
        }

        return (
          <Link
            key={item.href}
            href={isLocked ? '#' : item.href}
            onClick={handleClick}
            className={cn(
              'flex items-center rounded-sm py-[9px] px-3 gap-3 transition-colors relative',
              isActive
                ? 'bg-ds-accent-subtle text-ds-accent'
                : 'text-fg-secondary hover:bg-[rgba(38,37,30,0.04)]',
              isLocked && 'text-fg-secondary/45'
            )}
          >
            {/* Active 左侧指示条 — 3px accent 色 */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-ds-accent" />
            )}

            <item.icon className="size-[18px] shrink-0" strokeWidth={2} />
            <span className="font-body font-medium text-[13.5px] leading-[130%] truncate">
              {item.name}
            </span>

            {isLocked && (
              <Lock className="ml-auto size-3.5 shrink-0 text-fg-secondary/45" />
            )}
          </Link>
        )
      })}

      <PermissionDeniedModal {...modal.modalProps} />
    </nav>
  )
}
