/**
 * File: src/components/ui/avatar-selector.tsx
 * Description: 预设头像选择器组件
 */

'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import Image from 'next/image';

import { PRESET_AVATARS, type AvatarId } from '@/lib/constants/avatars';

import { cn } from '@/lib/utils';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

/**
 * AvatarSelector 组件属性
 */
export interface AvatarSelectorProps {
  /** 当前选中的头像 ID */
  value?: string;
  /** 头像选择变化回调 */
  onChange?: (avatarId: AvatarId) => void;
  /** 是否禁用选择 */
  disabled?: boolean;
}

/**
 * 预设头像选择器组件
 *
 * 提供一个 6 列网格布局的头像选择器，支持悬停效果、选中状态高亮和 Tooltip 提示
 *
 * Function: AvatarSelector
 *
 * Description: 头像选择器组件，展示所有预设头像并支持选择交互
 *
 * Parameters:
 *   props(AvatarSelectorProps): 组件属性对象
 *
 * Returns:
 *   JSX.Element: 头像选择器 UI
 */
export function AvatarSelector({ value, onChange, disabled = false }: AvatarSelectorProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {PRESET_AVATARS.map((avatar) => {
          const isSelected = value === avatar.id;

          return (
            <Tooltip key={avatar.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => !disabled && onChange?.(avatar.id)}
                  disabled={disabled}
                  className={cn(
                    'group relative aspect-square rounded-lg border-2 transition-all duration-200',
                    'hover:scale-110 hover:shadow-lg',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    {
                      'border-primary bg-primary/10': isSelected,
                      'border-border bg-card hover:border-primary/50': !isSelected,
                      'cursor-not-allowed opacity-50': disabled,
                      'cursor-pointer': !disabled,
                    }
                  )}
                  aria-label={`选择 ${avatar.name}`}
                  aria-pressed={isSelected}
                >
                  {/* 本地头像 */}
                  <span className="flex h-full items-center justify-center">
                    <Image
                      src={avatar.src}
                      alt={avatar.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain"
                      unoptimized
                    />
                  </span>

                  {/* 选中标记 */}
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{avatar.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
