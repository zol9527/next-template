'use client'

import * as React from 'react'
import { Shield, Users } from 'lucide-react'

/**
 * 角色卡片组件
 *
 * 卡片内容：
 * - 顶部: 彩色图标圆 + 角色名(bold) + "高危"红色标签(可选)
 * - 描述: 一行灰色文字
 * - 底部: "X 项权限"(左, 橙色) + "Y 人"(右, 灰色)
 */

interface RoleCardProps {
  id: string
  name: string
  description?: string | null
  grantCount?: number
  userCount?: number
  isAdmin?: boolean
  onClick?: () => void
}

/** 角色名称 → 图标底色映射 */
const ROLE_COLORS: Record<string, string> = {
  admin: '#FFF3EB',
  超级管理: '#FFF3EB',
  管理员: '#EBF2FF',
  教务: '#FFF8EB',
  财务: '#EBFFF3',
  班主任: '#F3EBFF',
  讲师: '#EBFFFE',
}

/** 角色名称 → 图标颜色映射 */
const ROLE_ICON_COLORS: Record<string, string> = {
  admin: 'var(--ds-accent, #F54E00)',
  超级管理: 'var(--ds-accent, #F54E00)',
  管理员: '#3B82F6',
  教务: '#EAB308',
  财务: '#22C55E',
  班主任: '#8B5CF6',
  讲师: '#06B6D4',
}

/** 根据角色名称匹配图标底色，未命中时返回默认灰色 */
function getRoleBgColor(name: string): string {
  for (const [key, color] of Object.entries(ROLE_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#F5F5F5'
}

/** 根据角色名称匹配图标颜色，未命中时返回默认灰色 */
function getRoleIconColor(name: string): string {
  for (const [key, color] of Object.entries(ROLE_ICON_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color
  }
  return 'var(--fg-muted, #6B6960)'
}

export function RoleCard({
  name,
  description,
  grantCount = 0,
  userCount = 0,
  isAdmin = false,
  onClick,
}: RoleCardProps) {
  const bgColor = getRoleBgColor(name)
  const iconColor = getRoleIconColor(name)

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-4 p-5 rounded-xl border border-[var(--border)] bg-white hover:shadow-md hover:border-[var(--ds-accent,#F54E00)]/20 transition-all duration-200 text-left w-full"
    >
      {/* 顶部: 图标 + 角色名 */}
      <div className="flex items-start gap-3">
        {/* 彩色图标圆 */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Shield className="w-5 h-5" style={{ color: iconColor }} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--fg,#26251E)] truncate">
              {description || name}
            </span>
            {isAdmin && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--rose,#CF2D56)]/10 text-[var(--rose,#CF2D56)] shrink-0">
                高危
              </span>
            )}
          </div>
          {description && name !== description && (
            <span className="text-xs text-[var(--fg-faint,#9C9A91)] truncate mt-0.5">
              {name}
            </span>
          )}
        </div>
      </div>

      {/* 底部: 权限数 + 用户数 */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--ds-accent,#F54E00)]">
          {grantCount} 项权限
        </span>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-[var(--fg-faint,#9C9A91)]" />
          <span className="text-xs text-[var(--fg-muted,#6B6960)]">
            {userCount} 人
          </span>
        </div>
      </div>
    </button>
  )
}
