'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'
import type { MfaRolePolicyDto, MfaRolePolicyType } from '@/contracts/dtos/admin/mfa-settings.dto'

/** MFA 角色策略行数据（含角色描述） */
export interface MfaRolePolicyRow extends MfaRolePolicyDto {
  roleDescription?: string
}

interface MfaRolePolicyColumnsProps {
  onEdit: (policy: MfaRolePolicyDto) => void
}

const POLICY_DISPLAY: Record<MfaRolePolicyType, { label: string; className: string }> = {
  inherit: { label: '继承全局', className: 'bg-info/10 text-info border-info/30' },
  force: { label: '强制启用', className: 'bg-success/10 text-success border-success/30' },
}

/**
 * Function: getMfaRolePolicyColumns
 *
 * Description: 生成 MFA 角色策略表格列定义（只读展示 + 编辑操作）
 *
 * Parameters:
 *     props(MfaRolePolicyColumnsProps): 列操作回调
 *
 * Returns:
 *     columns(ColumnDef<MfaRolePolicyRow>[]): TanStack Table 列定义
 */
export function getMfaRolePolicyColumns({
  onEdit,
}: MfaRolePolicyColumnsProps): ColumnDef<MfaRolePolicyRow>[] {
  return [
    {
      accessorKey: 'roleName',
      header: '角色名称',
      size: 220,
      cell: ({ row }) => {
        const name = row.original.roleName
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium">{name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'roleDescription',
      header: '描述',
      size: 320,
      cell: ({ row }) => (
        <p className="text-xs text-foreground/60 leading-relaxed">
          {row.original.roleDescription || '无描述'}
        </p>
      ),
    },
    {
      accessorKey: 'policy',
      header: 'MFA 策略',
      size: 200,
      cell: ({ row }) => {
        const policy = row.original.policy
        const config = POLICY_DISPLAY[policy]
        if (!config) return <span>{policy}</span>
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'allowExemptions',
      header: '允许豁免',
      size: 160,
      cell: ({ row }) => {
        const allowed = row.original.allowExemptions
        return (
          <Badge
            variant="outline"
            className={
              allowed
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-neutral/10 text-neutral border-neutral/30'
            }
          >
            {allowed ? '允许' : '禁止'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 110,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        </div>
      ),
    },
  ]
}
