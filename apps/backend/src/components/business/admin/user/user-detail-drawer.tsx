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
      <SheetContent
        className="w-[480px] max-w-[90vw] p-0 flex flex-col"
        style={{ boxShadow: 'rgba(38,37,30,0.1) -4px 0px 24px' }}
      >
        {/* Drawer 头部 — 固定 60px 高度 */}
        <div className="flex items-center justify-between h-[60px] px-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {/* 头像 — 白色文字 11px */}
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              {/* 名字 + 角色 badge */}
              <div className="flex items-center gap-2">
                <SheetTitle
                  className="text-[15px] font-semibold text-[var(--fg,#26251E)]"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {displayName}
                </SheetTitle>
                {/* 角色 badge */}
                {'roles' in user && Array.isArray((user as Record<string, unknown>).roles) && ((user as Record<string, unknown>).roles as { name: string }[]).length > 0 && (
                  <span
                    className="rounded-full py-0.5 px-2 text-[11.5px] font-medium"
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      backgroundColor: 'rgba(245,78,0,0.08)',
                      color: '#F54E00',
                    }}
                  >
                    {((user as Record<string, unknown>).roles as { name: string }[])[0].name}
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--fg-muted,#9C9A91)]">
                {user.email || user.phone || '—'}
              </span>
            </div>
          </div>
          {/* 关闭按钮 — 34×34 */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-[18px] w-[18px]" style={{ color: '#6B6960' }} />
          </button>
        </div>

        {/* Tab 栏 — pill 形状，无底边框 */}
        <div className="flex items-center gap-[3px] pt-3 px-6">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'py-1.5 px-3.5 rounded-full text-[12.5px] font-medium transition-all duration-200',
                activeTab === tab.value
                  ? 'text-white'
                  : 'bg-white text-[#6B6960]'
              )}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                ...(activeTab === tab.value
                  ? { backgroundColor: '#F54E00' }
                  : { border: '1px solid rgba(38,37,30,0.15)' }),
              }}
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
