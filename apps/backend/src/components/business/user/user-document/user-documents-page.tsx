'use client'

import * as React from 'react'
import { FileText, Upload, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserDocuments } from './use-user-documents'
import { DocumentUploadCard } from './document-upload-card'
import { DocumentList } from './document-list'
import { AgreementSection } from '@/components/business/user/agreement/agreement-section'

export function UserDocumentsPage() {
  const {
    documents,
    documentsByType,
    stats,
    isLoading,
    isError,
    error,
  } = useUserDocuments()

  // 加载状态
  if (isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">正在加载文档资料...</p>
      </div>
    )
  }

  // 错误状态
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : '无法加载文档资料，请稍后重试'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            我的资料
          </h1>
          <p className="text-muted-foreground mt-1">
            管理您的证件资料，包括身份证、失业证明和医疗保险
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="flex gap-3">
          <div className="flex-1 sm:flex-none min-w-[120px] bg-primary/5 border border-primary/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-primary">{stats.uploaded}</div>
            <div className="text-xs text-muted-foreground mt-1">已上传</div>
          </div>
          <div className="flex-1 sm:flex-none min-w-[120px] bg-muted/5 border border-border/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
            <div className="text-xs text-muted-foreground mt-1">待上传</div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：上传卡片 */}
        <div className="lg:col-span-1">
          <DocumentUploadCard />
        </div>

        {/* 右侧：文档列表 */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                我的证件
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading && documents.length > 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <EmptyState />
              ) : (
                <DocumentList documentsByType={documentsByType} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 使用说明 */}
      <Card className="bg-muted/5 border-border/10">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            上传说明
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>仅支持 JPG、PNG、WebP 格式的图片文件</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>单个文件大小不能超过 10MB</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>每种证件类型只能上传一个文件，新上传会替换旧文件</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>请确保证件图片清晰、完整，信息可见</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 平台协议区域 */}
      <AgreementSection />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <div className="text-center max-w-xs">
        <h3 className="text-sm font-medium text-foreground mb-1">暂无证件资料</h3>
        <p className="text-xs text-muted-foreground">
          您尚未上传任何证件资料，请在左侧上传
        </p>
      </div>
    </div>
  )
}
