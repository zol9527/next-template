/**
 * File: form-controls.tsx
 * Description: 表单控件集合 — 包含 CheckboxField、RadioField、ToggleField
 *
 * 设计规范:
 * - CheckboxField: 16×16px 复选框，选中 (--ds-accent 背景 + 白色勾选)，禁用 (opacity-50)
 * - RadioField: 16×16px 单选圆圈，选中 (--ds-accent 填充 + 内圆点)，禁用 (opacity-50)
 * - ToggleField: 36×20px 开关，开启 (--ds-accent 轨道)，关闭 (--bg 轨道)，禁用 (opacity-50)
 */

"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ============================================================================
// CheckboxField — 复选框字段
// ============================================================================

/**
 * Type: CheckboxFieldProps
 *
 * Description: 复选框字段组件的属性定义
 *
 * Properties:
 *   label(string): 复选框标签文本（必填）
 *   description(string): 描述文本，显示在标签下方
 *   checked(boolean): 是否选中
 *   onCheckedChange((checked: boolean) => void): 选中状态变化回调
 *   disabled(boolean): 是否禁用
 *   className(string): 容器自定义样式
 *   id(string): 复选框 HTML id
 */
export interface CheckboxFieldProps {
	/** 标签文本 */
	label: string;
	/** 描述文本 */
	description?: string;
	/** 是否选中 */
	checked?: boolean;
	/** 选中状态变化回调 */
	onCheckedChange?: (checked: boolean) => void;
	/** 是否禁用 */
	disabled?: boolean;
	/** 容器自定义样式 */
	className?: string;
	/** HTML id */
	id?: string;
}

/**
 * Function: CheckboxField
 *
 * Description: 复选框字段组件，包装 shadcn Checkbox，提供标签和描述文本。
 *              布局为水平排列：复选框在左，标签和描述在右。
 *
 * Parameters:
 *   label(string): 标签文本
 *   description(string): 描述文本
 *   checked(boolean): 选中状态
 *   onCheckedChange(function): 状态回调
 *   disabled(boolean): 禁用状态
 *   className(string): 自定义样式
 *   id(string): HTML id
 *
 * Returns:
 *   JSX.Element: 复选框字段
 *
 * Example:
 *   <CheckboxField
 *     label="记住我"
 *     description="30天内自动登录"
 *     checked={remember}
 *     onCheckedChange={setRemember}
 *   />
 */
export function CheckboxField({
	label,
	description,
	checked,
	onCheckedChange,
	disabled = false,
	className,
	id,
}: CheckboxFieldProps) {
	// 生成唯一 ID 用于 label 关联（优先使用传入 id）
	const generatedId = React.useId();
	const inputId = id ?? generatedId;

	return (
		<div
			className={cn(
				"flex items-start gap-2.5",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
		>
			{/* 16×16px 复选框 */}
			<Checkbox
				id={inputId}
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				className="mt-0.5 size-4"
				aria-describedby={description ? `${inputId}-desc` : undefined}
			/>

			{/* 标签 + 描述 */}
			<div className="flex flex-col gap-0.5">
				<label
					htmlFor={inputId}
					className={cn(
						// DM Sans 500, 13px, --fg 颜色
						"font-body cursor-pointer text-[13px] font-medium leading-snug text-fg",
						disabled && "cursor-not-allowed",
					)}
				>
					{label}
				</label>
				{description && (
					<span id={`${inputId}-desc`} className="text-body-sm text-fg-muted">
						{description}
					</span>
				)}
			</div>
		</div>
	);
}

// ============================================================================
// RadioField — 单选框字段
// ============================================================================

/**
 * Type: RadioFieldProps
 *
 * Description: 单选框字段组件的属性定义。
 *              由于项目无 shadcn Radio 基础组件，使用原生 HTML input[type=radio] + 自定义样式实现。
 *
 * Properties:
 *   name(string): 单选组名称，同一组内 name 必须相同
 *   value(string): 该单选项的值
 *   label(string): 单选项标签文本
 *   checked(boolean): 是否选中
 *   onChange((e: React.ChangeEvent<HTMLInputElement>) => void): 选中状态变化回调
 *   disabled(boolean): 是否禁用
 *   className(string): 容器自定义样式
 */
export interface RadioFieldProps {
	/** 单选组名称 */
	name: string;
	/** 该选项的值 */
	value: string;
	/** 标签文本 */
	label: string;
	/** 是否选中 */
	checked?: boolean;
	/** 选中变化回调 */
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	/** 是否禁用 */
	disabled?: boolean;
	/** 容器自定义样式 */
	className?: string;
}

/**
 * Function: RadioField
 *
 * Description: 单选框字段组件，使用原生 input[type=radio] 实现。
 *              样式规范：16×16px 圆圈，未选中 (border ring)，选中 (--ds-accent 填充 + 内圆点)。
 *
 * Parameters:
 *   name(string): 组名
 *   value(string): 选项值
 *   label(string): 标签
 *   checked(boolean): 选中状态
 *   onChange(function): 状态回调
 *   disabled(boolean): 禁用
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 单选框字段
 *
 * Example:
 *   <RadioField name="role" value="admin" label="管理员" checked={role === 'admin'} onChange={handleChange} />
 *   <RadioField name="role" value="teacher" label="教师" checked={role === 'teacher'} onChange={handleChange} />
 */
export function RadioField({
	name,
	value,
	label,
	checked = false,
	onChange,
	disabled = false,
	className,
}: RadioFieldProps) {
	const inputId = React.useId();

	return (
		<label
			htmlFor={inputId}
			className={cn(
				"inline-flex cursor-pointer items-center gap-2.5",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
		>
			{/* 隐藏原生 radio，使用自定义样式 */}
			<span className="relative size-4 shrink-0">
				<input
					type="radio"
					id={inputId}
					name={name}
					value={value}
					checked={checked}
					onChange={onChange}
					disabled={disabled}
					className="peer sr-only"
				/>
				{/* 外圈：16×16px，未选中时 border ring，选中时 --ds-accent 背景 */}
				<span
					className={cn(
						"flex size-4 items-center justify-center rounded-full transition-colors",
						"border border-[var(--border-medium)]",
						// 选中状态：--ds-accent 填充
						"peer-checked:border-[var(--ds-accent)] peer-checked:bg-[var(--ds-accent)]",
					)}
				>
					{/* 内圆点：选中时显示白色小圆点 */}
					<span
						className={cn(
							"size-1.5 rounded-full bg-white transition-transform",
							// 选中时缩放到正常大小，未选中时缩放为 0
							checked ? "scale-100" : "scale-0",
						)}
					/>
				</span>
			</span>

			{/* 标签文本：DM Sans 500, 13px, --fg */}
			<span className="font-body text-[13px] font-medium leading-snug text-fg">
				{label}
			</span>
		</label>
	);
}

// ============================================================================
// ToggleField — 开关字段
// ============================================================================

/**
 * Type: ToggleFieldProps
 *
 * Description: 开关字段组件的属性定义
 *
 * Properties:
 *   label(string): 开关标签文本（必填）
 *   description(string): 描述文本，显示在标签下方
 *   checked(boolean): 是否开启
 *   onCheckedChange((checked: boolean) => void): 状态变化回调
 *   disabled(boolean): 是否禁用
 *   className(string): 容器自定义样式
 */
export interface ToggleFieldProps {
	/** 标签文本 */
	label: string;
	/** 描述文本 */
	description?: string;
	/** 是否开启 */
	checked?: boolean;
	/** 状态变化回调 */
	onCheckedChange?: (checked: boolean) => void;
	/** 是否禁用 */
	disabled?: boolean;
	/** 容器自定义样式 */
	className?: string;
}

/**
 * Function: ToggleField
 *
 * Description: 开关字段组件，包装 shadcn Switch，提供标签和描述文本。
 *              布局为水平排列：开关在左，标签和描述在右。
 *              设计规范：36×20px 开关轨道，开启 (--ds-accent)，关闭 (--bg)。
 *
 * Parameters:
 *   label(string): 标签文本
 *   description(string): 描述文本
 *   checked(boolean): 开启状态
 *   onCheckedChange(function): 状态回调
 *   disabled(boolean): 禁用
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 开关字段
 *
 * Example:
 *   <ToggleField
 *     label="启用通知"
 *     description="接收系统推送通知"
 *     checked={enabled}
 *     onCheckedChange={setEnabled}
 *   />
 */
export function ToggleField({
	label,
	description,
	checked,
	onCheckedChange,
	disabled = false,
	className,
}: ToggleFieldProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3",
				disabled && "pointer-events-none opacity-50",
				className,
			)}
		>
			{/* 标签 + 描述 */}
			<div className="flex flex-col gap-0.5">
				<span
					className={cn(
						// DM Sans 500, 13px, --fg 颜色
						"font-body text-[13px] font-medium leading-snug text-fg",
					)}
				>
					{label}
				</span>
				{description && (
					<span className="text-body-sm text-fg-muted">{description}</span>
				)}
			</div>

			{/* 开关：36×20px */}
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				disabled={disabled}
				className="size-9 shrink-0"
				// 自定义尺寸：宽 36px (w-9)，高 20px (h-5)
				style={{ width: "36px", height: "20px" }}
				aria-label={label}
			/>
		</div>
	);
}
