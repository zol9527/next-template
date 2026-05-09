'use client'

import * as React from 'react'
import { Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

/**
 * Type: PermissionDeniedModalProps
 *
 * Description: 权限不足弹窗组件属性
 *
 * Properties:
 *     open(boolean): 是否打开弹窗
 *     onOpenChange((open: boolean) => void): 弹窗状态变化回调
 *     resourceName(string): 需要权限的资源名称（如 "用户管理"）
 *     requiredPermission(string): 需要的权限码（如 "users.read"）
 */
interface PermissionDeniedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceName: string
}

/**
 * Function: PermissionDeniedModal
 *
 * Description: 权限不足提示弹窗组件，当用户尝试访问无权限的页面时显示
 *
 * Parameters:
 *     props(PermissionDeniedModalProps): 组件属性
 *
 * Returns:
 *     React.ReactElement: 权限不足弹窗组件
 *
 * Features:
 *     - 显示锁定图标
 *     - 说明所需的权限
 *     - 引导用户联系管理员
 */
export function PermissionDeniedModal({
  open,
  onOpenChange,
  resourceName,
}: PermissionDeniedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" showCloseButton={false}>
        {/* 锁定图标 */}
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
        </div>

        {/* 标题和描述 */}
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-semibold">权限不足</DialogTitle>
          <DialogDescription className="mt-2 text-foreground/70">
            您没有访问 <span className="font-medium text-foreground">{resourceName}</span> 的权限
          </DialogDescription>
        </DialogHeader>

        {/* 提示信息 */}
        <div className="mt-4 rounded-lg bg-info/10 p-4">
          <p className="text-sm text-info">
            如需访问此功能，请联系系统管理员申请相应权限。
          </p>
        </div>

        {/* 关闭按钮 */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            我知道了
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Function: usePermissionDeniedModal
 *
 * Description: 权限不足弹窗 Hook，提供弹窗状态管理和显示方法
 *
 * Returns:
 *     PermissionDeniedModalResult: 弹窗状态和控制方法
 *
 * Properties:
 *     isOpen(boolean): 弹窗是否打开
 *     show((resource: string, permission: string) => void): 显示弹窗
 *     hide(() => void): 隐藏弹窗
 */
interface PermissionDeniedModalResult {
  isOpen: boolean
  show: (resourceName: string, requiredPermission: string) => void
  hide: () => void
  modalProps: {
    open: boolean
    onOpenChange: (open: boolean) => void
    resourceName: string
  }
}

export function usePermissionDeniedModal(): PermissionDeniedModalResult {
  const [isOpen, setIsOpen] = React.useState(false)
  const [resourceName, setResourceName] = React.useState('')

  const show = (resource: string, _permission: string) => {
    setResourceName(resource)
    setIsOpen(true)
  }

  const hide = () => {
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  return {
    isOpen,
    show,
    hide,
    modalProps: {
      open: isOpen,
      onOpenChange: handleOpenChange,
      resourceName,
    },
  }
}
