/**
 * File: alert-banner.tsx
 * Description: 警告横幅组件 — 全宽度的提示信息条
 *
 * 设计规范:
 * - 容器: 全宽, rounded-[var(--radius-md)], padding 16px 20px
 * - 变体: warning / success / info / error，各自使用对应的语义色浅底 + 主色
 *   - warning: --gold-subtle 背景 + --gold 文字/图标
 *   - success: --teal-subtle 背景 + --teal 文字/图标
 *   - info:    --ds-accent-subtle 背景 + --ds-accent 文字/图标
 *   - error:   --rose-subtle 背景 + --rose 文字/图标
 * - 图标: 16px, 左对齐
 * - 消息文本: DM Sans 400, 13px
 * - 可选关闭按钮: X 图标, 右对齐
 * - 可选操作按钮
 *
 * 使用场景:
 * - 页面顶部的全局提示
 * - 操作成功/失败的内联反馈
 * - 系统维护通知
 * - 数据验证警告
 */

"use client";

import {
	AlertTriangle, // 警告图标
	CheckCircle2, // 成功图标
	Info, // 信息图标
	X, // 关闭图标
	XCircle, // 错误图标
} from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: AlertBannerVariant
 *
 * Description: 警告横幅的样式变体
 *
 * Values:
 *   'success': 成功状态（青绿色）
 *   'warning': 警告状态（金棕色）
 *   'error':   错误状态（玫红色）
 *   'info':    信息提示（暖橙色）
 */
export type AlertBannerVariant = "success" | "warning" | "error" | "info";

/**
 * Type: AlertBannerAction
 *
 * Description: 警告横幅的操作按钮配置
 *
 * Properties:
 *   label(string): 操作按钮文本
 *   onClick(function): 操作按钮点击回调
 */
export interface AlertBannerAction {
	/** 操作按钮文本 */
	label: string;
	/** 操作按钮点击回调 */
	onClick: () => void;
}

/**
 * Type: AlertBannerProps
 *
 * Description: 警告横幅组件的属性定义
 *
 * Properties:
 *   variant(AlertBannerVariant): 样式变体，默认 'info'
 *   title(string): 标题文本（加粗显示），可选
 *   children(React.ReactNode): 消息内容（支持富文本）
 *   icon(React.ReactNode): 自定义图标，默认使用变体对应的图标
 *   closable(boolean): 是否显示关闭按钮，默认 false
 *   onClose(function): 关闭按钮点击回调
 *   action(AlertBannerAction): 可选的操作按钮配置
 *   className(string): 容器的自定义样式类名
 */
export interface AlertBannerProps {
	/** 样式变体 */
	variant?: AlertBannerVariant;
	/** 标题文本（加粗） */
	title?: string;
	/** 消息内容 */
	children: React.ReactNode;
	/** 自定义图标（覆盖默认图标） */
	icon?: React.ReactNode;
	/** 是否显示关闭按钮 */
	closable?: boolean;
	/** 关闭回调 */
	onClose?: () => void;
	/** 操作按钮 */
	action?: AlertBannerAction;
	/** 自定义样式类名 */
	className?: string;
}

// ---------------------------------------------------------------------------
// 变体配置
// ---------------------------------------------------------------------------

/**
 * VARIANT_CONFIG: 各变体的样式和默认图标配置
 *
 * 每个变体定义：
 * - bg: 容器背景色（浅底色）
 * - text: 文字和图标颜色
 * - icon: 默认图标组件
 */
const VARIANT_CONFIG: Record<
	AlertBannerVariant,
	{ bg: string; text: string; icon: React.ElementType }
> = {
	success: {
		bg: "bg-[var(--teal-subtle)]",
		text: "text-[var(--teal)]",
		icon: CheckCircle2,
	},
	warning: {
		bg: "bg-[var(--gold-subtle)]",
		text: "text-[var(--gold)]",
		icon: AlertTriangle,
	},
	error: {
		bg: "bg-[var(--rose-subtle)]",
		text: "text-[var(--rose)]",
		icon: XCircle,
	},
	info: {
		bg: "bg-[var(--ds-accent-subtle)]",
		text: "text-[var(--ds-accent)]",
		icon: Info,
	},
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: AlertBanner
 *
 * Description: 全宽警告横幅，支持四种语义变体、可选关闭按钮和操作按钮。
 *              遵循 NextAdmin 设计规范，使用语义色浅底背景。
 *
 * Parameters:
 *   variant(AlertBannerVariant): 样式变体
 *   title(string): 标题
 *   children(React.ReactNode): 消息内容
 *   icon(React.ReactNode): 自定义图标
 *   closable(boolean): 是否可关闭
 *   onClose(function): 关闭回调
 *   action(AlertBannerAction): 操作按钮
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 警告横幅
 *
 * Example:
 *   <AlertBanner variant="warning" title="系统维护" closable onClose={dismiss}>
 *     系统将于今晚 22:00 进行维护，预计持续 2 小时。
 *     <AlertBanner.Action label="了解更多" onClick={showDetail} />
 *   </AlertBanner>
 */
export function AlertBanner({
	variant = "info",
	title,
	children,
	icon,
	closable = false,
	onClose,
	action,
	className,
}: AlertBannerProps) {
	// 获取当前变体的样式配置
	const config = VARIANT_CONFIG[variant];

	// 渲染图标：优先使用自定义图标，否则使用变体默认图标
	const renderIcon = () => {
		if (icon) {
			return <span className={cn("size-4 shrink-0", config.text)}>{icon}</span>;
		}
		const DefaultIcon = config.icon;
		return (
			<DefaultIcon
				className={cn("size-4 shrink-0", config.text)}
				aria-hidden="true"
			/>
		);
	};

	return (
		<div
			role="alert"
			className={cn(
				// 容器：全宽, 圆角 --radius-md
				"flex w-full items-start gap-2.5 rounded-[var(--radius-md)]",
				// 内边距: Paper Design — 垂直 10px, 水平 16px
				"px-4 py-2.5",
				// 变体背景色
				config.bg,
				className,
			)}
		>
			{/* ---- 图标区 ---- */}
			<div className="mt-0.5">{renderIcon()}</div>

			{/* ---- 内容区 ---- */}
			<div className="flex-1 min-w-0">
				{/* 标题：可选，加粗显示 */}
				{title && (
					<div
						className={cn(
							"text-[13px] font-semibold leading-snug",
							config.text,
						)}
					>
						{title}
					</div>
				)}

				{/* 消息内容：DM Sans 400, 13px */}
				<div
					className={cn(
						"text-[13px] leading-relaxed text-fg-secondary",
						title && "mt-1",
					)}
				>
					{children}
				</div>

				{/* 操作按钮：可选 */}
				{action && (
					<button
						type="button"
						onClick={action.onClick}
						className={cn(
							"mt-2 inline-flex items-center text-[12px] font-semibold",
							"transition-colors duration-fast",
							config.text,
							"hover:opacity-80",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-1",
						)}
					>
						{action.label}
					</button>
				)}
			</div>

			{/* ---- 关闭按钮 ---- */}
			{closable && (
				<button
					type="button"
					onClick={onClose}
					className={cn(
						"inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
						"text-fg-muted transition-colors duration-fast",
						"hover:bg-[var(--bg)] hover:text-fg-secondary",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-1",
					)}
					aria-label="关闭"
				>
					<X className="size-3.5" />
				</button>
			)}
		</div>
	);
}
