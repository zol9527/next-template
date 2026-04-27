'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Lock } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import type { SidebarItem, SidebarGroupConfig } from './sidebar-items'
import { useAuth } from '@/hooks/use-auth'
import { useAccess } from '@/hooks/use-access'
import { PermissionDeniedModal, usePermissionDeniedModal } from './permission-denied-modal'

// 单个菜单项组件
interface MenuItemProps {
  item: SidebarItem // 菜单项数据
  expandedMenus: Set<string> // 当前展开的菜单项 href 集合
  toggleMenu: (href: string) => void // 切换菜单展开状态的函数
  renderChild: (item: SidebarItem) => React.ReactNode // 渲染子菜单项的函数
  showModal: (name: string, permission: string) => void // 显示权限不足弹窗的函数
}

// 递归渲染菜单项
function MenuItem({ item, expandedMenus, toggleMenu, renderChild, showModal }: MenuItemProps) {
  const pathname = usePathname()
  const auth = useAuth()
  const access = useAccess()

  // 优先使用 requiredAccess，fallback 到 requiredPermission
  const hasAccess = item.requiredAccess
    ? access.has(item.requiredAccess)
    : true

  const isActive = pathname === item.href
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedMenus.has(item.href)

  const isLocked = item.requiredAccess && !hasAccess && !auth.isLoading

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLocked) {
      showModal(item.name, `${item.requiredAccess?.action}:${item.requiredAccess?.scope}`)
      return
    }
    if (hasChildren) {
      toggleMenu(item.href)
    }
  }

  // 有子菜单，渲染可展开的菜单项
  if (hasChildren) {
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          onClick={handleClick}
          isActive={isActive}
          tooltip={item.name}
          size="sm"
          className="gap-3 rounded-lg px-3 text-white/90 hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white transition-colors"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {isLocked && (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            )}
            {!isLocked && (
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </SidebarMenuButton>

        {isExpanded && !isLocked && (
          <SidebarMenuSub>
            {item.children!.map((child) => renderChild(child))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    )
  }

  // 无子菜单，渲染普通菜单项
  const menuContent = (
    <>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.name}</span>
      {isLocked && (
        <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" />
      )}
    </>
  )

  // 渲染菜单项，权限不足时显示弹窗
  return (
    <SidebarMenuItem key={item.href}>
      {isLocked ? (
        <SidebarMenuButton
          onClick={() => showModal(item.name, `${item.requiredAccess?.action}:${item.requiredAccess?.scope}`)}
          tooltip={item.name}
          size="sm"
          className="gap-3 rounded-lg px-3 text-white/40 hover:bg-white/5 transition-colors"
        >
          {menuContent}
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.name}
          size="sm"
          className="gap-3 rounded-lg px-3 text-white/90 hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white transition-colors"
        >
          <Link href={item.href}>{menuContent}</Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

interface AppSidebarMenuProps {
  groups: SidebarGroupConfig[]
}

// 侧边栏菜单组件
export function AppSidebarMenu({ groups }: AppSidebarMenuProps) {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set())
  const modal = usePermissionDeniedModal()

  const allItems = React.useMemo(
    () => groups.flatMap((group) => group.items),
    [groups]
  )

  React.useEffect(() => {
    const activeParents = allItems.filter(item => {
      if (item.children) {
        return item.children.some(child => pathname.startsWith(child.href))
      }
      return false
    })
    setExpandedMenus(new Set(activeParents.map(item => item.href)))
  }, [pathname, allItems])

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }

  const renderMenuItem = (item: SidebarItem): React.ReactNode => {
    return (
      <MenuItem
        key={item.href}
        item={item}
        expandedMenus={expandedMenus}
        toggleMenu={toggleMenu}
        renderChild={renderMenuItem}
        showModal={modal.show}
      />
    )
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.group}>
          <SidebarGroupLabel className="px-3 py-2 text-white/50 text-xs font-semibold uppercase tracking-wider">
            {group.group}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => renderMenuItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      <PermissionDeniedModal {...modal.modalProps} />
    </>
  )
}
