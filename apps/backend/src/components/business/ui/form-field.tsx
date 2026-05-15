/**
 * File: form-field.tsx
 * Description: 表单字段组件 — 提供统一的标签 + 输入控件 + 错误消息布局
 *
 * 设计规范:
 * - 标签: Outfit 600, 13px, --fg 颜色, 位于输入框上方
 * - 输入状态: 默认 (border-medium)、聚焦 (--ds-accent 边框 + ring)、错误 (--rose 边框 + 错误消息)、禁用 (opacity-50)
 * - 错误消息: DM Sans 400, 12px, --rose 颜色, 带错误图标
 * - 描述文本: DM Sans 400, 12px, --fg-muted 颜色
 * - 输入框高度: 34px, padding: px-3, 圆角: 8px (--radius-sm)
 */

"use client";

import { AlertCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: FormFieldProps
 *
 * Description: 表单字段组件的属性定义
 *
 * Properties:
 *   label(string): 字段标签文本（必填）
 *   htmlFor(string): 标签关联的输入元素 ID，用于 label 的 htmlFor 属性
 *   description(string): 字段描述/帮助文本，显示在输入框下方
 *   error(string): 错误消息文本，显示时输入框会切换为错误状态样式
 *   required(boolean): 是否显示必填标记 *（红色星号）
 *   children(React.ReactNode): 输入控件元素（Input、Select、Textarea 等）
 *   className(string): 容器的自定义样式类名
 */
export interface FormFieldProps {
	/** 字段标签文本 */
	label: string;
	/** 标签关联的输入元素 ID */
	htmlFor?: string;
	/** 字段描述/帮助文本 */
	description?: string;
	/** 错误消息文本 */
	error?: string;
	/** 是否必填（显示红色 * 标记） */
	required?: boolean;
	/** 输入控件 */
	children: React.ReactNode;
	/** 容器自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: FormField
 *
 * Description: 表单字段包装组件，提供标签 + 输入控件 + 错误/描述消息的统一布局。
 *              当存在 error 时，会自动为子输入控件添加错误边框样式。
 *
 * Parameters:
 *   label(string): 字段标签
 *   htmlFor(string): 关联 ID
 *   description(string): 帮助文本
 *   error(string): 错误消息
 *   required(boolean): 必填标记
 *   children(React.ReactNode): 输入控件
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 表单字段容器
 *
 * Example:
 *   <FormField label="学员姓名" error="请输入姓名" required>
 *     <Input placeholder="请输入学员姓名" />
 *   </FormField>
 *
 *   <FormField label="课程分类" description="选择所属课程分类">
 *     <Select>...</Select>
 *   </FormField>
 */
export function FormField({
	label,
	htmlFor,
	description,
	error,
	required = false,
	children,
	className,
}: FormFieldProps) {
	const hasError = !!error;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			{/* ---- 标签行 ---- */}
			<label
				htmlFor={htmlFor}
				className={cn(
					// Outfit 600, 13px, --fg 颜色
					"font-display text-[13px] font-semibold leading-tight",
					"text-fg select-none",
				)}
			>
				{label}
				{/* 必填标记：红色星号 */}
				{required && (
					<span className="ml-0.5 text-[var(--rose)]" aria-hidden="true">
						*
					</span>
				)}
			</label>

			{/* ---- 输入控件 ---- */}
			{hasError
				? // 错误状态下，为子控件克隆并注入错误样式
					React.Children.map(children, (child) => {
						if (!React.isValidElement(child)) return child;

						// 合并错误边框类名到子控件的 className
						const existingClassName =
							(child.props as Record<string, string>)?.className ?? "";
						return React.cloneElement(
							child as React.ReactElement<Record<string, unknown>>,
							{
								className: cn(
									// 错误边框 + 焦点环
									"border-[var(--rose)] focus-visible:ring-[var(--rose)] focus-visible:ring-opacity-20",
									existingClassName,
								),
							},
						);
					})
				: children}

			{/* ---- 底部提示：错误消息 或 描述文本 ---- */}
			{hasError ? (
				<div className="flex items-center gap-1">
					{/* 错误图标：16px */}
					<AlertCircle
						className="size-4 shrink-0 text-[var(--rose)]"
						aria-hidden="true"
					/>
					{/* 错误文本：DM Sans 400, 12px, --rose */}
					<span className="text-body-sm text-[var(--rose)]">{error}</span>
				</div>
			) : description ? (
				/* 描述文本：DM Sans 400, 12px, --fg-muted */
				<span className="text-body-sm text-fg-muted">{description}</span>
			) : null}
		</div>
	);
}
