"use client";

import {
	BarChart3,
	Brain,
	ChevronDown,
	ChevronRight,
	Code2,
	type LucideIcon,
	PenTool,
	Plus,
	Search,
	Users,
	Zap,
} from "lucide-react";
import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AdminCategory } from "@/plugins/ecommerce/contracts/admin-categories.dto";

/**
 * 树形节点扩展类型
 */
export interface CategoryNode extends AdminCategory {
	children?: CategoryNode[];
}

/**
 * 构建分类树形结构
 */
export function buildCategoryTree(items: AdminCategory[]): CategoryNode[] {
	const itemMap = new Map<string, CategoryNode>();
	for (const item of items) {
		itemMap.set(item.id, { ...item });
	}

	const roots: CategoryNode[] = [];
	for (const item of items) {
		const node = itemMap.get(item.id);
		if (!node) continue;
		if (item.parentId) {
			const parent = itemMap.get(item.parentId);
			if (parent) {
				parent.children = parent.children || [];
				parent.children.push(node);
			}
		} else {
			roots.push(node);
		}
	}

	return roots;
}

/**
 * 根分类颜色配置
 *
 * 每个根分类根据索引分配唯一的颜色图标，循环使用
 */
const CATEGORY_COLORS = [
	{ bg: "bg-ds-accent-subtle", text: "text-ds-accent", icon: Code2 }, // 编程开发 - 橙色
	{ bg: "bg-gold-subtle", text: "text-gold", icon: Brain }, // 人工智能 - 金棕
	{ bg: "bg-rose-subtle", text: "text-rose", icon: PenTool }, // 设计创意 - 玫红
	{ bg: "bg-brown-subtle", text: "text-brown", icon: BarChart3 }, // 数据分析 - 棕色
	{ bg: "bg-peach-subtle", text: "text-peach", icon: Users }, // 职场技能 - 桃色
] as const satisfies { bg: string; text: string; icon: LucideIcon }[];

interface CategoryTreePanelProps {
	/** 分类列表 */
	categories: AdminCategory[];
	/** 树形结构 */
	categoryTree: CategoryNode[];
	/** 当前选中的分类 ID */
	selectedCategoryId: string | null;
	/** 展开的节点集合 */
	expandedIds: Set<string>;
	/** 选中变化回调 */
	onSelect: (id: string) => void;
	/** 展开/折叠切换回调 */
	onToggleExpand: (id: string) => void;
	/** 展开全部/折叠全部回调 */
	onToggleAll: () => void;
	/** 新建分类回调 */
	onCreateCategory: () => void;
	/** 根分类数量（底部统计） */
	rootCount: number;
	/** 商品总数（底部统计，mock 数据） */
	totalProducts: number;
}

/**
 * 左栏：分类树面板 (280px)
 *
 * 结构: 标题栏（含新建按钮）→ 搜索框 → 树列表 → 底部统计
 */
export function CategoryTreePanel({
	categoryTree,
	selectedCategoryId,
	expandedIds,
	onSelect,
	onToggleExpand,
	onCreateCategory,
	rootCount,
	totalProducts,
}: CategoryTreePanelProps) {
	const [treeSearch, setTreeSearch] = React.useState("");

	/**
	 * 渲染根分类节点
	 */
	function renderRootNodes(nodes: CategoryNode[]): React.ReactNode[] {
		const result: React.ReactNode[] = [];
		const query = treeSearch.toLowerCase().trim();

		nodes.forEach((node, index) => {
			const isExpanded = expandedIds.has(node.id);
			const isSelected = selectedCategoryId === node.id;
			const hasChildren = (node.children?.length ?? 0) > 0;
			const matchesSearch = !query || node.name.toLowerCase().includes(query);

			// 搜索时：如果自身不匹配且无子分类匹配则跳过
			if (
				!matchesSearch &&
				!node.children?.some((child) =>
					child.name.toLowerCase().includes(query),
				)
			) {
				return;
			}

			// 根据索引分配颜色
			const colorConfig = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
			const ColorIcon = colorConfig.icon;

			// 商品计数：根分类显示子分类数量（children.length）作为产品计数占位
			const productCount = node.children?.length ?? 0;

			result.push(
				<React.Fragment key={node.id}>
					{/* 根分类行 */}
					<button
						type="button"
						className={cn(
							"flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-left",
							"transition-colors duration-150",
							!isSelected && "hover:bg-[rgba(38,37,30,0.04)]",
							isSelected && "bg-ds-accent-subtle",
						)}
						onClick={() => {
							onSelect(node.id);
							if (hasChildren) {
								onToggleExpand(node.id);
							}
						}}
					>
						{/* 展开/折叠箭头 */}
						{hasChildren ? (
							<span
								className={cn(
									"flex h-[14px] w-[14px] shrink-0 items-center justify-center",
									isSelected || isExpanded ? "text-ds-accent" : "text-fg-muted",
								)}
							>
								{isExpanded ? (
									<ChevronDown className="h-[14px] w-[14px]" strokeWidth={2} />
								) : (
									<ChevronRight className="h-[14px] w-[14px]" strokeWidth={2} />
								)}
							</span>
						) : (
							<span className="w-[14px] shrink-0" />
						)}

						{/* 颜色图标 */}
						<span
							className={cn(
								"flex h-5 w-5 shrink-0 items-center justify-center rounded-sm",
								colorConfig.bg,
							)}
						>
							<ColorIcon
								className={cn("h-3 w-3", colorConfig.text)}
								strokeWidth={2}
							/>
						</span>

						{/* 分类名称 */}
						<span
							className={cn(
								"flex-1 truncate",
								"text-[13px] font-medium",
								isSelected ? "text-ds-accent" : "text-fg",
							)}
						>
							{node.name}
						</span>

						{/* 商品计数药丸 */}
						{productCount > 0 && (
							<span className="flex shrink-0 items-center rounded-full bg-[rgba(38,37,30,0.04)] px-2 py-[1px] text-[11px] text-fg-muted">
								{productCount}
							</span>
						)}
					</button>

					{/* 子分类列表（展开时渲染） */}
					{isExpanded && hasChildren && (
						<div className="flex flex-col gap-0.5 pl-[30px]">
							{(node.children ?? []).map((child) => {
								const isChildSelected = selectedCategoryId === child.id;
								const childMatchesSearch =
									!query || child.name.toLowerCase().includes(query);

								if (!childMatchesSearch) return null;

								return (
									<button
										type="button"
										key={child.id}
										className={cn(
											"flex w-full items-center gap-2 rounded-lg px-2 py-[5px] text-left",
											"transition-colors duration-150",
											!isChildSelected && "hover:bg-[rgba(38,37,30,0.04)]",
											isChildSelected && "bg-ds-accent-subtle",
										)}
										onClick={() => onSelect(child.id)}
									>
										{/* 青色闪电图标 */}
										<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-teal-subtle">
											<Zap
												className="h-[10px] w-[10px] text-teal"
												strokeWidth={2}
											/>
										</span>

										{/* 子分类名称 */}
										<span
											className={cn(
												"flex-1 truncate text-[12px]",
												isChildSelected
													? "text-ds-accent font-medium"
													: "text-fg-secondary",
											)}
										>
											{child.name}
										</span>

										{/* 子分类计数 */}
										<span className="shrink-0 text-[10px] text-fg-muted">
											{child.children?.length ?? 0}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</React.Fragment>,
			);
		});

		return result;
	}

	return (
		<div className="flex w-[280px] shrink-0 flex-col">
			{/* 标题栏 */}
			<div className="flex items-center justify-between border-b border-border-default px-4 py-3">
				<h3
					className="text-fg"
					style={{
						fontFamily: "var(--font-display)",
						fontWeight: 600,
						fontSize: "14px",
						lineHeight: 1.3,
					}}
				>
					分类目录
				</h3>
				{/* 新建按钮 - 橙色药丸 */}
				<button
					type="button"
					className="flex items-center gap-1 rounded-full bg-ds-accent px-2.5 py-1 text-white"
					style={{
						fontFamily: "var(--font-body)",
						fontWeight: 500,
						fontSize: "11px",
						lineHeight: 1.3,
					}}
					onClick={onCreateCategory}
				>
					<Plus className="h-3 w-3" strokeWidth={2} />
					新建
				</button>
			</div>

			{/* 搜索框 */}
			<div className="px-4 py-3">
				<div className="flex h-8 items-center gap-2 rounded-full bg-bg border border-border-default px-3">
					<Search
						className="h-[14px] w-[14px] shrink-0 text-fg-muted"
						strokeWidth={2}
					/>
					<input
						type="text"
						value={treeSearch}
						onChange={(e) => setTreeSearch(e.target.value)}
						placeholder="搜索分类..."
						className="flex-1 bg-transparent text-fg outline-none placeholder:text-fg-muted"
						style={{ fontFamily: "var(--font-body)", fontSize: "12px" }}
					/>
				</div>
			</div>

			{/* 树列表 */}
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-0.5 px-3 py-1">
					{categoryTree.length === 0 ? (
						<div className="py-8 text-center text-caption text-fg-muted">
							暂无分类
						</div>
					) : (
						renderRootNodes(categoryTree)
					)}
				</div>
			</ScrollArea>

			{/* 底部统计 */}
			<div className="flex items-center justify-between border-t border-border-default px-5 py-3">
				<span
					className="text-fg-muted"
					style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
				>
					共 {rootCount} 个根分类
				</span>
				<span
					className="text-fg-muted"
					style={{ fontFamily: "var(--font-body)", fontSize: "11px" }}
				>
					共 {totalProducts} 件商品
				</span>
			</div>
		</div>
	);
}
