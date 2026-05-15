/**
 * File: tag.tsx
 * Description: 标签组件 — 用于分类、标记、过滤等场景
 *
 * 设计规范:
 * - 小型 pill/capsule 形状，带语义色浅底
 * - 支持两种尺寸: sm(11px) / md(12px)
 * - 支持可关闭模式（显示 × 按钮）
 * - 变体: default / success / warning / error / info
 *
 * 使用场景:
 * - 文章分类标签
 * - 数据筛选条件展示
 * - 用户标签/角色标记
 * - 可移除的过滤标签
 */

"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// 类型定义
// ============================================

/**
 * Type: TagVariant
 *
 * Description: 标签的视觉变体
 *
 * Options:
 *     default: 默认态（中性灰色）
 *     success: 成功态（绿色）
 *     warning: 警告态（金色）
 *     error: 错误态（玫红色）
 *     info: 信息态（蓝色）
 */
export type TagVariant = "default" | "success" | "warning" | "error" | "info";

/**
 * Type: TagSize
 *
 * Description: 标签的尺寸
 *
 * Options:
 *     sm: 小尺寸 (text-[11px], px-2 py-0.5)
 *     md: 中尺寸 (text-xs, px-2.5 py-1)
 */
export type TagSize = "sm" | "md";

/**
 * Type: TagProps
 *
 * Description: 标签组件的 props
 *
 * Properties:
 *     children(React.ReactNode): 标签内容
 *     variant(TagVariant): 视觉变体
 *     size(TagSize): 尺寸变体
 *     closable(boolean): 是否显示关闭按钮
 *     onClose(function): 关闭按钮点击回调
 *     className(string): 自定义样式类名
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
	/** 标签内容 */
	children: React.ReactNode;
	/** 视觉变体，默认 'default' */
	variant?: TagVariant;
	/** 尺寸变体，默认 'sm' */
	size?: TagSize;
	/** 是否显示关闭按钮（×），默认 false */
	closable?: boolean;
	/** 关闭按钮点击回调（closable 为 true 时必填） */
	onClose?: () => void;
}

// ============================================
// 样式映射
// ============================================

/**
 * 变体到样式类名的映射
 * 使用语义色浅底 + 语义色文字
 */
const VARIANT_STYLES: Record<TagVariant, string> = {
	default: "bg-muted text-muted-foreground",
	success: "bg-success/10 text-success",
	warning: "bg-warning/10 text-warning",
	error: "bg-error/10 text-error",
	info: "bg-info/10 text-info",
};

/**
 * 尺寸到样式类名的映射
 */
const SIZE_STYLES: Record<TagSize, string> = {
	sm: "text-[11px] px-2 py-0.5",
	md: "text-xs px-2.5 py-1",
};

/**
 * 关闭按钮尺寸映射
 * 确保关闭图标与标签尺寸协调
 */
const CLOSE_ICON_SIZE: Record<TagSize, number> = {
	sm: 12,
	md: 14,
};

// ============================================
// 组件实现
// ============================================

/**
 * Function: Tag
 *
 * Description: 标签组件 — 用于分类、标记、过滤等场景
 *             小型 pill 形状，支持颜色变体、尺寸选择和可关闭模式
 *
 * Parameters:
 *     children(React.ReactNode): 标签内容（必填）
 *     variant(TagVariant): 视觉变体，默认 'default'
 *     size(TagSize): 尺寸变体，默认 'sm'
 *     closable(boolean): 是否可关闭，默认 false
 *     onClose(() => void): 关闭回调
 *     className(string): 自定义样式类名
 *
 * Returns:
 *     React.ReactElement: 渲染后的标签元素
 *
 * Example:
 *     // 基础用法
 *     <Tag>默认标签</Tag>
 *
 *     // 带变体
 *     <Tag variant="success">已完成</Tag>
 *     <Tag variant="warning">审核中</Tag>
 *
 *     // 可关闭标签
 *     <Tag variant="info" closable onClose={() => removeTag('id')}>
 *       筛选条件
 *     </Tag>
 *
 *     // 中尺寸
 *     <Tag variant="error" size="md">紧急</Tag>
 */
export const Tag = React.memo(
	React.forwardRef<HTMLSpanElement, TagProps>(
		(
			{
				children,
				variant = "default",
				size = "sm",
				closable = false,
				onClose,
				className,
				...props
			},
			ref,
		) => {
			return (
				<span
					ref={ref}
					className={cn(
						// pill 圆角容器
						"inline-flex items-center gap-1 rounded-[var(--radius-pill)]",
						// 字体
						"font-medium leading-tight",
						// 平滑过渡
						"transition-colors duration-150",
						// 变体样式
						VARIANT_STYLES[variant],
						// 尺寸样式
						SIZE_STYLES[size],
						// 可关闭时右侧留出更多空间
						closable && "pr-1",
						className,
					)}
					{...props}
				>
					{/* 标签内容 */}
					{children}

					{/* 可关闭按钮 — 使用 lucide-react 的 X 图标 */}
					{closable && (
						<button
							type="button"
							onClick={(e) => {
								// 阻止事件冒泡，避免触发父元素的点击事件
								e.stopPropagation();
								onClose?.();
							}}
							className={cn(
								// 居中容器
								"inline-flex items-center justify-center",
								// 圆形背景
								"rounded-full",
								// 悬停态: 轻微背景加深
								"hover:bg-black/5",
								// 平滑过渡
								"transition-colors duration-150",
								// 尺寸适配
								size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
							)}
							aria-label="移除标签"
						>
							<X size={CLOSE_ICON_SIZE[size]} className="shrink-0" />
						</button>
					)}
				</span>
			);
		},
	),
);

Tag.displayName = "Tag";
