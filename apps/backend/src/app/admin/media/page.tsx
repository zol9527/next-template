'use client'

import { AdminMediaUploader } from '@/components/business/admin/media/admin-media-uploader'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'

/**
Function: AdminMediaPage

Description: 后台媒体管理页面：提供直传上传、预览、管理与分页列表

Parameters:

Returns:
 	element(React.ReactElement): 媒体管理页面
*/
export default function AdminMediaPage() {
  return (
    <AdminPageLayout>
      <AdminMediaUploader />
    </AdminPageLayout>
  )
}
