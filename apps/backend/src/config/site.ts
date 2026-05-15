// apps/backend/src/config/site.ts

/**
 * File: site.ts
 * Description: 站点集中配置 — 品牌名称、SEO 默认值等
 *
 * 三层配置策略:
 *   1. 环境变量（部署时 / 多租户场景）
 *   2. 此文件的默认值（代码级 fallback）
 *   3. 数据库 SiteConfig API（运行时动态，仅登录后可用）
 *
 * SSR 场景（metadata、登录页）只能使用第 1、2 层。
 * 登录后的客户端组件可以优先使用第 3 层（数据库 API）。
 */

/** 品牌名称 — 从环境变量读取，默认 "NextAdmin"。使用 || 防御空字符串 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'NextAdmin'

/** SEO 默认标题 */
export const DEFAULT_TITLE = APP_NAME

/** SEO 标题模板（子页面标题 | 品牌名） */
export const TITLE_TEMPLATE = `%s | ${APP_NAME}`

/** OpenGraph 站点名 */
export const OG_SITE_NAME = APP_NAME

/** 站点描述 */
export const SITE_DESCRIPTION =
  '基于插件化架构的现代教育管理后台，支持 RBAC 权限控制、API 优先设计，按需启用业务模块。'

/**
 * 生成版权声明
 * 自动取当前年份，格式: © 2026 NextAdmin · All rights reserved.
 */
export function getCopyrightText(): string {
  return `© ${new Date().getFullYear()} ${APP_NAME} · All rights reserved.`
}
