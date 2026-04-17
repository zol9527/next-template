'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { userSidebarGroups } from './sidebar-items'

interface UserSidebarProps {
  onLogout: () => void
}

export function UserSidebar({ onLogout }: UserSidebarProps) {
  const pathname = usePathname()
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set())

  // 自动展开当前路由的父菜单
  React.useEffect(() => {
    const activeParents = userSidebarGroups
      .flatMap((group) => group.items)
      .filter((item) => {
        if (item.children) {
          return item.children.some((child) => pathname.startsWith(child.href))
        }
        return false
      })
    setExpandedMenus(new Set(activeParents.map((item) => item.href)))
  }, [pathname])

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg font-bold">E</span>
          </div>
          <span>GenericAdmin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="py-4">
          {userSidebarGroups.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-muted-foreground">
                {group.group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <MenuItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      expandedMenus={expandedMenus}
                      toggleMenu={toggleMenu}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onLogout}
        >
          退出登录
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

interface MenuItemProps {
  item: {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    children?: MenuItemProps['item'][]
  }
  pathname: string
  expandedMenus: Set<string>
  toggleMenu: (href: string) => void
}

function MenuItem({ item, pathname, expandedMenus, toggleMenu }: MenuItemProps) {
  const isActive = pathname === item.href
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedMenus.has(item.href)
  const Icon = item.icon

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (hasChildren) {
      toggleMenu(item.href)
    }
  }

  // 有子菜单，渲染可展开的菜单项
  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleClick}
          isActive={isActive}
          tooltip={item.name}
        >
          <Icon className="h-5 w-5" />
          <span>{item.name}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </SidebarMenuButton>

        {isExpanded && (
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SubMenuItem key={child.href} item={child} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    )
  }

  // 无子菜单，渲染普通菜单项
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
        <Link href={item.href}>
          <Icon className="h-4 w-4" />
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SubMenuItem({
  item,
  pathname,
}: {
  item: MenuItemProps['item']
  pathname: string
}) {
  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
        <Link href={item.href}>
          <Icon className="h-4 w-4" />
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
