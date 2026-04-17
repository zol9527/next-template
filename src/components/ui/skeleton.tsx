/**
 * File: skeleton.tsx
 * Description: Skeleton 组件语义化封装，包装 shadcn/ui 基础 Skeleton
 */

'use client'
import { Skeleton as BaseSkeleton } from '@/components/base/skeleton'

export type SkeletonProps = React.ComponentProps<typeof BaseSkeleton>

/**
 * Function: Skeleton
 *
 * Description: Skeleton 组件语义化封装，包装 shadcn/ui 基础 Skeleton
 *
 * Parameters:
 *     props(SkeletonProps): Skeleton 属性
 *
 * Returns:
 *     element(React.ReactElement): Skeleton UI
 */
export const Skeleton = BaseSkeleton
