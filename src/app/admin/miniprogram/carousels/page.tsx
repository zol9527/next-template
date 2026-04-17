'use client'

import { CarouselListTab } from '@/components/business/admin/miniprogram/carousel-list-tab'

export default function AdminMiniprogramCarouselsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">轮播图管理</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序首页轮播图的展示内容
        </p>
      </div>
      <CarouselListTab />
    </div>
  )
}
