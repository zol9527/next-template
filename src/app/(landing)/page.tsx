import { LandingPage } from "@/components/business/landing/landing-page";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Generic Admin - 通用后台管理系统",
	description: "基于插件化架构的现代后台管理系统。支持 RBAC 权限控制、API 优先设计，按需启用业务模块。",
	keywords: ["admin", "dashboard", "management system", "plugin architecture"],
};

/**
 * Landing Page 路由
 * Landing Page 路由 — 系统首页展示
 */
export default function LandingRoute() {
	return <LandingPage />;
}
