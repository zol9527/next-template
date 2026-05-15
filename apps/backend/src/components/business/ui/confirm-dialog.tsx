/**
 * File: confirm-dialog.tsx
 * Description: 确认对话框组件 — 预配置的非破坏性确认弹窗
 *
 * 设计规范:
 * - 标题: Outfit 600, 18px, --fg 颜色
 * - 描述: DM Sans 400, 14px, --fg-secondary 颜色
 * - 关闭按钮: X 图标, 28×28px, 右上角
 * - 底部操作: 取消按钮 (outline) + 确认按钮 (--ds-accent 主色)
 * - 对话框容器: rounded-[var(--radius-lg)], --shadow-modal, 白色背景
 * - 宽度: max-w-[400px]
 *
 * 使用场景:
 * - 通用确认操作（如：提交、发布、状态变更等非破坏性操作）
 * - 需要用户二次确认的场景
 */

"use client";

import { Loader2, X } from "lucide-react";
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
 * Type: ConfirmDialogProps
 *
 * Description: 确认对话框组件的属性定义
 *
 * Properties:
 *   open(boolean): 对话框是否打开（受控模式）
 *   onOpenChange(function): 对话框打开状态变更回调
 *   title(string): 对话框标题
 *   description(string): 对话框描述文本，用于说明操作内容
 *   confirmLabel(string): 确认按钮文本，默认 '确认'
 *   cancelLabel(string): 取消按钮文本，默认 '取消'
 *   onConfirm(function): 确认操作回调
 *   loading(boolean): 是否显示加载状态（禁用确认按钮并显示 spinner）
 *   className(string): 对话框内容区域的自定义样式类名
 */
export interface ConfirmDialogProps {
	/** 对话框是否打开（受控模式） */
	open: boolean;
	/** 对话框打开状态变更回调 */
	onOpenChange: (open: boolean) => void;
	/** 对话框标题 */
	title: string;
	/** 对话框描述文本 */
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
 * Function: ConfirmDialog
 *
 * Description: 预配置的确认对话框，用于非破坏性操作的二次确认。
 *              基于项目 Dialog + Button 组件构建，遵循 NextAdmin 设计规范。
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
 *   JSX.Element: 确认对话框
 *
 * Example:
 *   <ConfirmDialog
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     title="发布课程"
 *     description="确认发布该课程？发布后将立即对学员可见。"
 *     confirmLabel="发布"
 *     onConfirm={handlePublish}
 *     loading={isPublishing}
 *   />
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "确认",
	cancelLabel = "取消",
	onConfirm,
	loading = false,
	className,
}: ConfirmDialogProps) {
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
				{/* ---- 头部：标题 + 关闭按钮 ---- */}
				<div className="flex items-center justify-between px-6 pt-5 pb-0">
					{/* 标题：Outfit 600, 18px, --fg */}
					<DialogTitle className="font-display text-[18px] font-semibold leading-tight text-fg">
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
				<div className="px-6 py-3">
					<DialogDescription className="text-[14px] leading-relaxed text-fg-secondary">
						{description}
					</DialogDescription>
				</div>

				{/* ---- 底部操作区：取消 + 确认 ---- */}
				<DialogFooter className="flex items-center justify-end gap-3 px-6 pb-5 pt-2">
					{/* 取消按钮：outline 变体 */}
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
					>
						{cancelLabel}
					</Button>

					{/* 确认按钮：主色 --ds-accent，支持加载状态 */}
					<Button variant="solid" onClick={onConfirm} disabled={loading}>
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
