'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'
import { UserBasicInfoTab } from './user-basic-info-tab'
import { UserRoleAssignmentTab } from './user-role-assignment-tab'
import { UserPermissionDetailTab } from './user-permission-detail-tab'

/**
 * 用户详情 Drawer
 *
 * 480px 宽，右侧滑入
 * 包含 3 个 Tab：基本信息 | 角色分配 | 权限详情
 */

type DetailTab = 'basic' | 'roles' | 'permissions'

interface UserDetailDrawerProps {
  user: AdminUserListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevoke: () => void
  onUnlock: () => void
  onEdit: () => void
  isUnlocking: boolean
}

const TAB_CONFIG: { value: DetailTab; label: string }[] = [
  { value: 'basic', label: '基本信息' },
  { value: 'roles', label: '角色分配' },
  { value: 'permissions', label: '权限详情' },
]

export function UserDetailDrawer({
  user,
  open,
  onOpenChange,
  onRevoke,
  onUnlock,
  onEdit,
  isUnlocking,
}: UserDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<DetailTab>('basic')

  // 用户切换时重置 Tab
  React.useEffect(() => {
    if (open) setActiveTab('basic')
  }, [open])

  if (!user) return null

  const displayName = user.nickname || user.username || '未设置'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-[90vw] p-0 flex flex-col" style={{ borderRadius: '16px 0 0 16px' }}>
        {/* Drawer 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {/* 头像 */}
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--ds-accent,#F54E00)] shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <SheetTitle className="text-sm font-semibold text-[var(--fg,#26251E)]">
                {displayName}
              </SheetTitle>
              <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
                {user.email || user.phone || '—'}
              </span>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
          </button>
        </div>

        {/* Tab 栏 */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--border)]">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                activeTab === tab.value
                  ? 'bg-[var(--ds-accent,#F54E00)] text-white'
                  : 'text-[var(--fg-muted,#6B6960)] hover:bg-[var(--surface)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {activeTab === 'basic' && (
              <UserBasicInfoTab
                user={user}
                onRevoke={onRevoke}
                onUnlock={onUnlock}
                onEdit={onEdit}
                isUnlocking={isUnlocking}
              />
            )}
            {activeTab === 'roles' && user && (
              <UserRoleAssignmentTab userId={user.id} />
            )}
            {activeTab === 'permissions' && user && (
              <UserPermissionDetailTab userId={user.id} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
