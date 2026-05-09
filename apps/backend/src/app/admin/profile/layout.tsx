// src/app/admin/profile/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '个人资料 - 管理后台',
  description: '管理您的个人信息、账户安全和多因素认证设置',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
