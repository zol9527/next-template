import { UserShell } from '@/components/business/user/user-shell'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <UserShell>{children}</UserShell>
}
