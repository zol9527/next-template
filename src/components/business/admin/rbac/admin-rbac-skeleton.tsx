'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * File: admin-rbac-skeleton.tsx
 * Description: 权限管理页面的骨架屏加载组件
 */

/**
 * Function: AdminRbacSkeleton
 *
 * Description: 权限管理页面骨架屏，左右布局展示角色列表和权限配置的加载状态
 *
 * Returns:
 * 	element(React.ReactElement): 骨架屏组件
 */
export function AdminRbacSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
      {/* 左侧角色列表骨架 */}
      <Card className="md:col-span-4 border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-xl animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 右侧权限配置骨架 */}
      <Card className="md:col-span-8 border-none flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </CardHeader>
        <CardContent className="flex-1 space-y-8">
          {Array.from({ length: 3 }).map((_, moduleIndex) => (
            <div key={moduleIndex} className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-1 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-px flex-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, permIndex) => (
                  <Skeleton
                    key={permIndex}
                    className="h-20 w-full rounded-xl"
                    style={{ animationDelay: `${(moduleIndex * 6 + permIndex) * 50}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Function: RoleListItemSkeleton
 *
 * Description: 角色列表项骨架屏
 *
 * Returns:
 * 	element(React.ReactElement): 骨架屏组件
 */
export function RoleListItemSkeleton() {
  return (
    <div className="w-full px-4 py-3 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-12 shrink-0" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Function: PermissionCardSkeleton
 *
 * Description: 权限卡片骨架屏
 *
 * Returns:
 * 	element(React.ReactElement): 骨架屏组件
 */
export function PermissionCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border">
      <Skeleton className="h-4 w-4 mt-0.5 rounded" />
      <div className="space-y-1 flex-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}
