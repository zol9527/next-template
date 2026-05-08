'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { BackupHistoryTab } from './backup-history-tab'
import { DatabaseBackupTab } from './database-backup-tab'
import { DataImportTab } from './data-import-tab'
import { FileBackupTab } from './file-backup-tab'

export function DataManagementClient() {
  return (
    <AdminPageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">数据管理</h1>
          <p className="text-sm text-muted-foreground">数据库备份、文件备份、数据导入与恢复管理</p>
        </div>

        <Tabs defaultValue="database" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="database">数据库备份</TabsTrigger>
            <TabsTrigger value="file">文件备份</TabsTrigger>
            <TabsTrigger value="import">数据导入</TabsTrigger>
            <TabsTrigger value="history">备份历史</TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="flex flex-col gap-6">
            <DatabaseBackupTab />
          </TabsContent>

          <TabsContent value="file" className="flex flex-col gap-6">
            <FileBackupTab />
          </TabsContent>

          <TabsContent value="import" className="flex flex-col gap-6">
            <DataImportTab />
          </TabsContent>

          <TabsContent value="history" className="flex flex-col gap-6">
            <BackupHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageLayout>
  )
}
