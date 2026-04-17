'use client'

import * as React from 'react'
import { Loader2, CheckCircle2, FileText, ShoppingCart, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

export interface CommissionDetail {
  id: string
  orderNo: string | null
  orderId: string
  promoterUsername: string | null
  commissionAmount: string
}

const columns: ColumnDef<CommissionDetail>[] = [
  {
    accessorKey: 'orderNo',
    header: '订单号',
    cell: ({ row }) => row.original.orderNo || row.original.orderId,
  },
  {
    accessorKey: 'promoterUsername',
    header: '推广员',
    cell: ({ row }) => row.original.promoterUsername || '-',
  },
  {
    accessorKey: 'commissionAmount',
    header: '佣金金额',
    cell: ({ row }) => `¥${Number(row.original.commissionAmount).toFixed(2)}`,
  },
]

interface AdminSettlementConfirmDialogProps {
  open: boolean
  onClose: () => void
  commissions: CommissionDetail[]
  commissionIds: string[]
  onSuccess?: () => void
}

/**
Function: AdminSettlementConfirmDialog

Description: 结算确认对话框：显示即将结算的佣金信息，确认后创建结算单

Parameters:
    open(boolean): 对话框是否打开
    onClose(function): 关闭对话框回调
    commissions(CommissionDetail[]): 要结算的佣金记录详情列表
    commissionIds(string[]): 要结算的佣金记录 ID 列表
    onSuccess(function): 结算成功后回调

Returns:
    element(React.ReactElement): 结算确认对话框 UI
*/
export function AdminSettlementConfirmDialog({
  open,
  onClose,
  commissions,
  commissionIds,
  onSuccess,
}: AdminSettlementConfirmDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)

  const totalAmount = React.useMemo(() => {
    return commissions.reduce((sum, item) => sum + Number(item.commissionAmount), 0)
  }, [commissions])

  const handleSubmit = React.useCallback(async () => {
    if (commissionIds.length === 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/settlements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commissionRecordIds: commissionIds }),
      })

      if (!res.ok) {
        const msg = await readApiErrorMessage(res)
        toast({ title: '结算失败', description: msg, variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<{ settlement: { id: string } }>
      if (!json.success) {
        toast({ title: '结算失败', description: json.error.message, variant: 'destructive' })
        return
      }

      toast({
        title: '结算成功',
        description: `已成功结算 ${commissionIds.length} 笔佣金，合计 ¥${totalAmount.toFixed(2)}`,
        variant: 'default',
      })

      onSuccess?.()
      onClose()
    } catch {
      toast({ title: '结算失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [commissionIds, totalAmount, toast, onSuccess, onClose])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            确认结算
          </DialogTitle>
          <DialogDescription>
            请确认以下佣金信息，确认后将创建结算单并将佣金状态更新为「已结算」。
          </DialogDescription>
        </DialogHeader>

        {commissions.length > 0 ? (
          <div className="mt-4 space-y-4">
            {/* 统计信息 */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">佣金笔数</div>
                      <div className="text-xl font-bold">{commissions.length} 笔</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">结算总额</div>
                      <div className="text-xl font-bold text-success">¥{totalAmount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">涉及订单</div>
                      <div className="text-xl font-bold">{new Set(commissions.map((c) => c.orderId)).size} 个</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 佣金列表 */}
            <DataTable columns={columns} data={commissions} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            暂无佣金数据
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || commissions.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                结算中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                确认结算
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
