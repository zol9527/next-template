"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { PixelStar } from "@/components/business/landing/pixel-sprites";

/**
 * 像素艺术导航栏组件
 * 提供复古 8-bit 风格的网站导航
 * 
 * 功能特性：
 * - 响应式设计，支持桌面和移动端
 * - 活动链接高亮显示
 * - 像素边框底部装饰
 * - 可折叠的移动端菜单
 * - 像素星星 logo 装饰
 * 
 * @param {Object} props - 组件属性
 * @param {string} [props.className] - 额外的 CSS 类名
 */
export function PixelNavbar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "BLOG", href: "/blog" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav
      className={`sticky top-0 z-50 bg-[var(--color-landing-background)] bg-opacity-90 ${className}`}
      style={{
        boxShadow: "0 4px 0 0 var(--color-landing-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo 区域 */}
          <div className="flex items-center">
            <PixelStar className="mr-2" />
            <span className="text-xs font-bold text-[var(--color-landing-primary)] [font-family:var(--font-press-start)] tracking-wider">
              PIXEL NAV
            </span>
          </div>

          {/* 桌面端导航链接 */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`[font-family:var(--font-press-start)] text-xs tracking-wider transition-colors duration-200 ${
                  isActive(link.href)
                    ? "text-[var(--color-landing-primary)]"
                    : "text-[var(--color-landing-muted)] hover:text-[var(--color-landing-primary)]"
                }`}
                style={{
                  textShadow: isActive(link.href)
                    ? "2px 2px 0 var(--color-landing-border)"
                    : "none",
                }}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-[var(--color-landing-foreground)] hover:text-[var(--color-landing-primary)] focus:outline-none"
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <div
                  className="w-6 h-1 bg-current"
                  style={{ boxShadow: "2px 2px 0 var(--color-landing-border)" }}
                />
                <div
                  className="w-6 h-1 bg-current"
                  style={{ boxShadow: "2px 2px 0 var(--color-landing-border)" }}
                />
                <div
                  className="w-6 h-1 bg-current"
                  style={{ boxShadow: "2px 2px 0 var(--color-landing-border)" }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMenuOpen && (
          <div className="md:hidden pt-2 pb-4">
            <div className="space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 [font-family:var(--font-press-start)] text-xs tracking-wider transition-colors duration-200 ${
                    isActive(link.href)
                      ? "text-[var(--color-landing-primary)] bg-[var(--color-landing-card)]"
                      : "text-[var(--color-landing-muted)] hover:text-[var(--color-landing-primary)] hover:bg-[var(--color-landing-card)]"
                  }`}
                  style={{
                    border: isActive(link.href)
                      ? `2px solid var(--color-landing-border)`
                      : "none",
                    boxShadow: isActive(link.href)
                      ? "2px 2px 0 var(--color-landing-border)"
                      : "none",
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}