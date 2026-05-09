'use client'

import * as React from 'react'
import { Loader2, Hash, DollarSign, User, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils/date'
import { CopyCell } from '@/components/business/admin/shared/copy-cell'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminSettlement } from '@/plugins/promotion/contracts/settlements.dto'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'

function getSettlementStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'pending' | 'settled' | 'failed' }> = {
    pending: { label: '处理中', status: 'pending' },
    processed: { label: '已结算', status: 'settled' },
    failed: { label: '失败', status: 'failed' },
  }
  const item = config[status] || { label: status, status: 'pending' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

function getCommissionStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided' }> = {
    frozen: { label: '冻结', status: 'frozen' },
    payable: { label: '可结算', status: 'payable' },
    settling: { label: '结算中', status: 'settling' },
    settled: { label: '已结算', status: 'settled' },
    failed: { label: '失败', status: 'failed' },
    voided: { label: '已作废', status: 'voided' },
  }
  const item = config[status] || { label: status, status: 'pending' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

const commissionColumns: ColumnDef<AdminCommissionRecord>[] = [
  {
    accessorKey: 'orderId',
    header: '订单号',
    size: 192,
    cell: ({ row }) => <CopyCell value={row.original.orderId} label="订单号" />,
  },
  {
    accessorKey: 'promoter',
    header: '推广者',
    size: 192,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.promoterUsername ?? '-'}</div>
          <CopyCell value={row.original.promoterUserId ?? ''} label="推广者 ID" />
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => getCommissionStatusBadge(row.original.status),
  },
  {
    accessorKey: 'commissionAmount',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <DollarSign className="h-4 w-4" />
        佣金金额
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-mono font-semibold text-success">
          ¥{Number(row.original.commissionAmount).toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground">比例 {Number(row.original.rate) * 100}%</div>
      </div>
    ),
  },
]

interface AdminSettlementDetailDialogProps {
  settlementId: string | null
  open: boolean
  onClose: () => void
}

/**
Function: AdminSettlementDetailDialog

Description: 结算详情对话框：显示结算单基本信息和关联的佣金记录列表

Parameters:
    settlementId(string | null): 结算单 ID
    open(boolean): 对话框是否打开
    onClose(function): 关闭对话框回调
    onSuccess(function): 成功操作后回调（可选）

Returns:
    element(React.ReactElement): 详情对话框 UI
*/
export function AdminSettlementDetailDialog({ settlementId, open, onClose }: AdminSettlementDetailDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [settlement, setSettlement] = React.useState<AdminSettlement | null>(null)
  const [commissions, setCommissions] = React.useState<AdminCommissionRecord[]>([])

  const load = React.useCallback(async () => {
    if (!settlementId) return
    setLoading(true)
    try {
      // 并行加载结算单和佣金记录
      const [settlementRes, commissionsRes] = await Promise.all([
        fetch(`/api/v1/admin/settlements/${settlementId}`, { credentials: 'include' }),
        fetch(`/api/v1/admin/settlements/${settlementId}/commissions`, { credentials: 'include' }),
      ])

      if (!settlementRes.ok || !commissionsRes.ok) {
        toast({ title: '加载失败', description: '网络错误', variant: 'destructive' })
        return
      }

      const settlementJson = (await settlementRes.json()) as ApiResponse<{ settlement: AdminSettlement | null }>
      const commissionsJson = (await commissionsRes.json()) as ApiResponse<{ items: AdminCommissionRecord[] }>

      if (settlementJson.success && settlementJson.data) {
        setSettlement(settlementJson.data.settlement)
      }

      if (commissionsJson.success && commissionsJson.data) {
        setCommissions(commissionsJson.data.items)
      }
    } catch {
      toast({ title: '加载失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [settlementId, toast])

  React.useEffect(() => {
    if (open && settlementId) {
      void load()
    }
  }, [open, settlementId, load])

  // 当对话框关闭时清空数据
  const handleClose = React.useCallback(() => {
    setSettlement(null)
    setCommissions([])
    onClose()
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            结算单详情
          </DialogTitle>
          <DialogDescription>查看结算单的详细信息和关联的佣金记录</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : settlement ? (
          <div className="flex-1 overflow-auto">
            {/* 结算单基本信息 */}
            <div className="mb-6 p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">结算 ID：</span>
                  <CopyCell value={settlement.id} label="结算 ID" className="inline-flex" />
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  {getSettlementStatusBadge(settlement.status)}
                </div>
                <div>
                  <span className="text-muted-foreground">金额：</span>
                  <span className="font-mono font-semibold text-success">
                    ¥{Number(settlement.totalAmount).toFixed(2)} {settlement.currencyCode}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">创建人：</span>
                  <CopyCell value={settlement.createdBy} label="创建人 ID" className="inline-flex" />
                </div>
                <div>
                  <span className="text-muted-foreground">创建时间：</span>
                  <span>{formatDateTime(settlement.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">处理时间：</span>
                  <span>{settlement.processedAt ? formatDateTime(settlement.processedAt) : '-'}</span>
                </div>
              </div>
            </div>

            {/* 关联的佣金记录 */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                关联的佣金记录（{commissions.length} 条）
              </h3>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无关联的佣金记录</div>
              ) : (
                <DataTable columns={commissionColumns} data={commissions} />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">未找到结算单信息</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
