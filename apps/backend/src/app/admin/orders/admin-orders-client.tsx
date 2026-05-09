'use client'

import * as React from 'react'

import { AdminOrderList } from '@/components/business/admin/order/admin-order-list'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { AdminPageHeader } from '@/components/ui/admin-page-header'

/**
Function: AdminOrdersClient

Description: 后台订单管理页面的客户端组件

Parameters:

Returns:
    element(React.ReactElement): 订单管理页面
*/
export function AdminOrdersClient() {
  const [refreshKey] = React.useState(0)

  return (
    <AdminPageLayout>
      <AdminPageHeader description="支持按订单编号精确搜索。" />

      <AdminOrderList refreshKey={refreshKey} />
    </AdminPageLayout>
  )
}
