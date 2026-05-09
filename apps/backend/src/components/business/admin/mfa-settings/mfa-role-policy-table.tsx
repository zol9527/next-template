'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Info } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { useToast } from '@/components/ui/toast'
import type { MfaRolePolicyDto, MfaRolePolicyType } from '@/contracts/dtos/admin/mfa-settings.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { getMfaRolePolicyColumns, type MfaRolePolicyRow } from './mfa-role-policy-columns'
import { MfaRolePolicyEditDialog } from './mfa-role-policy-edit-dialog'

/**
 * Type: MfaRolePolicyTableProps
 *
 * Description: MFA 角色策略表格组件属性
 *
 * Properties:
 *     policies(MfaRolePolicyDto[]): 角色 MFA 策略列表
 *     availableRoles(Array<{name: string, description?: string}>): 可用角色列表
 */
export interface MfaRolePolicyTableProps {
  policies: MfaRolePolicyDto[]
  availableRoles: Array<{ name: string; description?: string }>
}

/**
 * Function: MfaRolePolicyTable
 *
 * Description: MFA 角色策略表格组件，展示角色策略并通过弹窗编辑
 *
 * Parameters:
 *     props(MfaRolePolicyTableProps): 组件属性
 *
 * Returns:
 *     component(React.ReactElement): 角色策略表格组件
 */
export function MfaRolePolicyTable({ policies, availableRoles }: MfaRolePolicyTableProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 编辑弹窗状态
  const [selectedPolicy, setSelectedPolicy] = React.useState<MfaRolePolicyDto | null>(null)

  // 将 policies 与 availableRoles 合并为带描述的行数据
  const tableRows: MfaRolePolicyRow[] = React.useMemo(
    () =>
      policies.map((p) => ({
        ...p,
        roleDescription: availableRoles.find((r) => r.name === p.roleName)?.description,
      })),
    [policies, availableRoles]
  )

  // 列定义（含编辑按钮）
  const columns = React.useMemo(
    () => getMfaRolePolicyColumns({ onEdit: setSelectedPolicy }),
    []
  )

  // 批量更新 Mutation
  const updateMutation = useMutation({
    mutationFn: async (
      data: Array<{
        roleName: string
        policy: MfaRolePolicyType
        allowExemptions: boolean
      }>
    ) => {
      const res = await fetch('/api/v1/admin/mfa/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ policies: data }),
      })

      const json = (await res.json()) as ApiResponse<MfaRolePolicyDto[]>
      if (!res.ok || !json.success) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'mfa', 'settings'] })
      setSelectedPolicy(null)
      toast({
        title: '保存成功',
        description: '角色 MFA 策略已更新',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 单行保存处理
  const handleSave = (
    roleName: string,
    policy: MfaRolePolicyType,
    allowExemptions: boolean
  ) => {
    updateMutation.mutate([{ roleName, policy, allowExemptions }])
  }

  return (
    <div className="space-y-6">
      {/* 表格头部 */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold flex items-center gap-2.5">
            <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-1.5 shadow-lg">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            角色策略配置
          </h3>
          <p className="text-sm text-foreground/60 max-w-xl">
            为不同角色配置独立的 MFA 策略。角色策略优先级高于全局设置
          </p>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-info/5 to-info/10 border border-info/15">
        <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
        <p className="text-xs text-info leading-relaxed">
          <span className="font-semibold">优先级说明：</span>角色策略优先级高于全局设置。如果角色设置为&quot;强制启用&quot;，则无论全局设置如何，该角色成员都必须启用 MFA。
        </p>
      </div>

      {/* 数据表格 */}
      <div data-testid="role-policy-table">
        <DataTable columns={columns} data={tableRows} />
      </div>

      {/* 编辑弹窗 */}
      <MfaRolePolicyEditDialog
        policy={selectedPolicy}
        open={!!selectedPolicy}
        onOpenChange={(open) => { if (!open) setSelectedPolicy(null) }}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </div>
  )
}
