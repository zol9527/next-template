'use client'

import { Suspense } from 'react'
import { MediaLibrary } from '@/components/business/admin/media/media-library'

/**
Function: AdminMediaPage

Description: 后台媒体管理页面：提供全宽单列布局的媒体库管理
MediaLibrary 直接渲染在 AdminShell 的 CardContent 中，无需额外容器包裹

Returns:
 	element(React.ReactElement): 媒体管理页面
*/
export default function AdminMediaPage() {
  return (
    <Suspense>
      <MediaLibrary />
    </Suspense>
  )
}
