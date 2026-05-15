'use client'

import { GraduationCap } from 'lucide-react'
import { APP_NAME } from '@/config/site'
import { useSiteConfigContext } from '@/components/context/site-config-context'

/**
 * File: app-sidebar-header.tsx
 * Description: 侧边栏品牌区域组件
 * Function: AppSidebarHeader
 *
 * Description: 侧边栏顶部品牌标识，显示图标和品牌名称
 *
 * 品牌名称来源优先级:
 *   1. 数据库 SiteConfig API（siteConfig.siteName，运营可动态修改）
 *   2. 集中配置文件 APP_NAME（环境变量或默认值 "NextAdmin"）
 *
 * 结构 (对应 Paper Design BrandArea FT7-1):
 *   - BrandIcon: 36×36px 圆角深色方块 + 毕业帽图标
 *   - BrandName: 品牌名称，Outfit 600 17px
 *   - 折叠态 (collapsible=icon): 仅显示 BrandIcon
 *
 * 规格来源: Paper Design "App Shell — 主框架模板" BrandArea (FT7-1)
 *   - 高度: 52px
 *   - 内边距: 8px 16px
 *   - 间距: gap-3 (12px)
 */
export function AppSidebarHeader() {
  // 优先使用数据库动态配置，fallback 到集中配置文件
  const { siteConfig } = useSiteConfigContext()
  const brandName = siteConfig?.siteName ?? APP_NAME

  return (
    <div className="flex items-center h-[52px] shrink-0 mb-2 py-2 px-4 gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      {/* BrandIcon: 对应 Paper FT8-1 — 36×36px 深色方块 */}
      <div className="flex items-center justify-center shrink-0 rounded-lg bg-fg size-9">
        <GraduationCap className="size-5 text-white" strokeWidth={2} />
      </div>

      {/* BrandName: 对应 Paper FTD-1 — Outfit 600 17px */}
      <span className="font-display font-semibold text-fg text-[17px] leading-[22px] group-data-[collapsible=icon]:hidden">
        {brandName}
      </span>
    </div>
  )
}
