'use client'

import { GraduationCap } from 'lucide-react'
import { APP_NAME } from '@/config/site'
import { useSiteConfigContext } from '@/components/context/site-config-context'

/**
 * Component: AppSidebarHeader
 *
 * Description: 侧边栏品牌区域（Paper Design BrandArea FT7-1）
 *   - BrandIcon: 36×36px 圆角深色方块 + 毕业帽图标
 *   - BrandName: 品牌名称，Outfit 600 17px
 *   - 高度: 52px，内边距: py-2 px-4，间距 gap-3
 */
export function AppSidebarHeader() {
  const { siteConfig } = useSiteConfigContext()
  const brandName = siteConfig?.siteName ?? APP_NAME

  return (
    <div className="flex items-center h-[52px] shrink-0 mb-2 py-2 px-4 gap-3">
      {/* BrandIcon: 对应 Paper FT8-1 — 36×36px 深色方块 */}
      <div className="flex items-center justify-center shrink-0 rounded-sm bg-fg size-9">
        <GraduationCap className="size-5 text-white" strokeWidth={2} />
      </div>

      {/* BrandName: 对应 Paper FTD-1 — Outfit 600 17px */}
      <span className="font-display font-semibold text-fg text-[17px] leading-[22px]">
        {brandName}
      </span>
    </div>
  )
}
