/**
 * File: UserAvatar.tsx
 * Description: 用户头像显示组件
 */

'use client'

import * as React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/utils/avatar'

/**
 * Type: UserAvatarProps
 *
 * Description: 用户头像组件的 props
 *
 * Properties:
 *     username(string): 用户名
 *     avatarUrl(string): 头像图片 URL
 *     size(string): 头像尺寸
 *     className(string): 自定义样式类名
 */
export interface UserAvatarProps {
  username?: string
  avatarUrl?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Function: UserAvatar
 *
 * Description: 用户头像显示组件，支持图片或首字母显示
 *
 * Parameters:
 *     props(UserAvatarProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的头像组件
 *
 * Example:
 *     <UserAvatar username="张三" size="md" />
 */
export function UserAvatar({ username = '用户', avatarUrl, size = 'sm', className }: UserAvatarProps) {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const initials = username.slice(0, 2).toUpperCase()
  const safeSrc = getAvatarUrl({ avatarUrl, username })

  return (
    <Avatar className={cn(sizeMap[size], className)}>
      {safeSrc ? (
        <img src={safeSrc} alt={username} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
