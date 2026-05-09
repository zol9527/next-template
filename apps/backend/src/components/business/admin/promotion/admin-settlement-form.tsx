'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCreateSettlementResponse } from '@/plugins/promotion/contracts/settlements.dto'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

function parseIds(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/g)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )
}

/**
Function: AdminSettlementForm

Description: 后台结算创建表单：输入佣金记录 ID 列表并提交创建结算单（服务端确保幂等与并发安全）

Parameters:

Returns:
    element(React.ReactElement): 创建结算单表单 UI
*/
export function AdminSettlementForm() {
  const { toast } = useToast()

  const [idsText, setIdsText] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    const ids = parseIds(idsText)
    if (ids.length === 0) {
      toast({ title: '参数错误', description: '请输入至少 1 个佣金记录 ID', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/settlements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commissionRecordIds: ids }),
      })

      if (!res.ok) {
        toast({ title: '创建结算失败', description: await readApiErrorMessage(res), variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<AdminCreateSettlementResponse>
      if (!json.success) {
        toast({ title: '创建结算失败', description: json.error.message, variant: 'destructive' })
        return
      }

      toast({
        title: '创建成功',
        description: `结算单 ${json.data.settlement.id}，总额 ${json.data.settlement.totalAmount} ${json.data.settlement.currencyCode}`,
        variant: 'default',
      })
      setIdsText('')
    } catch {
      toast({ title: '创建结算失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">创建结算</CardTitle>
        <p className="text-xs text-foreground/60">输入佣金记录 ID（用空格/逗号分隔）</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          value={idsText}
          onChange={(e) => setIdsText(e.target.value)}
          placeholder="commissionRecordId1, commissionRecordId2"
        />
        <div className="flex items-center gap-2">
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? '提交中…' : '创建结算单'}
          </Button>
          <Button type="button" variant="secondary" disabled={submitting} onClick={() => setIdsText('')}>
            清空
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
