import type { Metadata } from 'next'
import { PixelNavbar } from '@/components/business/blog/pixel-navbar'
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing'

export const metadata: Metadata = {
  title: '首页',
  description: '基于插件化架构的现代后台管理系统。支持 RBAC 权限控制、API 优先设计，按需启用业务模块。',
  alternates: {
    canonical: '/',
  },
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-(--color-landing-background)">
      <PixelNavbar />
      {children}
      <footer className="border-t-2 border-(--color-landing-border) px-6 py-8 text-center [font-family:var(--font-vt323)] text-lg text-(--color-landing-muted)">
        <PublicIcpFiling />
      </footer>
    </div>
  );
}
