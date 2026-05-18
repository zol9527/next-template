'use client'

import { Suspense } from 'react'
import { MediaLibrary } from '@/components/business/admin/media/media-library'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'

/**
Function: AdminMediaPage

Description: 后台媒体管理页面：提供全宽单列布局的媒体库管理

Returns:
 	element(React.ReactElement): 媒体管理页面
*/
export default function AdminMediaPage() {
  return (
    <AdminPageLayout>
      <Suspense>
        <MediaLibrary />
      </Suspense>
    </AdminPageLayout>
  )
}
