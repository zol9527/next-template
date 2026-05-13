import { LandingPage } from "@/components/business/landing/landing-page";
import { Metadata } from "next";

/**
 * Landing Page 元数据
 *
 * 站点名称和描述可以根据实际业务调整。
 * 动态 SEO 标题可在后续通过 generateMetadata 从 API 获取。
 */
export const metadata: Metadata = {
	title: "EduAdmin — 职业教育培训与证书认证平台",
	description:
		"专注成人职业教育与职业资格认证培训。提供建造师、消防工程师、健康管理师、教师资格证等热门考证辅导，助你高效通关。",
	keywords: [
		"职业培训",
		"证书培训",
		"建造师",
		"消防工程师",
		"健康管理师",
		"教师资格证",
		"成人教育",
		"考证辅导",
	],
};

/**
 * Landing Page 路由
 *
 * 教育培训平台官网首页。
 * 使用 bookish 设计风格，Outfit/DM Sans 字体组合。
 */
export default function LandingRoute() {
	return <LandingPage />;
}
