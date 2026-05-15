/**
 * File: empty-state.tsx
 * Description: 空状态组件 — 用于列表、表格等数据为空时的占位展示
 *
 * 设计规范:
 * - 居中布局
 * - 图标: 40px, --fg-muted 颜色
 * - 标题: Outfit 600, 18px, --fg
 * - 描述: DM Sans 400, 13px, --fg-secondary
 * - CTA 按钮: 主色 (--ds-accent), 使用 Button 的 primary 变体
 *
 * 使用场景:
 * - 列表/表格无数据时的占位展示
 * - 搜索结果为空时的提示
 * - 首次使用某功能时的引导
 * - 权限受限或数据过滤后的空结果
 */

"use client";

import { Inbox } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: EmptyStateAction
 *
 * Description: 空状态的操作按钮配置
 *
 * Properties:
 *   label(string): 操作按钮文本（如"创建课程"、"添加学员"）
 *   onClick(function): 操作按钮点击回调
 */
export interface EmptyStateAction {
	/** 操作按钮文本 */
	label: string;
	/** 操作按钮点击回调 */
	onClick: () => void;
}

/**
 * Type: EmptyStateProps
 *
 * Description: 空状态组件的属性定义
 *
 * Properties:
 *   icon(React.ReactNode): 自定义图标，默认使用 Inbox 图标
 *   title(string): 标题文本（如"暂无数据"、"暂无课程"）
 *   description(string): 描述文本（说明为空原因或引导操作）
 *   action(EmptyStateAction): 可选的 CTA 操作按钮
 *   className(string): 容器的自定义样式类名
 */
export interface EmptyStateProps {
	/** 自定义图标（覆盖默认 Inbox） */
	icon?: React.ReactNode;
	/** 标题文本 */
	title: string;
	/** 描述文本 */
	description?: string;
	/** CTA 操作按钮 */
	action?: EmptyStateAction;
	/** 自定义样式类名 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: EmptyState
 *
 * Description: 空状态占位组件，居中显示图标、标题、描述和可选的 CTA 按钮。
 *              用于列表、表格等数据为空时的友好提示。
 *
 * Parameters:
 *   icon(React.ReactNode): 自定义图标
 *   title(string): 标题
 *   description(string): 描述
 *   action(EmptyStateAction): CTA 按钮
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 空状态占位
 *
 * Example:
 *   <EmptyState
 *     title="暂无课程"
 *     description="点击下方按钮创建您的第一个课程"
 *     action={{ label: '创建课程', onClick: handleCreate }}
 *   />
 *
 *   <EmptyState
 *     icon={<Search className="size-10" />}
 *     title="未找到匹配结果"
 *     description="请尝试调整搜索条件或关键词"
 *   />
 */
export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				// 容器：居中布局
				"flex flex-col items-center justify-center",
				"py-16 px-4",
				className,
			)}
		>
			{/* ---- 图标：40px, --fg-muted ---- */}
			<div className="mb-4 text-fg-muted" aria-hidden="true">
				{icon ?? <Inbox className="size-10" strokeWidth={1.5} />}
			</div>

			{/* ---- 标题：Outfit 600, 18px, --fg ---- */}
			<h3 className="font-display text-[18px] font-semibold leading-tight text-fg">
				{title}
			</h3>

			{/* ---- 描述：DM Sans 400, 13px, --fg-secondary ---- */}
			{description && (
				<p className="mt-2 max-w-[320px] text-center text-[13px] leading-relaxed text-fg-secondary">
					{description}
				</p>
			)}

			{/* ---- CTA 按钮：主色 --ds-accent ---- */}
			{action && (
				<Button variant="solid" onClick={action.onClick} className="mt-5">
					{action.label}
				</Button>
			)}
		</div>
	);
}
