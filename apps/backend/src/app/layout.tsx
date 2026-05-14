import type { Metadata } from "next";
import localFont from "next/font/local";
import { Archivo, Space_Grotesk, Press_Start_2P, VT323, Outfit, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientProvider } from "@/components/context/client-providers";
import { Suspense } from "react";

const geistMono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

// Landing page 字体：Archivo（标题）+ Space Grotesk（正文）
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Landing page 像素风字体：Press Start 2P（标题）+ VT323（正文）
const pressStart2P = Press_Start_2P({
	subsets: ["latin"],
	variable: "--font-press-start",
	display: "swap",
	weight: "400",
});

const vt323 = VT323({
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
  weight: "400",
});

// NextAdmin 后台字体 — 基于 Paper Design System 规范
// Outfit: 品牌/标题（display），DM Sans: 正文/UI（body），JetBrains Mono: 代码/数据
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

// 站点基础 URL，用于生成 canonical URL、OG 链接等
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  // title.template 让子页面自动拼接品牌后缀
  // 例如子页面设置 title: "博客" → 渲染为 "博客 | NextAdmin"
  title: {
    default: '用用管理后台',
    template: '%s | NextAdmin',
  },
  description: '基于插件化架构的现代教育管理后台，支持 RBAC 权限控制、API 优先设计，按需启用业务模块。',
  // metadataBase 让所有相对 URL（OG 图片、canonical）有正确的基础路径
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'NextAdmin',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {/* use antialiased to improve font rendering */}
      <body
        className={`${geistMono.variable} ${archivo.variable} ${spaceGrotesk.variable} ${pressStart2P.variable} ${vt323.variable} ${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClientProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </ClientProvider>
      </body>
    </html>
  );
}
