/**
 * File: progress.tsx
 * Description: Progress 组件语义化封装，包装 shadcn/ui 基础 Progress
 */

'use client'
import { Progress as BaseProgress } from '@/components/base/progress'
import type { ProgressProps as BaseProgressProps } from '@/components/base/progress'

export type ProgressProps = BaseProgressProps

export const Progress = BaseProgress
