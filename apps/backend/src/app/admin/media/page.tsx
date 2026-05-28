'use client'

import { Suspense } from 'react'
import { MediaLibrary } from '@/components/business/admin/media/media-library'

/**
Function: AdminMediaPage

Description: 后台媒体管理页面：提供全宽单列布局的媒体库管理
MediaLibrary 内部通过 AdminPageHeader 注入标题和工具栏到 CardHeader

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
