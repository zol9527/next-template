'use client'

import { MiniprogramFaqList } from '@/components/business/admin/miniprogram/faq-list'

/**
 * Page: AdminMiniprogramFaqPage
 *
 * Description: 小程序常见问题管理页面
 * 管理小程序帮助与反馈中的常见问题条目
 */
export default function AdminMiniprogramFaqPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">常见问题管理</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序帮助与反馈页面中的常见问题条目
        </p>
      </div>
      <MiniprogramFaqList />
    </div>
  )
}
