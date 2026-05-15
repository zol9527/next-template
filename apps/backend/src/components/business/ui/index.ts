/**
 * File: index.ts
 * Description: business/ui 组件库统一导出 — NextAdmin 设计系统组件
 *
 * 本文件导出所有遵循 Paper Design System 规范的 UI 组件。
 * 这些组件基于 shadcn/ui 封装，但样式完全遵循 NextAdmin 设计令牌。
 *
 * 使用方式:
 *     import { StatusPill, KpiCard, FormField } from '@/components/business/ui'
 */

// ============================================
// 基础 UI 组件 (Basic UI Components)
// ============================================

export type { ChartTabsProps } from "./chart-tabs";
// 图表标签页 — 数据视图切换（周/月/年）
export { ChartTabs } from "./chart-tabs";
export type { PaginationProps } from "./pagination";
// 分页 — 列表分页导航
export { Pagination } from "./pagination";
export type { ProgressBarProps } from "./progress-bar";
// 进度条 — 任务/课程进度展示
export { ProgressBar } from "./progress-bar";
export type {
	StatusPillProps,
	StatusPillVariant as StatusVariant,
} from "./status-pill";
// 状态药丸 — 表格/列表中的状态标签
export { StatusPill } from "./status-pill";
export type { TagProps } from "./tag";
// 标签 — 分类/标注小标签
export { Tag } from "./tag";

// ============================================
// 表单组件 (Form Components)
// ============================================

export type {
	CheckboxFieldProps,
	RadioFieldProps,
	ToggleFieldProps,
} from "./form-controls";
// 表单控件集合 — CheckboxField / RadioField / ToggleField
export { CheckboxField, RadioField, ToggleField } from "./form-controls";
export type { FormFieldProps } from "./form-field";
// 表单字段 — 统一的 label + input + error 布局
export { FormField } from "./form-field";

// ============================================
// 反馈 & 覆盖层组件 (Feedback & Overlay Components)
// ============================================

export type { AlertBannerProps } from "./alert-banner";
// 警告横幅 — 全宽通知条
export { AlertBanner } from "./alert-banner";
export type { ConfirmDialogProps } from "./confirm-dialog";
// 确认对话框 — 常规确认操作
export { ConfirmDialog } from "./confirm-dialog";
export type { DangerDialogProps } from "./danger-dialog";
// 危险操作对话框 — 删除/破坏性操作
export { DangerDialog } from "./danger-dialog";
export type { EmptyStateProps } from "./empty-state";
// 空状态 — 无数据占位
export { EmptyState } from "./empty-state";
export type {
	SkeletonCardHeaderProps,
	SkeletonKpiCardProps,
	SkeletonLineProps,
	SkeletonTableProps,
	SkeletonTableRowProps,
} from "./loading-skeleton";
// 骨架屏 — 加载态占位
export {
	SkeletonCardHeader,
	SkeletonKpiCard,
	SkeletonLine,
	SkeletonTable,
	SkeletonTableRow,
} from "./loading-skeleton";

// ============================================
// 数据展示组件 (Data Display Components)
// ============================================

export type {
	ActivityFeedItemProps,
	ActivityFeedListProps,
	DotColor as FeedDotColor,
} from "./activity-feed";
// 活动 Feed — 时间线风格动态列表
export { ActivityFeedItem, ActivityFeedList } from "./activity-feed";
export type { KpiCardProps, KpiCardVariant } from "./kpi-card";
// KPI 卡片 — 5种变体的管理端指标卡
export { KpiCard } from "./kpi-card";
export type { ColorTheme, KpiIndicatorProps, TrendInfo } from "./kpi-indicator";
// KPI 指标项 — Dashboard 6列等宽网格中的单项
export { KpiIndicator } from "./kpi-indicator";
export type { StatCardProps } from "./stat-card";
// 统计卡片 — 带进度条的管理端统计卡
export { StatCard } from "./stat-card";

// ============================================
// 卡片变体 (Card Variants)
// ============================================

export type {
	CompactMetricCardProps,
	DetailCardProps,
	FeedCardProps,
	InfoCardProps,
	MainCardProps,
	MetricCardProps,
} from "./cards";
export {
	CompactMetricCard,
	DetailCard,
	FeedCard,
	InfoCard,
	MainCard,
	MetricCard,
} from "./cards";

// ============================================
// 表格列模式 (Table Column Patterns)
// ============================================

export type {
	ActionColumnProps,
	ActionItem,
	AmountColumnProps,
	OrderIdColumnProps,
	StatusColumnProps,
	UserColumnProps,
} from "./table-columns";
export {
	ActionColumn,
	AmountColumn,
	OrderIdColumn,
	StatusColumn,
	UserColumn,
} from "./table-columns";
