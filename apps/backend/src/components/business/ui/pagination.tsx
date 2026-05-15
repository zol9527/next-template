/**
 * File: pagination.tsx
 * Description: 分页组件 — 用于数据列表的页面导航
 *
 * 设计规范:
 * - 页码按钮: 32×32px，--radius-sm 圆角
 * - 激活态: --ds-accent 背景 + 白色文字
 * - 默认态: 悬停时 --surface-alt 背景
 * - 上/下一页: 使用 lucide-react 的 ChevronLeft/ChevronRight 图标
 * - 大页码范围时显示省略号
 * - 支持 siblingCount 控制当前页两侧显示的页码数量
 *
 * 使用场景:
 * - 数据表格分页
 * - 列表页分页
 * - 搜索结果分页
 */

"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// 类型定义
// ============================================

/**
 * Type: PaginationProps
 *
 * Description: 分页组件的 props
 *
 * Properties:
 *     currentPage(number): 当前页码（从 1 开始，必填）
 *     totalPages(number): 总页数（必填）
 *     onPageChange(function): 页码切换回调（必填）
 *     siblingCount(number): 当前页两侧显示的兄弟页码数（默认 1）
 *     className(string): 自定义样式类名
 */
export interface PaginationProps {
	/** 当前页码（从 1 开始） */
	currentPage: number;
	/** 总页数 */
	totalPages: number;
	/** 页码切换回调 */
	onPageChange: (page: number) => void;
	/** 当前页两侧显示的兄弟页码数，默认 1 */
	siblingCount?: number;
	/** 自定义样式类名 */
	className?: string;
}

// ============================================
// 工具函数
// ============================================

/**
 * Type: PaginationRange
 *
 * Description: 分页范围项的类型
 * - 'page': 具体页码
 * - 'start-ellipsis': 起始省略号
 * - 'end-ellipsis': 末尾省略号
 */
type PaginationRange = number | "start-ellipsis" | "end-ellipsis";

/**
 * Function: generatePaginationRange
 *
 * Description: 生成页码范围数组，包含页码数字和省略号标记
 *             算法: 始终显示第一页和最后一页，当前页两侧显示 siblingCount 个页码，
 *                   不足以覆盖的中间范围用省略号代替
 *
 * Parameters:
 *     currentPage(number): 当前页码
 *     totalPages(number): 总页数
 *     siblingCount(number): 当前页两侧显示的兄弟页码数
 *
 * Returns:
 *     PaginationRange[]: 页码范围数组
 *
 * Example:
 *     generatePaginationRange(5, 10, 1) // [1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 10]
 *     generatePaginationRange(3, 7, 1)  // [1, 2, 3, 4, 5, 6, 7]
 *     generatePaginationRange(1, 20, 1) // [1, 2, 3, 'end-ellipsis', 20]
 */
function generatePaginationRange(
	currentPage: number,
	totalPages: number,
	siblingCount: number,
): PaginationRange[] {
	// 总共需要显示的页码数量: 首页 + 末页 + 当前页 + 两侧兄弟页 × 2
	const totalDisplayed = siblingCount * 2 + 5; // 5 = 首页 + 末页 + 当前页 + 2个省略号位

	// 如果总页数小于等于需要显示的数量，显示所有页码
	if (totalPages <= totalDisplayed) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}

	const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
	const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

	// 判断是否需要显示起始/末尾省略号
	const showStartEllipsis = leftSiblingIndex > 2;
	const showEndEllipsis = rightSiblingIndex < totalPages - 1;

	const range: PaginationRange[] = [];

	// 始终显示第一页
	range.push(1);

	if (showStartEllipsis) {
		range.push("start-ellipsis");
	} else {
		// 不需要省略号时，填充首页到左侧兄弟页之间的页码
		for (let i = 2; i < leftSiblingIndex; i++) {
			range.push(i);
		}
	}

	// 当前页及其兄弟页
	for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
		range.push(i);
	}

	if (showEndEllipsis) {
		range.push("end-ellipsis");
	} else {
		// 不需要省略号时，填充右侧兄弟页到末页之间的页码
		for (let i = rightSiblingIndex + 1; i < totalPages; i++) {
			range.push(i);
		}
	}

	// 始终显示最后一页
	if (totalPages > 1) {
		range.push(totalPages);
	}

	return range;
}

// ============================================
// 子组件: 页码按钮
// ============================================

/**
 * Type: PageButtonProps
 *
 * Description: 页码按钮的 props
 */
interface PageButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	isActive?: boolean;
}

/**
 * Function: PageButton
 *
 * Description: 单个页码按钮，支持激活态和默认态样式
 */
const PageButton = React.memo(
	React.forwardRef<HTMLButtonElement, PageButtonProps>(
		({ isActive = false, className, children, ...props }, ref) => {
			return (
				<button
					ref={ref}
					type="button"
					className={cn(
						// 32×32px 固定尺寸
						"inline-flex items-center justify-center h-8 w-8",
						// 圆角
						"rounded-[var(--radius-sm)]",
						// 字体
						"text-[13px] font-medium",
						// 移除默认按钮样式
						"border-none outline-none cursor-pointer",
						// 平滑过渡
						"transition-all duration-150 ease-default",
						// 条件样式
						isActive
							? [
									// 激活态: 暖橙主色背景 + 白色文字
									"bg-[var(--ds-accent)] text-white",
								]
							: [
									// 默认态: 次要文字色
									"text-[var(--fg-secondary)]",
									// 悬停态: 浅色背景
									"hover:bg-[var(--surface-alt)]",
								],
						className,
					)}
					{...props}
				>
					{children}
				</button>
			);
		},
	),
);
PageButton.displayName = "PageButton";

// ============================================
// 主组件
// ============================================

/**
 * Function: Pagination
 *
 * Description: 分页组件 — 用于数据列表的页面导航
 *             包含上/下一页箭头、页码按钮和省略号
 *
 * Parameters:
 *     currentPage(number): 当前页码（从 1 开始，必填）
 *     totalPages(number): 总页数（必填）
 *     onPageChange((page: number) => void): 页码切换回调（必填）
 *     siblingCount(number): 当前页两侧显示的兄弟页码数，默认 1
 *     className(string): 自定义样式类名
 *
 * Returns:
 *     React.ReactElement: 渲染后的分页组件
 *
 * Example:
 *     // 基础用法
 *     <Pagination
 *       currentPage={1}
 *       totalPages={10}
 *       onPageChange={(page) => setCurrentPage(page)}
 *     />
 *
 *     // 自定义兄弟页码数量
 *     <Pagination
 *       currentPage={5}
 *       totalPages={50}
 *       siblingCount={2}
 *       onPageChange={handlePageChange}
 *     />
 */
export const Pagination = React.memo(
	React.forwardRef<HTMLDivElement, PaginationProps>(
		(
			{
				currentPage,
				totalPages,
				onPageChange,
				siblingCount = 1,
				className,
				...props
			},
			ref,
		) => {
			// 安全边界: 总页数至少为 1
			const safeTotalPages = Math.max(1, totalPages);
			// 安全边界: 当前页在有效范围内
			const safeCurrentPage = Math.max(
				1,
				Math.min(currentPage, safeTotalPages),
			);

			// 生成页码范围
			const paginationRange = React.useMemo(
				() =>
					generatePaginationRange(
						safeCurrentPage,
						safeTotalPages,
						siblingCount,
					),
				[safeCurrentPage, safeTotalPages, siblingCount],
			);

			// 是否可以上一页/下一页
			const canPrevPage = safeCurrentPage > 1;
			const canNextPage = safeCurrentPage < safeTotalPages;

			return (
				<nav
					ref={ref}
					aria-label="分页导航"
					className={cn("flex items-center gap-1", className)}
					{...props}
				>
					{/* 上一页按钮 */}
					<PageButton
						onClick={() => canPrevPage && onPageChange(safeCurrentPage - 1)}
						disabled={!canPrevPage}
						aria-label="上一页"
						className={cn(
							!canPrevPage && [
								"opacity-40 cursor-not-allowed",
								"hover:bg-transparent", // 禁用状态不显示悬停效果
							],
						)}
					>
						<ChevronLeft size={16} />
					</PageButton>

					{/* 页码按钮列表 */}
					{paginationRange.map((item, _index) => {
						// 省略号: 使用 MoreHorizontal 图标
						if (typeof item === "string") {
							return (
								<span
									key={item}
									className="inline-flex items-center justify-center h-8 w-8 text-[var(--fg-muted)]"
									aria-hidden="true"
								>
									<MoreHorizontal size={16} />
								</span>
							);
						}

						// 页码按钮
						return (
							<PageButton
								key={item}
								isActive={item === safeCurrentPage}
								onClick={() => onPageChange(item)}
								aria-label={`第 ${item} 页`}
								aria-current={item === safeCurrentPage ? "page" : undefined}
							>
								{item}
							</PageButton>
						);
					})}

					{/* 下一页按钮 */}
					<PageButton
						onClick={() => canNextPage && onPageChange(safeCurrentPage + 1)}
						disabled={!canNextPage}
						aria-label="下一页"
						className={cn(
							!canNextPage && [
								"opacity-40 cursor-not-allowed",
								"hover:bg-transparent", // 禁用状态不显示悬停效果
							],
						)}
					>
						<ChevronRight size={16} />
					</PageButton>
				</nav>
			);
		},
	),
);

Pagination.displayName = "Pagination";
