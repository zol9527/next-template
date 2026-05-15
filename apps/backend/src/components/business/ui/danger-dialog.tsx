/**
 * File: danger-dialog.tsx
 * Description: 危险操作对话框组件 — 预配置的破坏性操作确认弹窗
 *
 * 设计规范:
 * - 与 ConfirmDialog 相同布局结构，但使用危险操作样式
 * - 头部包含 AlertTriangle 危险图标（--rose 颜色）
 * - 确认按钮: --rose 背景（destructive 变体），白色文字
 * - 危险提示文本: "此操作不可恢复" 风格
 * - 对话框容器: rounded-[var(--radius-lg)], --shadow-modal, 白色背景
 * - 宽度: max-w-[400px]
 *
 * 使用场景:
 * - 删除数据、注销账户等不可逆操作
 * - 退款、撤销等高风险操作
 * - 任何需要强烈警示的破坏性操作
 */

"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: DangerDialogProps
 *
 * Description: 危险操作对话框组件的属性定义
 *
 * Properties:
 *   open(boolean): 对话框是否打开（受控模式）
 *   onOpenChange(function): 对话框打开状态变更回调
 *   title(string): 对话框标题，默认 '确认删除'
 *   description(string): 对话框描述文本（应包含不可恢复的警告信息）
 *   confirmLabel(string): 确认按钮文本，默认 '确认删除'
 *   cancelLabel(string): 取消按钮文本，默认 '取消'
 *   onConfirm(function): 确认操作回调
 *   loading(boolean): 是否显示加载状态
 *   className(string): 对话框内容区域的自定义样式类名
 */
export interface DangerDialogProps {
	/** 对话框是否打开（受控模式） */
	open: boolean;
	/** 对话框打开状态变更回调 */
	onOpenChange: (open: boolean) => void;
	/** 对话框标题 */
	title?: string;
	/** 对话框描述文本（必须包含不可恢复的警告信息） */
	description: string;
	/** 确认按钮文本 */
	confirmLabel?: string;
	/** 取消按钮文本 */
	cancelLabel?: string;
	/** 确认操作回调 */
	onConfirm: () => void;
	/** 是否显示加载状态 */
	loading?: boolean;
	/** 自定义样式类名 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: DangerDialog
 *
 * Description: 预配置的危险操作对话框，用于删除、退款等破坏性操作的二次确认。
 *              使用 --rose 颜色强调危险性，包含警告图标和不可恢复提示。
 *
 * Parameters:
 *   open(boolean): 是否打开
 *   onOpenChange(function): 状态变更回调
 *   title(string): 标题
 *   description(string): 描述
 *   confirmLabel(string): 确认按钮文本
 *   cancelLabel(string): 取消按钮文本
 *   onConfirm(function): 确认回调
 *   loading(boolean): 加载状态
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 危险操作对话框
 *
 * Example:
 *   <DangerDialog
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     title="删除课程"
 *     description="此操作将永久删除该课程及关联数据，且不可恢复。确定继续？"
 *     confirmLabel="确认删除"
 *     onConfirm={handleDelete}
 *     loading={isDeleting}
 *   />
 */
export function DangerDialog({
	open,
	onOpenChange,
	title = "确认删除",
	description,
	confirmLabel = "确认删除",
	cancelLabel = "取消",
	onConfirm,
	loading = false,
	className,
}: DangerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				// 圆角 --radius-lg, 最大宽度 400px
				className={cn(
					"max-w-[400px] rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--shadow-modal)]",
					"p-0 overflow-hidden",
					className,
				)}
				showCloseButton={false}
			>
				{/* ---- 头部：危险图标 + 标题 + 关闭按钮 ---- */}
				<div className="flex items-center gap-3 px-6 pt-5 pb-0">
					{/* 危险图标：--rose 颜色 */}
					<div
						className={cn(
							"flex size-8 shrink-0 items-center justify-center rounded-full",
							"bg-[var(--rose-subtle)]",
						)}
						aria-hidden="true"
					>
						<AlertTriangle className="size-4 text-[var(--rose)]" />
					</div>

					{/* 标题：Outfit 600, 18px, --fg */}
					<DialogTitle className="flex-1 font-display text-[18px] font-semibold leading-tight text-fg">
						{title}
					</DialogTitle>

					{/* 关闭按钮：28×28px, X 图标 */}
					<DialogClose asChild>
						<button
							type="button"
							className={cn(
								"inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)]",
								"text-fg-muted transition-colors duration-fast",
								"hover:bg-[var(--bg)] hover:text-fg-secondary",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-2",
							)}
							aria-label="关闭"
						>
							<X className="size-4" />
						</button>
					</DialogClose>
				</div>

				{/* ---- 内容区：描述文本 ---- */}
				<div className="px-6 py-3 pl-[52px]">
					<DialogDescription className="text-[14px] leading-relaxed text-fg-secondary">
						{description}
					</DialogDescription>
				</div>

				{/* ---- 底部操作区：取消 + 确认删除 ---- */}
				<DialogFooter className="flex items-center justify-end gap-3 px-6 pb-5 pt-2">
					{/* 取消按钮：outline 变体 */}
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						{cancelLabel}
					</Button>

					{/* 确认删除按钮：destructive 变体（--rose 背景），支持加载状态 */}
					<Button variant="destructive" onClick={onConfirm} disabled={loading}>
						{loading && (
							<Loader2
								className="mr-1.5 size-4 animate-spin"
								aria-hidden="true"
							/>
						)}
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
