'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table/index'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCommissionRule, AdminCommissionRuleListResponse } from '@/plugins/promotion/contracts/commission-rules.dto'

export function AdminCommissionRuleList(props: { refreshKey: number; onRefresh: () => void }) {
  const { toast } = useToast()
  const [items, setItems] = React.useState<AdminCommissionRule[]>([])
  const [_isLoading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/commission-rules', { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<AdminCommissionRuleListResponse>
      if (json.success) {
        setItems(json.data.items)
      } else {
        toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '加载失败', description: '网络错误', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    void load()
  }, [load, props.refreshKey])

  async function createRule() {
    const scope = window.prompt('请输入范围 (global/product/category):', 'global')
    if (!scope) return
    const scopeId = scope === 'global' ? null : window.prompt('请输入范围 ID (UUID):')
    const rate = window.prompt('请输入佣金比例 (如 0.1):', '0.1')
    if (!rate) return

    try {
      const res = await fetch('/api/v1/admin/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scopeId, rate }),
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>
      if (json.success) {
        toast({ title: '创建成功' })
        props.onRefresh()
      } else {
        toast({ title: '创建失败', description: json.error.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '创建失败', description: '网络错误', variant: 'destructive' })
    }
  }

  async function deleteRule(id: string) {
    if (!window.confirm('确定删除该规则吗？')) return

    try {
      const res = await fetch(`/api/v1/admin/commission-rules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>
      if (json.success) {
        toast({ title: '删除成功' })
        props.onRefresh()
      } else {
        toast({ title: '删除失败', description: json.error.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
    }
  }

  // 列定义
  const columns = React.useMemo<ColumnDef<AdminCommissionRule>[]>(
    () => [
      { accessorKey: 'scope', header: '范围' },
      {
        accessorKey: 'scopeId',
        header: '范围 ID',
        cell: ({ row }) => (
          <span className="text-xs font-mono">{row.original.scopeId || '-'}</span>
        ),
      },
      {
        id: 'rate',
        header: '比例',
        cell: ({ row }) => `${(Number(row.original.rate) * 100).toFixed(2)}%`,
      },
      {
        accessorKey: 'activeFrom',
        header: '生效时间',
        cell: ({ row }) => <span className="text-xs">{row.original.activeFrom}</span>,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => deleteRule(row.original.id)}>
              删除
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">规则列表</h3>
        <Button size="sm" onClick={createRule}>新增规则</Button>
      </div>
      <DataTable columns={columns} data={items} />
    </div>
  )
}
