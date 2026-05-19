'use client'

import * as React from 'react'

import { AdminOrderList } from '@/components/business/admin/order/admin-order-list'
import { ShopMainCard, ShopTabBar } from '@/components/business/admin/shop/shop-main-card'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { ShopSearchInput } from '@/components/business/admin/shop/shop-search-input'
import { ShopStatusFilter, type FilterItem } from '@/components/business/admin/shop/shop-status-filter'

/**
 * Function: AdminOrdersClient
 *
 * Description: 后台订单管理页面，使用 ShopMainCard 统一容器
 *
 * 设计规范:
 *   - TabBar 右侧: 搜索框 (220px) + 筛选按钮
 *   - 内容区:
 *     1. 状态筛选行: 全部 | 已完成 | 待付款 | 退款中
 *     2. 右侧辅助筛选: 「最近7天」日期下拉 + 「全部课程」分类下拉
 *     3. 订单列表（保留原有 AdminOrderList 组件）
 *
 * Returns:
 *     element(React.ReactElement): 订单管理页面
 */
export function AdminOrdersClient() {
  const [refreshKey] = React.useState(0)
  const [keyword, setKeyword] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')

  /**
   * 订单状态筛选项
   * 与 Paper Design 规范对齐：全部 | 已完成 | 待付款 | 退款中
   *
   * TODO(high): 数量为硬编码占位值，需从 API 获取真实统计数据
   * 预留接口: GET /api/v1/admin/orders/stats → { total, completed, pending, refunding }
   * 接入后替换下方硬编码为 useQuery 获取的数据
   */
  const statusFilters: FilterItem[] = [
    { label: '全部', count: 1024, value: 'all' },
    { label: '已完成', count: 687, value: 'completed', color: 'success' },
    { label: '待付款', count: 156, value: 'pending', color: 'warning' },
    { label: '退款中', count: 23, value: 'refunding', color: 'rose' },
  ]

  return (
    <>
      <AdminPageHeader
        title="商城管理"
        tabs={<ShopTabBar activeTab="orders" />}
        actions={
          <ShopSearchInput
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索订单号..."
          />
        }
      />
      <ShopMainCard>
      {/* 状态筛选行 */}
      <div className="mb-4">
        <ShopStatusFilter
          filters={statusFilters}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* 订单列表 */}
      <AdminOrderList refreshKey={refreshKey} />
    </ShopMainCard>
    </>
  )
}
