import { PixelNavbar } from '@/components/business/blog/pixel-navbar';
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing';

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
