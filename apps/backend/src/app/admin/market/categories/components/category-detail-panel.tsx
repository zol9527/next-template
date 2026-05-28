"use client";

import {
	Activity,
	CheckCircle,
	ChevronRight,
	Code2,
	Edit2,
	Folder,
	GripVertical,
	Plus,
	Search,
	Zap,
} from "lucide-react";
import * as React from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { AdminCategory } from "@/plugins/ecommerce/contracts/admin-categories.dto";

interface CategoryDetailPanelProps {
	/** 当前选中的分类 */
	selectedCategory: AdminCategory | null;
	/** 选中分类的子分类 */
	childCategories: AdminCategory[];
	/** 编辑回调 */
	onEdit: (category: AdminCategory) => void;
	/** 删除回调 */
	onDelete: (categoryId: string) => void;
	/** 添加子分类回调 */
	onCreateChild: () => void;
	/** 切换状态回调 */
	onToggleStatus: (category: AdminCategory) => void;
	/** 删除操作是否进行中 */
	isDeleting?: boolean;
}

/**
 * 右栏：分类详情面板
 *
 * 展示选中分类的 KPI 指标、子分类列表表格、拖拽排序提示等。
 * 未选中分类时显示空状态占位提示。
 */
export function CategoryDetailPanel({
	selectedCategory,
	childCategories,
	onEdit,
	onDelete,
	onCreateChild,
	onToggleStatus,
	isDeleting,
}: CategoryDetailPanelProps) {
	// 删除确认 Dialog 状态
	const [deleteTarget, setDeleteTarget] = React.useState<AdminCategory | null>(
		null,
	);
	// 子分类筛选状态
	const [filterStatus, setFilterStatus] = React.useState<
		"all" | "active" | "disabled"
	>("all");

	// 按筛选条件过滤子分类
	const filteredChildren = React.useMemo(() => {
		if (filterStatus === "all") return childCategories;
		return childCategories.filter((c) => c.status === filterStatus);
	}, [childCategories, filterStatus]);

	// 各状态子分类数量
	const activeCount = childCategories.filter(
		(c) => c.status === "active",
	).length;
	const disabledCount = childCategories.filter(
		(c) => c.status === "disabled",
	).length;

	// 格式化日期为 YYYY-MM-DD
	const formatDate = (dateStr?: string) => {
		if (!dateStr) return "-";
		return dateStr.slice(0, 10);
	};

	// ===== 空状态：未选中分类 =====
	if (!selectedCategory) {
		return (
			<div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full min-h-[400px] text-fg-muted">
				<div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
					<Search className="h-6 w-6 text-fg-muted/50" />
				</div>
				<p className="text-body-sm text-fg-muted">选择左侧分类查看详情</p>
			</div>
		);
	}

	return (
		<div className="flex-1 min-w-0 py-6 px-7">
			<div className="flex flex-col">
				{/* ===== 1. 面包屑行 ===== */}
				<div className="flex items-center justify-between mb-5">
					{/* 左侧：面包屑路径 */}
					<div className="flex items-center gap-1.5">
						<span className="text-[13px] text-fg-muted">全部分类</span>
						<ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
						<span className="text-[13px] font-semibold text-fg">
							{selectedCategory.name}
						</span>
						<span className="ml-2 rounded-full bg-ds-accent-subtle px-2.5 py-0.75 text-[11px] font-medium text-ds-accent">
							{childCategories.length} 个子分类
						</span>
					</div>

					{/* 右侧：操作按钮 */}
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-lg border border-border-strong py-1.5 px-3.5 text-[13px] text-fg-secondary transition-colors hover:bg-surface-alt"
							onClick={() => onEdit(selectedCategory)}
						>
							<Edit2 className="h-3.5 w-3.5" />
							编辑分类
						</button>
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-lg bg-ds-accent py-1.5 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ds-accent-hover"
							onClick={onCreateChild}
						>
							<Plus className="h-3.5 w-3.5" />
							添加子分类
						</button>
					</div>
				</div>

				{/* ===== 2. KPI 指标卡片行 ===== */}
				<div className="flex gap-4 mb-5">
					{/* 商品总数 */}
					<div className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-surface-alt py-3.5 px-4.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ds-accent-subtle">
							<Code2 className="h-[18px] w-[18px] text-ds-accent" />
						</div>
						<div>
							<p className="font-display text-[18px] font-semibold leading-tight text-fg">
								86
							</p>
							<p className="text-[11px] leading-tight text-fg-muted">
								商品总数
							</p>
						</div>
					</div>

					{/* 子分类数 */}
					<div className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-surface-alt py-3.5 px-4.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-subtle">
							<Folder className="h-[18px] w-[18px] text-teal" />
						</div>
						<div>
							<p className="font-display text-[18px] font-semibold leading-tight text-fg">
								{childCategories.length}
							</p>
							<p className="text-[11px] leading-tight text-fg-muted">
								子分类数
							</p>
						</div>
					</div>

					{/* 排序权重 */}
					<div className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-surface-alt py-3.5 px-4.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-subtle">
							<Activity className="h-[18px] w-[18px] text-gold" />
						</div>
						<div>
							<p className="font-display text-[18px] font-semibold leading-tight text-fg">
								{selectedCategory.sortOrder}
							</p>
							<p className="text-[11px] leading-tight text-fg-muted">
								排序权重
							</p>
						</div>
					</div>

					{/* 分类状态（可点击切换） */}
					<button
						type="button"
						className="flex flex-1 items-center gap-3 rounded-xl border border-border-default bg-surface-alt py-3.5 px-4.5 text-left transition-colors hover:bg-surface"
						onClick={() => onToggleStatus(selectedCategory)}
					>
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-subtle">
							<CheckCircle className="h-[18px] w-[18px] text-teal" />
						</div>
						<div>
							<p className="font-display text-[18px] font-semibold leading-tight text-fg">
								{selectedCategory.status === "active" ? "已启用" : "已禁用"}
							</p>
							<p className="text-[11px] leading-tight text-fg-muted">
								分类状态
							</p>
						</div>
					</button>
				</div>

				{/* ===== 3. 子分类列表标题 + 筛选 ===== */}
				<div className="flex items-center justify-between mb-3">
					<h2 className="heading-2">子分类列表</h2>

					{/* 筛选药丸 */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							className={cn(
								"flex items-center gap-1 rounded-full px-2.5 py-1.25 transition-colors",
								filterStatus === "all"
									? "bg-ds-accent-subtle"
									: "hover:bg-surface-alt",
							)}
							onClick={() => setFilterStatus("all")}
						>
							<span
								className={cn(
									"text-xs",
									filterStatus === "all"
										? "font-medium text-ds-accent"
										: "text-fg-secondary",
								)}
							>
								全部
							</span>
							<span
								className={cn(
									"text-[10px] leading-none",
									filterStatus === "all"
										? "font-semibold text-ds-accent"
										: "text-fg-muted",
								)}
							>
								{childCategories.length}
							</span>
						</button>
						<button
							type="button"
							className={cn(
								"flex items-center gap-1 rounded-full px-2.5 py-1.25 transition-colors",
								filterStatus === "active"
									? "bg-ds-accent-subtle"
									: "hover:bg-surface-alt",
							)}
							onClick={() => setFilterStatus("active")}
						>
							<span
								className={cn(
									"text-xs",
									filterStatus === "active"
										? "font-medium text-ds-accent"
										: "text-fg-secondary",
								)}
							>
								已启用
							</span>
							<span
								className={cn(
									"text-[10px] leading-none",
									filterStatus === "active"
										? "font-semibold text-ds-accent"
										: "text-fg-muted",
								)}
							>
								{activeCount}
							</span>
						</button>
						<button
							type="button"
							className={cn(
								"flex items-center gap-1 rounded-full px-2.5 py-1.25 transition-colors",
								filterStatus === "disabled"
									? "bg-ds-accent-subtle"
									: "hover:bg-surface-alt",
							)}
							onClick={() => setFilterStatus("disabled")}
						>
							<span
								className={cn(
									"text-xs",
									filterStatus === "disabled"
										? "font-medium text-ds-accent"
										: "text-fg-secondary",
								)}
							>
								已禁用
							</span>
							<span
								className={cn(
									"text-[10px] leading-none",
									filterStatus === "disabled"
										? "font-semibold text-ds-accent"
										: "text-fg-muted",
								)}
							>
								{disabledCount}
							</span>
						</button>
					</div>
				</div>

				{/* ===== 4. 子分类表格 ===== */}
				<div className="overflow-clip rounded-xl border border-border-default">
					{/* 表头 */}
					<div className="flex items-center border-b border-border-default bg-surface-alt py-2.25 px-5">
						<div className="w-10 shrink-0" />
						<div className="w-50 shrink-0 text-overline">分类名称</div>
						<div className="w-25 shrink-0 text-overline">商品数</div>
						<div className="w-25 shrink-0 text-overline">排序</div>
						<div className="w-25 shrink-0 text-overline">状态</div>
						<div className="w-30 shrink-0 text-overline">创建时间</div>
						<div className="grow text-overline">操作</div>
					</div>

					{/* 表格内容 */}
					{filteredChildren.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-body-sm text-fg-muted">
								{filterStatus === "all"
									? "暂无子分类，点击上方按钮添加"
									: "该筛选条件下暂无子分类"}
							</p>
						</div>
					) : (
						filteredChildren.map((child, index) => (
							<div
								key={child.id}
								className={cn(
									"flex items-center px-5 py-3 transition-colors hover:bg-[rgba(38,37,30,0.02)]",
									index < filteredChildren.length - 1 &&
										"border-b border-border-default",
								)}
							>
								{/* 拖拽手柄 */}
								<div className="flex w-10 shrink-0 items-center justify-center">
									<GripVertical className="h-3.5 w-3.5 text-fg-muted" />
								</div>

								{/* 分类名称 */}
								<div className="flex w-50 shrink-0 items-center gap-3">
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-subtle">
										<Zap className="h-4 w-4 text-teal" />
									</div>
									<div className="min-w-0">
										<p className="truncate text-[13px] font-medium text-fg">
											{child.name}
										</p>
										{child.slug && (
											<p className="truncate text-[11px] text-fg-muted">
												{child.slug}
											</p>
										)}
									</div>
								</div>

								{/* 商品数 */}
								<div
									className="w-25 shrink-0 text-[12.5px] text-fg-secondary"
									style={{ fontFamily: "var(--font-mono)" }}
								>
									-
								</div>

								{/* 排序 */}
								<div
									className="w-25 shrink-0 text-[12.5px] text-fg-secondary"
									style={{ fontFamily: "var(--font-mono)" }}
								>
									{child.sortOrder}
								</div>

								{/* 状态药丸 */}
								<div className="w-25 shrink-0">
									<span
										className={cn(
											"inline-flex items-center gap-1.25 rounded-full py-0.75 px-2.5 text-[11.5px] font-medium",
											child.status === "active"
												? "bg-teal-subtle text-teal"
												: "bg-rose-subtle text-rose",
										)}
									>
										<span
											className={cn(
												"size-1.25 rounded-full",
												child.status === "active" ? "bg-teal" : "bg-rose",
											)}
										/>
										{child.status === "active" ? "已启用" : "已禁用"}
									</span>
								</div>

								{/* 创建时间 */}
								<div className="w-30 shrink-0 text-[12px] text-fg-muted">
									{formatDate(child.createdAt)}
								</div>

								{/* 操作 */}
								<div className="flex grow items-center gap-4">
									<button
										type="button"
										className="text-[13px] text-ds-accent transition-colors hover:text-ds-accent-hover"
										onClick={() => onEdit(child)}
									>
										编辑
									</button>
									<button
										type="button"
										className="text-[13px] text-fg-secondary transition-colors hover:text-fg"
									>
										查看商品
									</button>
									<button
										type="button"
										className="text-[13px] text-rose transition-colors hover:text-rose/80"
										onClick={() => setDeleteTarget(child)}
									>
										删除
									</button>
								</div>
							</div>
						))
					)}
				</div>

				{/* ===== 5. 底部拖拽提示栏 ===== */}
				<div className="mt-4 flex items-center gap-1.5 rounded-lg border border-dashed border-ds-accent/20 bg-ds-accent/5 py-2.5 px-4">
					<GripVertical className="h-3.5 w-3.5 text-ds-accent" />
					<p className="text-[12px] text-fg-secondary">
						拖拽行可调整子分类排序，也可在编辑时修改排序权重
					</p>
				</div>
			</div>

			{/* ===== 删除确认 AlertDialog ===== */}
			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>确认删除分类</AlertDialogTitle>
						<AlertDialogDescription>
							确认删除「{deleteTarget?.name}
							」？若存在子分类或关联商品将无法删除，此操作不可撤销。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deleteTarget) {
									onDelete(deleteTarget.id);
									setDeleteTarget(null);
								}
							}}
							disabled={isDeleting}
						>
							{isDeleting ? "删除中..." : "确认删除"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
