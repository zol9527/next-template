/**
 * File: status-pill.tsx
 * Description: 状态药丸组件 — 用于表格、列表等场景中展示状态信息
 *
 * 设计规范:
 * - pill 圆角容器 (rounded-full)
 * - 5×5px 圆形色点 + 语义色文字 + 语义色浅底
 * - 字体: DM Sans 500, 11.5px
 * - 变体: success / warning / error / neutral / info
 *
 * 使用场景:
 * - 订单状态（已完成、退款中、待发货）
 * - 登录记录（MFA已验证、新设备、MFA失败）
 * - 通用状态标记
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// 类型定义
// ============================================

/**
 * Type: StatusPillVariant
 *
 * Description: 状态药丸的视觉变体
 *
 * Options:
 *     success: 成功态（已完成），使用 teal 绿色
 *     warning: 警告态（退款中/待发货），使用 gold 金色
 *     error: 错误态（MFA失败），使用 rose 玫红色
 *     neutral: 中性态（新设备），使用 muted 灰色
 *     info: 信息态（MFA已验证），使用 primary 蓝色
 */
export type StatusPillVariant =
	| "success"
	| "warning"
	| "error"
	| "neutral"
	| "info";

/**
 * Type: StatusPillProps
 *
 * Description: 状态药丸组件的 props
 *
 * Properties:
 *     variant(StatusPillVariant): 视觉变体，控制颜色主题
 *     label(string): 显示的状态文本
 *     className(string): 自定义样式类名
 */
export interface StatusPillProps {
	/** 视觉变体，决定颜色主题 */
	variant?: StatusPillVariant;
	/** 显示的状态文本 */
	label: string;
	/** 自定义样式类名 */
	className?: string;
}

// ============================================
// 状态到变体的映射
// ============================================

/**
 * 常用业务状态到变体的快捷映射
 * 支持直接传入业务状态字符串，自动映射到对应的视觉变体
 */
const STATUS_TO_VARIANT_MAP: Record<string, StatusPillVariant> = {
	// 订单状态
	completed: "success",
	paid: "success",
	shipped: "success",
	delivered: "success",
	active: "success",
	published: "success",
	enabled: "success",

	pending: "warning",
	pending_payment: "warning",
	processing: "warning",
	refunding: "warning",
	partial_refund: "warning",
	to_ship: "warning",

	failed: "error",
	cancelled: "error",
	expired: "error",
	mfa_failed: "error",
	rejected: "error",

	new_device: "neutral",
	draft: "neutral",
	inactive: "neutral",
	disabled: "neutral",

	mfa_verified: "info",
	verified: "info",
};

// ============================================
// 样式映射
// ============================================

/**
 * 变体到样式类名的映射
 * 每个变体包含: 容器背景 + 文字颜色 + 色点颜色
 */
const VARIANT_STYLES: Record<
	StatusPillVariant,
	{ container: string; dot: string }
> = {
	success: {
		container: "bg-success/10 text-success",
		dot: "bg-success",
	},
	warning: {
		container: "bg-warning/10 text-warning",
		dot: "bg-warning",
	},
	error: {
		container: "bg-error/10 text-error",
		dot: "bg-error",
	},
	neutral: {
		container: "bg-muted text-muted-foreground",
		dot: "bg-muted-foreground",
	},
	info: {
		container: "bg-info/10 text-info",
		dot: "bg-info",
	},
};

// ============================================
// 组件实现
// ============================================

/**
 * Function: StatusPill
 *
 * Description: 状态药丸组件 — 在表格和列表中展示状态信息
 *             由 pill 圆角容器 + 5×5px 圆形色点 + 状态文本组成
 *
 * Parameters:
 *     variant(StatusPillVariant): 视觉变体（可选，默认 'neutral'）
 *     label(string): 显示的状态文本（必填）
 *     className(string): 自定义样式类名
 *
 * Returns:
 *     React.ReactElement: 渲染后的状态药丸元素
 *
 * Example:
 *     // 直接使用变体
 *     <StatusPill variant="success" label="已完成" />
 *     <StatusPill variant="warning" label="退款中" />
 *     <StatusPill variant="error" label="MFA失败" />
 *
 *     // 通过业务状态自动映射
 *     <StatusPill status="completed" label="已完成" />
 *     <StatusPill status="mfa_verified" label="MFA已验证" />
 */
export const StatusPill = React.memo(
	React.forwardRef<HTMLSpanElement, StatusPillProps & { status?: string }>(
		({ variant, label, className, status, ...props }, ref) => {
			// 如果传入了 status，优先从映射表中查找变体
			const effectiveVariant = React.useMemo<StatusPillVariant>(() => {
				if (variant) return variant;
				if (status && STATUS_TO_VARIANT_MAP[status]) {
					return STATUS_TO_VARIANT_MAP[status];
				}
				return "neutral";
			}, [variant, status]);

			// 获取当前变体的样式
			const styles = VARIANT_STYLES[effectiveVariant];

			return (
				<span
					ref={ref}
					className={cn(
						// pill 圆角容器
						"inline-flex items-center gap-2.5 rounded-[var(--radius-pill)]",
						// 内边距: Paper Design — paddingBlock 3px, paddingInline 10px
						"px-2.5 py-[3px]",
						// 字体: DM Sans 500, 11.5px
						"text-[11.5px] font-medium",
						// 平滑过渡
						"transition-colors duration-150",
						// 变体样式（语义色浅底 + 文字色）
						styles.container,
						className,
					)}
					{...props}
				>
					{/* 5×5px 圆形色点 — 视觉状态指示 */}
					<span
						className={cn(
							"inline-block h-[5px] w-[5px] rounded-full shrink-0",
							styles.dot,
						)}
						aria-hidden="true"
					/>
					{/* 状态文本 */}
					{label}
				</span>
			);
		},
	),
);

StatusPill.displayName = "StatusPill";
