'use client'

import * as React from 'react'
import { FileCheck, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { AgreementView } from './agreement-view'
import { useAgreement } from './use-agreement'
import type { AgreementType } from '@/contracts/dtos/admin/site-config.dto'

/**
 * Function: AgreementSection
 *
 * Description: 用户资料页面的协议查看区域
 *
 * Returns:
 *     element(React.ReactElement): 协议展示区域 UI
 */
export function AgreementSection() {
  const [selectedAgreement, setSelectedAgreement] = React.useState<AgreementType | null>(null)

  const agreements: { type: AgreementType; label: string; description: string }[] = [
    { type: 'USER_AGREEMENT', label: '用户协议', description: '查看平台用户服务协议' },
    { type: 'PRIVACY_POLICY', label: '隐私政策', description: '了解我们如何保护您的隐私' },
    { type: 'ABOUT_US', label: '关于我们', description: '了解更多关于平台的信息' },
  ]

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            平台协议
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {agreements.map((agreement) => (
              <AgreementCard
                key={agreement.type}
                agreement={agreement}
                onClick={() => setSelectedAgreement(agreement.type)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 协议详情对话框 */}
      <Dialog
        open={!!selectedAgreement}
        onOpenChange={(open) => !open && setSelectedAgreement(null)}
      >
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          {selectedAgreement && (
            <AgreementDialogContent type={selectedAgreement} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Function: AgreementCard
 *
 * Description: 单个协议卡片
 */
function AgreementCard({
  agreement,
  onClick,
}: {
  agreement: { type: AgreementType; label: string; description: string }
  onClick: () => void
}) {
  const { data, isLoading } = useAgreement(agreement.type)

  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl border border-border/10 bg-card/20 backdrop-blur-xl hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {agreement.label}
            </h3>
            {isLoading ? (
              <Skeleton className="h-4 w-12" />
            ) : data ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                v{data.version}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {agreement.description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  )
}

/**
 * Function: AgreementDialogContent
 *
 * Description: 协议详情对话框内容
 */
function AgreementDialogContent({ type }: { type: AgreementType }) {
  const { data, isLoading, error, refetch } = useAgreement(type)

  return (
    <AgreementView
      agreement={data ?? null}
      loading={isLoading}
      error={error?.message ?? null}
      onRetry={() => refetch()}
    />
  )
}
