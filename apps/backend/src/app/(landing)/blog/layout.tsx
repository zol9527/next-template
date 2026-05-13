import { PixelNavbar } from '@/components/business/blog/pixel-navbar'
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing'

/**
 * Blog 布局 — 像素复古风格
 *
 * 保持原有的 8-bit 像素视觉风格：
 * - PixelNavbar 像素风导航栏
 * - 深色背景 + ICP 备案
 */
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-(--color-landing-background)">
      <PixelNavbar />
      {children}
      <footer className="border-t-2 border-(--color-landing-border) px-6 py-8 text-center [font-family:var(--font-vt323)] text-lg text-(--color-landing-muted)">
        <PublicIcpFiling />
      </footer>
    </div>
  )
}
