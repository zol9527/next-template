/**
 * File: loading-skeleton.tsx
 * Description: 骨架屏模式组件 — 预配置的加载占位模式
 *
 * 设计规范:
 * - 骨架条: rounded-[var(--radius-sm)], bg-[var(--surface-alt)], animate-pulse
 * - 模式类型: 单行、多行、卡片头部、KPI 卡片、表格行
 *
 * 使用场景:
 * - 页面首次加载时的内容占位
 * - 数据切换时的过渡动画
 * - Suspense fallback 配合使用
 *
 * 注意: 使用基础 Skeleton 组件（从 @/components/ui/skeleton 导入）
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: SkeletonLineProps
 *
 * Description: 单行骨架条属性
 *
 * Properties:
 *   width(string): 宽度，默认 '100%'
 *   height(string): 高度，默认 '10px'
 *   className(string): 自定义样式类名
 */
export interface SkeletonLineProps {
	/** 宽度 */
	width?: string;
	/** 高度 */
	height?: string;
	/** 自定义样式 */
	className?: string;
}

/**
 * Type: SkeletonCardHeaderProps
 *
 * Description: 卡片头部骨架属性
 *
 * Properties:
 *   className(string): 容器的自定义样式类名
 */
export interface SkeletonCardHeaderProps {
	/** 自定义样式 */
	className?: string;
}

/**
 * Type: SkeletonKpiCardProps
 *
 * Description: KPI 卡片骨架属性
 *
 * Properties:
 *   className(string): 容器的自定义样式类名
 */
export interface SkeletonKpiCardProps {
	/** 自定义样式 */
	className?: string;
}

/**
 * Type: SkeletonTableRowProps
 *
 * Description: 表格行骨架属性
 *
 * Properties:
 *   columns(number): 列数，默认 5
 *   className(string): 自定义样式类名
 */
export interface SkeletonTableRowProps {
	/** 列数 */
	columns?: number;
	/** 自定义样式 */
	className?: string;
}

/**
 * Type: SkeletonTableProps
 *
 * Description: 完整表格骨架属性
 *
 * Properties:
 *   rows(number): 数据行数，默认 5
 *   columns(number): 列数，默认 5
 *   className(string): 容器的自定义样式类名
 */
export interface SkeletonTableProps {
	/** 数据行数 */
	rows?: number;
	/** 列数 */
	columns?: number;
	/** 自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// 通用骨架条样式
// ---------------------------------------------------------------------------

/**
 * SKELETON_BAR_CLASS: 骨架条通用样式类
 * - 圆角: --radius-sm (8px)
 * - 背景: --surface-alt
 * - 动画: pulse（由基础 Skeleton 提供）
 */
const SKELETON_BAR_CLASS = "rounded-[var(--radius-sm)] bg-[var(--surface-alt)]";

// ---------------------------------------------------------------------------
// SkeletonLine — 单行骨架条
// ---------------------------------------------------------------------------

/**
 * Function: SkeletonLine
 *
 * Description: 单行骨架条，支持自定义宽高。
 *              适用于段落文本、标签、标题等占位。
 *
 * Parameters:
 *   width(string): 宽度，默认 '100%'
 *   height(string): 高度，默认 '10px'
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 骨架条
 *
 * Example:
 *   <SkeletonLine width="80%" />
 *   <SkeletonLine height="16px" width="200px" />
 */
export function SkeletonLine({
	width = "100%",
	height = "10px",
	className,
}: SkeletonLineProps) {
	return (
		<Skeleton
			className={cn(SKELETON_BAR_CLASS, className)}
			style={{ width, height }}
		/>
	);
}

// ---------------------------------------------------------------------------
// SkeletonCardHeader — 卡片头部骨架
// ---------------------------------------------------------------------------

/**
 * Function: SkeletonCardHeader
 *
 * Description: 卡片头部骨架，模拟头像 + 标题 + 副标题的布局。
 *              适用于列表项、用户信息卡片等的加载占位。
 *
 * Parameters:
 *   className(string): 容器自定义样式
 *
 * Returns:
 *   JSX.Element: 卡片头部骨架
 *
 * Example:
 *   <SkeletonCardHeader />
 */
export function SkeletonCardHeader({ className }: SkeletonCardHeaderProps) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* 头像占位：30×30px 圆形 */}
			<Skeleton
				className={cn(SKELETON_BAR_CLASS, "size-[30px] shrink-0 rounded-full")}
			/>
			{/* 文字区：标题 + 副标题 */}
			<div className="flex flex-1 flex-col gap-2">
				{/* 标题占位 */}
				<Skeleton className={cn(SKELETON_BAR_CLASS, "h-3.5 w-[45%]")} />
				{/* 副标题占位 */}
				<Skeleton className={cn(SKELETON_BAR_CLASS, "h-2.5 w-[65%]")} />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// SkeletonKpiCard — KPI 卡片骨架
// ---------------------------------------------------------------------------

/**
 * Function: SkeletonKpiCard
 *
 * Description: KPI 指标卡片骨架，模拟图标色块 + 数值 + 标签的布局。
 *              适用于 Dashboard KPI 指标条的加载占位。
 *
 * Parameters:
 *   className(string): 容器自定义样式
 *
 * Returns:
 *   JSX.Element: KPI 卡片骨架
 *
 * Example:
 *   <SkeletonKpiCard />
 */
export function SkeletonKpiCard({ className }: SkeletonKpiCardProps) {
	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* 图标色块占位：28×28px */}
			<Skeleton className={cn(SKELETON_BAR_CLASS, "size-7 shrink-0")} />
			{/* 数值 + 标签区 */}
			<div className="flex flex-1 flex-col gap-2">
				{/* 数值占位 */}
				<Skeleton className={cn(SKELETON_BAR_CLASS, "h-4.5 w-[40%]")} />
				{/* 标签占位 */}
				<Skeleton className={cn(SKELETON_BAR_CLASS, "h-2.5 w-[55%]")} />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// SkeletonTableRow — 表格行骨架
// ---------------------------------------------------------------------------

/**
 * Function: SkeletonTableRow
 *
 * Description: 单行表格骨架，模拟 N 列的表格行布局。
 *              最后一列会显示更窄的宽度（模拟操作列）。
 *
 * Parameters:
 *   columns(number): 列数，默认 5
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 表格行骨架
 *
 * Example:
 *   <SkeletonTableRow columns={4} />
 */
export function SkeletonTableRow({
	columns = 5,
	className,
}: SkeletonTableRowProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-4 border-b border-[var(--border)] py-3 px-5",
				className,
			)}
		>
			{/* 每列生成一个骨架条 */}
			{Array.from({ length: columns }).map((_, index) => {
				// 最后一列使用更窄的宽度（模拟操作列/状态列）
				const isLast = index === columns - 1;
				return (
					<Skeleton
						key={index}
						className={cn(
							SKELETON_BAR_CLASS,
							isLast ? "h-2.5 w-[60px] shrink-0" : "h-3.5 flex-1",
						)}
					/>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// SkeletonTable — 完整表格骨架
// ---------------------------------------------------------------------------

/**
 * Function: SkeletonTable
 *
 * Description: 完整表格骨架，包含表头行 + N 行数据行的占位。
 *              适用于数据表格加载时的全量占位。
 *
 * Parameters:
 *   rows(number): 数据行数，默认 5
 *   columns(number): 列数，默认 5
 *   className(string): 容器自定义样式
 *
 * Returns:
 *   JSX.Element: 完整表格骨架
 *
 * Example:
 *   <SkeletonTable rows={8} columns={6} />
 */
export function SkeletonTable({
	rows = 5,
	columns = 5,
	className,
}: SkeletonTableProps) {
	return (
		<div className={cn("rounded-[var(--radius-md)]", className)}>
			{/* ---- 表头行：使用较矮的骨架条 ---- */}
			<div
				className={cn(
					"flex items-center gap-4 border-b border-[var(--border)] py-2.5 px-5",
					"bg-[var(--surface-alt)]",
				)}
			>
				{Array.from({ length: columns }).map((_, index) => (
					<Skeleton
						key={`header-${index}`}
						className={cn(SKELETON_BAR_CLASS, "h-2 w-[25%]")}
					/>
				))}
			</div>

			{/* ---- 数据行 ---- */}
			{Array.from({ length: rows }).map((_, index) => (
				<SkeletonTableRow key={`row-${index}`} columns={columns} />
			))}
		</div>
	);
}
