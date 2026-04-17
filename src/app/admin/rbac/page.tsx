import { AdminRbacManager } from '@/components/business/admin/rbac/admin-rbac-manager'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'

export default function AdminRbacPage() {
  return (
    <AdminPageLayout>
      <AdminRbacManager />
    </AdminPageLayout>
  )
}
