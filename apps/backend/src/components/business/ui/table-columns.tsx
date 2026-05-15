/**
 * File: table-columns.tsx
 * Description: 业务表格列模式 — 预构建的表格单元格渲染组件
 *
 * 包含 5 种列渲染模式:
 * - UserColumn: 用户列（头像 + 姓名 + 邮箱）
 * - StatusColumn: 状态列（药丸 + 色点 + 语义色）
 * - AmountColumn: 金额列（等宽字体 + 语义色）
 * - OrderIdColumn: 编号列（等宽字体 + 前缀）
 * - ActionColumn: 操作列（图标按钮组）
 *
 * 设计令牌参考:
 * - 头像: 30px pill, 渐变背景 135deg
 * - 状态药丸: pill 圆角, 5×5px 色点
 * - 金额: JetBrains Mono, tabular-nums
 * - 编号: JetBrains Mono, --fg-secondary
 * - 操作按钮: 32×32px icon buttons
 */

"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// 渐变色预设（用于用户头像背景）
// ============================================

/**
 * Constant: AVATAR_GRADIENTS
 *
 * Description: 头像渐变色预设，135deg 方向，使用色板中的两色渐变
 * 通过用户名 hash 值循环选取，确保同一用户始终显示相同颜色
 */
const AVATAR_GRADIENTS = [
	"linear-gradient(135deg, #f54e00, #c08532)", // 暖橙 → 金棕
	"linear-gradient(135deg, #1f8a65, #8b6f47)", // 青绿 → 棕色
	"linear-gradient(135deg, #c08532, #dfa88f)", // 金棕 → 桃色
	"linear-gradient(135deg, #cf2d56, #f54e00)", // 玫红 → 暖橙
	"linear-gradient(135deg, #8b6f47, #1f8a65)", // 棕色 → 青绿
	"linear-gradient(135deg, #dfa88f, #cf2d56)", // 桃色 → 玫红
] as const;

/**
 * Function: getGradientForName
 *
 * Description: 根据用户名生成稳定的渐变色索引
 * 使用简单的字符串 hash 算法，确保同一名称始终映射到同一渐变色
 *
 * Parameters:
 *     name(string): 用户名
 *
 * Returns:
 *     string: CSS linear-gradient 值
 */
function getGradientForName(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// ============================================
// UserColumn — 用户列
// ============================================

/**
 * Type: UserColumnProps
 *
 * Description: 用户列组件的 props
 *
 * Properties:
 *     name(string): 用户名（必填）
 *     email(string): 邮箱地址（可选）
 *     avatar(string): 头像显示文字，默认取名字首字（可选）
 *     avatarUrl(string): 头像图片 URL，优先于文字头像（可选）
 *     className(string): 自定义样式类名
 */
export interface UserColumnProps {
	name: string;
	email?: string;
	/** 头像显示文字，默认取名字首字 */
	avatar?: string;
	/** 头像图片 URL，优先于文字头像 */
	avatarUrl?: string;
	className?: string;
}

/**
 * Function: UserColumn
 *
 * Description: 用户列渲染组件
 * 水平布局: 圆形头像(30px, 渐变背景) + 姓名 + 邮箱
 *
 * 设计规范:
 * - 头像: 30px, pill 圆角, 135deg 渐变背景（使用色板双色）
 * - 姓名: DM Sans 500, 13px, --fg
 * - 邮箱: DM Sans 400, 11.5px, --fg-muted
 *
 * Parameters:
 *     props(UserColumnProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的用户列单元格
 *
 * Example:
 *     <UserColumn name="张明远" email="zhang@example.com" />
 *     <UserColumn name="李思琪" avatarUrl="/avatars/li.jpg" />
 */
const UserColumn = React.memo(function UserColumn({
	name,
	email,
	avatar,
	avatarUrl,
	className,
}: UserColumnProps) {
	// 头像显示文字：优先使用传入的 avatar，否则取名字首字
	const initials = avatar ?? name.slice(0, 2).toUpperCase();
	const gradient = getGradientForName(name);

	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* 圆形头像 — 30px, pill, 渐变背景 */}
			<div
				className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
				style={avatarUrl ? undefined : { background: gradient }}
				aria-hidden="true"
			>
				{avatarUrl ? (
					<img
						src={avatarUrl}
						alt={name}
						className="h-full w-full rounded-full object-cover"
						loading="lazy"
					/>
				) : (
					<span>{initials}</span>
				)}
			</div>

			{/* 姓名 + 邮箱 */}
			<div className="flex flex-col gap-0.5 min-w-0">
				<span className="text-[13px] font-medium text-[var(--fg)] truncate">
					{name}
				</span>
				{email && (
					<span className="text-[11.5px] text-[var(--fg-muted)] truncate">
						{email}
					</span>
				)}
			</div>
		</div>
	);
});

// ============================================
// StatusColumn — 状态列
// ============================================

/**
 * Type: StatusVariant
 *
 * Description: 状态列支持的语义变体
 */
export type StatusVariant =
	| "success"
	| "warning"
	| "error"
	| "neutral"
	| "info";

/**
 * Type: StatusColumnProps
 *
 * Description: 状态列组件的 props
 *
 * Properties:
 *     variant(StatusVariant): 语义色变体
 *     label(string): 状态显示文本
 *     className(string): 自定义样式类名
 */
export interface StatusColumnProps {
	/** 语义色变体 */
	variant?: StatusVariant;
	/** 状态显示文本 */
	label: string;
	className?: string;
}

/**
 * Constant: STATUS_STYLES
 *
 * Description: 各语义变体的样式映射
 * 背景色使用 8% 透明度的语义色，文字色使用对应语义色
 */
const STATUS_STYLES: Record<
	StatusVariant,
	{ bg: string; text: string; dot: string }
> = {
	success: {
		bg: "bg-[rgba(31,138,101,0.08)]",
		text: "text-[#1f8a65]",
		dot: "bg-[#1f8a65]",
	},
	warning: {
		bg: "bg-[rgba(192,133,50,0.08)]",
		text: "text-[#c08532]",
		dot: "bg-[#c08532]",
	},
	error: {
		bg: "bg-[rgba(207,45,86,0.08)]",
		text: "text-[#cf2d56]",
		dot: "bg-[#cf2d56]",
	},
	neutral: {
		bg: "bg-[var(--bg)]",
		text: "text-[var(--fg-secondary)]",
		dot: "bg-[var(--fg-muted)]",
	},
	info: {
		bg: "bg-[rgba(245,78,0,0.08)]",
		text: "text-[#f54e00]",
		dot: "bg-[#f54e00]",
	},
};

/**
 * Function: StatusColumn
 *
 * Description: 状态列渲染组件
 * 药丸(pill) + 色点(5px) + 语义色文字
 *
 * 设计规范:
 * - 容器: pill 圆角, 语义色浅底
 * - 色点: 5×5px 圆形
 * - 文字: DM Sans 500, 11.5px, 语义色
 *
 * Parameters:
 *     props(StatusColumnProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的状态药丸
 *
 * Example:
 *     <StatusColumn variant="success" label="已完成" />
 *     <StatusColumn variant="warning" label="退款中" />
 */
const StatusColumn = React.memo(function StatusColumn({
	variant = "neutral",
	label,
	className,
}: StatusColumnProps) {
	const styles = STATUS_STYLES[variant];

	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
				"text-[11.5px] font-medium",
				styles.bg,
				styles.text,
				className,
			)}
		>
			{/* 5×5px 色点 */}
			<span
				className={cn("inline-block h-[5px] w-[5px] rounded-full", styles.dot)}
				aria-hidden="true"
			/>
			{label}
		</div>
	);
});

// ============================================
// AmountColumn — 金额列
// ============================================

/**
 * Type: AmountColumnProps
 *
 * Description: 金额列组件的 props
 *
 * Properties:
 *     amount(number): 金额数值
 *     currency(string): 货币符号，默认 '¥'
 *     className(string): 自定义样式类名
 */
export interface AmountColumnProps {
	/** 金额数值 */
	amount: number;
	/** 货币符号 */
	currency?: string;
	className?: string;
}

/**
 * Function: AmountColumn
 *
 * Description: 金额列渲染组件
 * 等宽字体(mono) + tabular-nums + 语义色（负数用 --rose）
 *
 * 设计规范:
 * - 字体: JetBrains Mono, tabular-nums
 * - 正数: --fg 颜色
 * - 负数: --rose 颜色
 * - 格式: ¥1,280.00 / -¥320.50
 *
 * Parameters:
 *     props(AmountColumnProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的金额单元格
 *
 * Example:
 *     <AmountColumn amount={1280} />
 *     <AmountColumn amount={-320.5} />
 */
const AmountColumn = React.memo(function AmountColumn({
	amount,
	currency = "¥",
	className,
}: AmountColumnProps) {
	const isNegative = amount < 0;
	// 格式化金额：保留两位小数，添加千分位分隔符
	const formatted = Math.abs(amount).toLocaleString("zh-CN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return (
		<span
			className={cn(
				"font-mono text-[13px] tabular-nums",
				isNegative ? "text-[var(--rose)]" : "text-[var(--fg)]",
				className,
			)}
		>
			{isNegative && "-"}
			{currency}
			{formatted}
		</span>
	);
});

// ============================================
// OrderIdColumn — 编号列
// ============================================

/**
 * Type: OrderIdColumnProps
 *
 * Description: 编号列组件的 props
 *
 * Properties:
 *     id(string): 编号值
 *     prefix(string): 前缀符号，默认 '#'
 *     className(string): 自定义样式类名
 */
export interface OrderIdColumnProps {
	/** 编号值 */
	id: string;
	/** 前缀符号 */
	prefix?: string;
	className?: string;
}

/**
 * Function: OrderIdColumn
 *
 * Description: 编号列渲染组件
 * JetBrains Mono + --fg-secondary 颜色
 *
 * 设计规范:
 * - 字体: JetBrains Mono (--font-mono)
 * - 字号: 12px
 * - 颜色: --fg-secondary
 * - 格式: #ED20260512001
 *
 * Parameters:
 *     props(OrderIdColumnProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的编号单元格
 *
 * Example:
 *     <OrderIdColumn id="ED20260512001" />
 *     <OrderIdColumn id="12345" prefix="NO." />
 */
const OrderIdColumn = React.memo(function OrderIdColumn({
	id,
	prefix = "#",
	className,
}: OrderIdColumnProps) {
	return (
		<span
			className={cn(
				"font-mono text-[12px] text-[var(--fg-secondary)] tabular-nums",
				className,
			)}
		>
			{prefix}
			{id}
		</span>
	);
});

// ============================================
// ActionColumn — 操作列
// ============================================

/**
 * Type: ActionItem
 *
 * Description: 单个操作按钮的配置
 *
 * Properties:
 *     icon(LucideIcon): 图标组件
 *     label(string): 按钮标签（用于 tooltip）
 *     onClick(function): 点击处理函数
 *     danger(boolean): 是否为危险操作（使用 rose 色）
 *     disabled(boolean): 是否禁用
 */
export interface ActionItem {
	/** 图标组件 */
	icon: LucideIcon;
	/** 按钮标签（用于 tooltip） */
	label: string;
	/** 点击处理函数 */
	onClick: () => void;
	/** 是否为危险操作（hover 时使用 --rose 色） */
	danger?: boolean;
	/** 是否禁用 */
	disabled?: boolean;
}

/**
 * Type: ActionColumnProps
 *
 * Description: 操作列组件的 props
 *
 * Properties:
 *     actions(ActionItem[]): 操作按钮配置数组
 *     className(string): 自定义样式类名
 */
export interface ActionColumnProps {
	/** 操作按钮配置数组 */
	actions: ActionItem[];
	className?: string;
}

/**
 * Function: ActionColumn
 *
 * Description: 操作列渲染组件
 * 水平排列的图标按钮组（32×32px），带 tooltip
 *
 * 设计规范:
 * - 按钮尺寸: 32×32px
 * - 圆角: --radius-sm (8px)
 * - 间距: gap-1 (4px)
 * - 普通按钮: ghost 变体, hover 显示浅灰背景
 * - 危险按钮: ghost 变体, hover 显示 --rose-subtle 背景 + --rose 文字
 * - 每个按钮有 title 属性作为 tooltip
 *
 * Parameters:
 *     props(ActionColumnProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的操作按钮组
 *
 * Example:
 *     <ActionColumn actions={[
 *       { icon: Eye, label: '查看', onClick: handleView },
 *       { icon: Edit, label: '编辑', onClick: handleEdit },
 *       { icon: Trash2, label: '删除', onClick: handleDelete, danger: true },
 *     ]} />
 */
const ActionColumn = React.memo(function ActionColumn({
	actions,
	className,
}: ActionColumnProps) {
	return (
		<div className={cn("flex items-center gap-1", className)}>
			{actions.map((action, index) => {
				const Icon = action.icon;
				return (
					<Button
						key={`${action.label}-${index}`}
						variant="ghost"
						size="icon"
						className={cn(
							"h-8 w-8 rounded-[var(--radius-sm)]",
							action.danger &&
								"hover:bg-[rgba(207,45,86,0.08)] hover:text-[#cf2d56]",
						)}
						onClick={action.onClick}
						disabled={action.disabled}
						title={action.label}
						aria-label={action.label}
					>
						<Icon className="h-4 w-4" />
					</Button>
				);
			})}
		</div>
	);
});

// ============================================
// 导出
// ============================================

export { ActionColumn, AmountColumn, OrderIdColumn, StatusColumn, UserColumn };
