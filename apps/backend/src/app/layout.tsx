import type { Metadata } from "next";
import localFont from "next/font/local";
import { Archivo, Space_Grotesk, Press_Start_2P, VT323, Inter } from "next/font/google";
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

// Admin 后台字体：Inter（标题 + 正文 + 标签）
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Generic Admin",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* use antialiased to improve font rendering */}
      <body
        className={`${geistMono.variable} ${archivo.variable} ${spaceGrotesk.variable} ${pressStart2P.variable} ${vt323.variable} ${inter.variable} antialiased`}
      >
        <ClientProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </ClientProvider>
      </body>
    </html>
  );
}
