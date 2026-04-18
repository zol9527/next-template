"use client";

import { HeroSection } from "./hero-section";
import { ServicesSection } from "./services-section";
import { ProcessSection } from "./process-section";
import { TestimonialsSection } from "./testimonials-section";
import { CTASection } from "./cta-section";
import { PublicIcpFiling } from "@/components/business/shared/public-icp-filing";

/**
 * Landing Page 主组件
 * 通用后台管理系统展示页面
 *
 * 设计风格：8-bit 像素复古风
 * 配色：冰蓝 + 橙红 CTA，深蓝黑背景
 * 字体：Press Start 2P (标题) + VT323 (正文)
 */
export function LandingPage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
