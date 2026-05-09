'use client'

import * as React from 'react'
import { Loader2, Plus, DollarSign, Users, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCreateSettlementResponse } from '@/plugins/promotion/contracts/settlements.dto'
import { AdminCommissionList } from './admin-commission-list'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

interface AdminSettlementCreateDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
Function: AdminSettlementCreateDialog

Description: 创建结算单对话框：从佣金列表选择，支持搜索、预览总金额

Parameters:
    open(boolean): 对话框是否打开
    onClose(function): 关闭对话框回调
    onSuccess(function): 创建成功后回调（可选）

Returns:
    element(React.ReactElement): 创建结算单对话框 UI
*/
export function AdminSettlementCreateDialog({ open, onClose, onSuccess }: AdminSettlementCreateDialogProps) {
  const { toast } = useToast()

  const [step, setStep] = React.useState<'select' | 'confirm'>('select')
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [selectedTotal, setSelectedTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const handleClose = React.useCallback(() => {
    setStep('select')
    setSelectedIds([])
    setSelectedTotal(0)
    onClose()
  }, [onClose])

  const handleSelect = React.useCallback((ids: string[]) => {
    setSelectedIds(ids)
    setSelectedTotal(0)
    if (ids.length > 0) {
      // 直接计算总金额
      setStep('confirm')
    }
  }, [])

  const handleBack = React.useCallback(() => {
    setStep('select')
    setSelectedTotal(0)
  }, [])

  const handleSubmit = React.useCallback(async () => {
    if (selectedIds.length === 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/settlements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commissionRecordIds: selectedIds }),
      })

      if (!res.ok) {
        const msg = await readApiErrorMessage(res)
        toast({ title: '创建失败', description: msg, variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<AdminCreateSettlementResponse>
      if (!json.success) {
        toast({ title: '创建失败', description: json.error.message, variant: 'destructive' })
        return
      }

      toast({
        title: '创建成功',
        description: `结算单已创建，包含 ${selectedIds.length} 笔佣金，合计 ¥${formatAmount(selectedTotal)}`,
        variant: 'default',
      })

      setSelectedIds([])
      setSelectedTotal(0)
      onSuccess?.()
      handleClose()
    } catch {
      toast({ title: '创建失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedIds, selectedTotal, toast, onSuccess, handleClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {step === 'select' ? '创建结算单 - 选择佣金' : '创建结算单 - 确认'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? '从下方列表中选择要结算的佣金记录（仅显示可结算状态的记录）。'
              : `已选择 ${selectedIds.length} 笔佣金，请确认结算信息。`}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="mt-4">
            <AdminCommissionList
              refreshKey={0}
              onSelectForSettlement={handleSelect}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 结算预览信息 */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">佣金笔数</div>
                      <div className="text-xl font-bold">{selectedIds.length} 笔</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">结算总额</div>
                      <div className="text-xl font-bold text-success">¥{formatAmount(selectedTotal)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">结算状态</div>
                      <div className="text-xl font-bold">待处理</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              确认后将创建结算单，并将所选佣金状态更新为「结算中」。
              请在结算管理中对结算单进行后续处理。
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' ? (
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                返回选择
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || selectedIds.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    创建中…
                  </>
                ) : (
                  <>确认创建结算单</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
