'use client'

import { LogViewer } from '@/components/business/admin/logs'

/**
 * Component: LogsTab
 *
 * Description: 日志管理 Tab 面板
 * 复用现有的 LogViewer 组件，该组件内部包含:
 * - 工具栏 (刷新、自动刷新、级别筛选)
 * - 日志文件信息
 * - 日志列表 (支持展开详情)
 */
export function LogsTab() {
  return (
    <div className="animate-in fade-in duration-300">
      <LogViewer />
    </div>
  )
}
