'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MfaRolePolicyDto, MfaRolePolicyType } from '@/contracts/dtos/admin/mfa-settings.dto'

const POLICY_OPTIONS: Record<string, { label: string; description: string; color: string }> = {
  inherit: { label: '继承全局', description: '使用全局 MFA 设置', color: 'text-info' },
  force: { label: '强制启用', description: '该角色必须启用 MFA', color: 'text-success' },
}

interface MfaRolePolicyEditDialogProps {
  policy: MfaRolePolicyDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (roleName: string, policy: MfaRolePolicyType, allowExemptions: boolean) => void
  isSaving: boolean
}

/**
 * Function: MfaRolePolicyEditDialog
 *
 * Description: MFA 角色策略编辑对话框，包含策略选择和豁免开关
 *
 * Parameters:
 *     policy(MfaRolePolicyDto | null): 当前编辑的策略，null 时关闭
 *     open(boolean): 是否打开
 *     onOpenChange(function): 打开状态回调
 *     onSave(function): 保存回调
 *     isSaving(boolean): 是否正在保存
 *
 * Returns:
 *     element(React.ReactElement): 编辑对话框 UI
 */
export function MfaRolePolicyEditDialog({
  policy,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: MfaRolePolicyEditDialogProps) {
  const [editedPolicy, setEditedPolicy] = React.useState<MfaRolePolicyType>('inherit')
  const [editedExemptions, setEditedExemptions] = React.useState(false)

  // 当 policy 变化时同步本地状态
  React.useEffect(() => {
    if (policy) {
      setEditedPolicy(policy.policy)
      setEditedExemptions(policy.allowExemptions)
    }
  }, [policy])

  const hasChanges =
    policy !== null &&
    (editedPolicy !== policy.policy || editedExemptions !== policy.allowExemptions)

  const handleSave = () => {
    if (!policy || !hasChanges) return
    onSave(policy.roleName, editedPolicy, editedExemptions)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {policy?.roleName.charAt(0).toUpperCase()}
              </span>
            </div>
            编辑角色策略 — {policy?.roleName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* 策略选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">MFA 策略</label>
            <Select
              value={editedPolicy}
              onValueChange={(v: MfaRolePolicyType) => setEditedPolicy(v)}
              disabled={isSaving}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(POLICY_OPTIONS).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold', config.color)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {config.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 允许豁免开关 */}
          <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/5 p-3">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">允许豁免</span>
              <p className="text-xs text-foreground/50">
                开启后该角色成员可申请 MFA 豁免
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Switch
                checked={editedExemptions}
                onCheckedChange={setEditedExemptions}
                disabled={isSaving}
                color="primary"
              />
              <span className="text-xs font-medium text-foreground/70 w-8">
                {editedExemptions ? '允许' : '禁止'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
