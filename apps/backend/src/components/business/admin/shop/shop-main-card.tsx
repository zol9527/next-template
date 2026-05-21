'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * 商城管理页面 Tab 定义
 *
 * 每个 Tab 对应一个路由，通过 router.push() 实现页面切换
 */
const SHOP_TABS = [
  { value: 'products', label: '商品管理', href: '/admin/market/products' },
  { value: 'categories', label: '分类管理', href: '/admin/market/categories' },
  { value: 'orders', label: '订单管理', href: '/admin/market/orders' },
  { value: 'coupons', label: '优惠券', href: '/admin/market/coupons' },
  { value: 'affiliate', label: '分销管理', href: '/admin/market/affiliate' },
] as const

export type ShopTab = (typeof SHOP_TABS)[number]['value']

// ============================================================
// ShopTabBar — 独立的 Tab 导航组件
// ============================================================

interface ShopTabBarProps {
  /** 当前激活的 Tab */
  activeTab: ShopTab
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * Component: ShopTabBar
 *
 * Description: 商城模块的 Tab 导航栏（独立组件，通过 AdminPageHeader 的 filterBar 属性注入到 Header 第二行）。
 *
 * 设计规范:
 *   - Tab 选中: color #F54E00 (text-primary), font-weight 600, 底部 2px 橙色下划线
 *   - Tab 非选中: color #6B6960 (text-fg-secondary), font-weight 500
 *   - Tab 间距: padding 8px 16px
 *   - Tab 分隔: 1px × 20px 竖线 #26251E14
 */
export function ShopTabBar({ activeTab, className }: ShopTabBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  /**
   * Tab 切换处理
   *
   * 通过 router.push() 实现路由跳转（非 SPA 状态切换），
   * 确保每个 Tab 对应独立的 URL，支持浏览器前进/后退和 SEO
   */
  const handleTabClick = React.useCallback(
    (href: string) => {
      // 如果当前已经在目标页面，不重复跳转
      if (pathname !== href) {
        router.push(href)
      }
    },
    [router, pathname]
  )

  return (
    <nav
      className={cn('flex items-center h-full px-7', className)}
      role="tablist"
      aria-label="商城管理导航"
    >
      {SHOP_TABS.map((tab, index) => {
        const isActive = activeTab === tab.value

        return (
          <React.Fragment key={tab.value}>
            {/* Tab 按钮 */}
            <button
              id={`shop-tab-${tab.value}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`shop-panel-${tab.value}`}
              onClick={() => handleTabClick(tab.href)}
              className={cn(
                // 文字样式：text-nav (DM Sans, 13.5px, 500)
                'text-nav',
                // 间距
                'px-4 py-2',
                // 相对定位（用于底部下划线指示器）
                'relative',
                // 过渡动画
                'motion-safe:transition-colors motion-safe:duration-150',
                // 聚焦样式
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                // 悬停效果
                'hover:text-fg',
                // 选中/非选中状态
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-fg-secondary font-medium'
              )}
            >
              {tab.label}

              {/* 选中态底部下划线指示器 */}
              {isActive && (
                <span
                  className={cn(
                    // 定位在底部
                    'absolute bottom-0 left-4 right-4',
                    // 2px 高度橙色下划线
                    'h-[2px] bg-primary',
                    // 圆角
                    'rounded-full'
                  )}
                />
              )}
            </button>

            {/* Tab 之间的竖线分隔符（最后一个 Tab 后不加） */}
            {index < SHOP_TABS.length - 1 && (
              <span
                className="w-px h-5 bg-border-default mx-1"
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// ============================================================
// ShopMainCard — 简化后的内容容器
// ============================================================

interface ShopMainCardProps {
  /** 页面内容区域 */
  children: React.ReactNode
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * Function: ShopMainCard
 *
 * Description: 商城管理模块的内容容器组件。
 *   TabBar 已提取为独立的 ShopTabBar 组件，
 *   通过 AdminPageHeader 的 filterBar 属性注入到 CardHeader 第二行。
 *
 * 结构:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Content Area (由各页面自行渲染)                           │
 *   │                                                          │
 *   └─────────────────────────────────────────────────────────┘
 *
 * 设计规范:
 *   - 外壳: 白色卡片，border-radius: 16px (rounded-2xl)
 *   - 阴影: shadow-md (0 1px 3px + 8px 24px)
 *   - Content: padding 24px 28px, flex: 1
 */
export function ShopMainCard({
  children,
  className,
}: ShopMainCardProps) {
  return (
    <div
      className={cn(
        // 外壳：白色卡片 + 圆角 + 阴影
        'bg-surface rounded-2xl shadow-md',
        // flex 布局，让 content 区域撑满
        'flex flex-col',
        // 占据父容器（<main>）的全部剩余空间，消除底部空白
        'flex-1 min-h-0',
        className
      )}
    >
      {/* Content 区域 */}
      <div
        role="tabpanel"
        className={cn(
          // 内容区内边距
          'py-6 px-7',
          // 占满剩余空间
          'flex-1',
          // 允许内容滚动
          'overflow-auto'
        )}
      >
        {children}
      </div>
    </div>
  )
}
