'use client'

/**
 * File: delete-confirm-dialog.tsx
 * Description: 删除确认对话框，显示媒体引用详情
 */

import { AlertTriangle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import type { AdminMediaAssetReference } from '@/contracts/dtos/admin/media-assets.dto'

/**
 * Function: DeleteConfirmDialog
 *
 * Description: 删除确认对话框组件
 *
 * Parameters:
 *    open(boolean): 是否打开对话框
 *    onOpenChangeAction(function): 打开状态变化回调
 *    asset(AdminMediaAsset, optional): 待删除的媒体资产
 *    references(AdminMediaAssetReference[]): 引用列表
 *    onConfirmAction(function): 确认删除回调
 *
 * Returns:
 *    element(React.ReactElement): 对话框 UI
 */
export function DeleteConfirmDialog({
  open,
  onOpenChangeAction,
  asset,
  references,
  onConfirmAction,
}: {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  asset: AdminMediaAsset | null
  references: AdminMediaAssetReference[]
  onConfirmAction: () => void
}) {
  const hasReferences = references.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasReferences ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : null}
            确认删除媒体？
          </DialogTitle>
          <DialogDescription>
            {hasReferences ? (
              <>
                该媒体正在被 <span className="font-bold text-destructive">{references.length}</span> 个地方使用
              </>
            ) : (
              <>
                您确定要删除媒体 <span className="font-semibold">{asset?.objectKey.split('/').pop()}</span> 吗？
                此操作无法撤销。
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasReferences && (
          <div className="py-4">
            <p className="text-sm font-medium mb-2">引用详情：</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/20 bg-muted/5 p-2">
              <ul className="space-y-1">
                {references.map((ref) => (
                  <li
                    key={ref.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-background hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{ref.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{ref.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChangeAction(false)}
          >
            取消
          </Button>
          <Button
            variant={hasReferences ? "destructive" : "solid"}
            onClick={onConfirmAction}
          >
            {hasReferences ? '仍要删除' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
