'use client'

import * as React from 'react'
import { DataManagementClient } from '@/components/business/admin/data-management/data-management-client'

/**
 * Component: DataManagementTab
 *
 * Description: 数据管理 Tab 面板
 * 复用现有的 DataManagementClient 组件，该组件内部包含:
 * - 数据库备份 Tab
 * - 文件备份 Tab
 * - 数据导入 Tab
 * - 备份历史 Tab
 */
export function DataManagementTab() {
  return (
    <div className="animate-in fade-in duration-300">
      <DataManagementClient />
    </div>
  )
}
