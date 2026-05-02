import { Metadata } from 'next'
import { DataManagementClient } from '@/components/business/admin/data-management/data-management-client'

export const metadata: Metadata = {
  title: '数据管理',
  description: '数据库备份、文件备份与恢复管理',
}

export default function DataManagementPage() {
  return <DataManagementClient />
}
