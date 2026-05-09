'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Image as ImageIcon, Settings, ShoppingBag, Smartphone, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

/**
 * Type: SubSidebarItem
 *
 * Description: 子侧边栏导航项配置
 *
 * Properties:
 *     name(string): 导航项名称
 *     href(string): 路由链接
 *     icon(LucideIcon): 图标组件
 *     description(string, optional): 描述文字
 */
interface SubSidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

/**
 * Function: miniprogramNavItems
 *
 * Description: 微信小程序管理的子导航项配置
 * 新增功能模块时在此处添加导航项即可
 *
 * Returns:
 *     SubSidebarItem[]: 子导航项列表
 */
const miniprogramNavItems: SubSidebarItem[] = [
  {
    name: '轮播图',
    href: '/admin/miniprogram/carousels',
    icon: ImageIcon,
    description: '管理首页轮播图',
  },
  {
    name: '首页设置',
    href: '/admin/miniprogram/home-config',
    icon: Home,
    description: '首页 Banner 配置',
  },
  {
    name: '基础设置',
    href: '/admin/miniprogram/settings',
    icon: Settings,
    description: '小程序基础配置',
  },
  {
    name: '商城设置',
    href: '/admin/miniprogram/shop-config',
    icon: ShoppingBag,
    description: '商城相关配置',
  },
  {
    name: '常见问题',
    href: '/admin/miniprogram/faq',
    icon: HelpCircle,
    description: '常见问题管理',
  },
]

/**
 * Function: isActivePath
 *
 * Description: 判断当前路径是否匹配指定的导航项
 * 使用 startsWith 进行前缀匹配，支持子路由高亮
 *
 * Parameters:
 *     pathname(string): 当前路由路径
 *     itemHref(string): 导航项链接
 *
 * Returns:
 *     boolean: 是否匹配
 */
function isActivePath(pathname: string, itemHref: string): boolean {
  return pathname === itemHref || pathname.startsWith(itemHref + '/')
}

/**
 * Component: MiniprogramSubSidebar
 *
 * Description: 微信小程序管理的子侧边栏组件
 * 提供功能模块的二级导航，与主侧边栏视觉风格保持一致
 *
 * Features:
 *     - 自动高亮当前激活的导航项
 *     - 支持子路由路径匹配
 *     - 可扩展的导航项配置
 */
export function MiniprogramSubSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">微信小程序</span>
          <span className="text-xs text-muted-foreground">功能管理</span>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-2">
          {miniprogramNavItems.map((item) => {
            const isActive = isActivePath(pathname, item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground/70">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
