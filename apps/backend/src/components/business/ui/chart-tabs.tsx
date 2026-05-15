/**
 * File: chart-tabs.tsx
 * Description: 图表标签页组件 — 用于图表区域内的快捷切换
 *
 * 设计规范:
 * - pill 圆角小按钮组，3px 间距
 * - 默认态: --surface 背景 + --border 边框 + --fg-secondary 文字
 * - 激活态: --ds-accent 背景 + 白色文字
 * - 过渡动画: 0.15s ease
 *
 * 使用场景:
 * - Dashboard 图表的时间范围切换（7天/30天/90天）
 * - 数据维度的快速切换
 * - 图表类型的切换
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// 类型定义
// ============================================

/**
 * Type: ChartTab
 *
 * Description: 单个标签页的数据结构
 *
 * Properties:
 *     key(string): 标签页的唯一标识，用于 activeTab 匹配和 onTabChange 回调
 *     label(string): 标签页显示的文本
 */
export interface ChartTab {
	/** 标签页唯一标识 */
	key: string;
	/** 标签页显示文本 */
	label: string;
}

/**
 * Type: ChartTabsProps
 *
 * Description: 图表标签页组件的 props
 *
 * Properties:
 *     tabs(ChartTab[]): 标签页配置数组
 *     activeTab(string): 当前激活的标签页 key
 *     onTabChange(function): 标签页切换回调
 *     className(string): 自定义样式类名
 */
export interface ChartTabsProps {
	/** 标签页配置数组（必填） */
	tabs: ChartTab[];
	/** 当前激活的标签页 key（必填，受控模式） */
	activeTab: string;
	/** 标签页切换回调（必填） */
	onTabChange: (key: string) => void;
	/** 自定义样式类名 */
	className?: string;
}

// ============================================
// 组件实现
// ============================================

/**
 * Function: ChartTabs
 *
 * Description: 图表标签页组件 — pill 圆角小按钮组，用于图表区域内的快捷切换
 *             采用受控模式，由父组件管理 activeTab 状态
 *
 * Parameters:
 *     tabs(ChartTab[]): 标签页配置数组
 *     activeTab(string): 当前激活标签页的 key
 *     onTabChange((key: string) => void): 切换回调
 *     className(string): 自定义样式类名
 *
 * Returns:
 *     React.ReactElement: 渲染后的标签页组
 *
 * Example:
 *     const tabs = [
 *       { key: '7d', label: '7天' },
 *       { key: '30d', label: '30天' },
 *       { key: '90d', label: '90天' },
 *     ]
 *
 *     <ChartTabs
 *       tabs={tabs}
 *       activeTab="30d"
 *       onTabChange={(key) => setTimeRange(key)}
 *     />
 */
export const ChartTabs = React.memo(
	React.forwardRef<HTMLDivElement, ChartTabsProps>(
		({ tabs, activeTab, onTabChange, className, ...props }, ref) => {
			return (
				<div
					ref={ref}
					className={cn("inline-flex items-center gap-[3px]", className)}
					role="tablist"
					aria-label="图表数据切换"
					{...props}
				>
					{tabs.map((tab) => {
						const isActive = tab.key === activeTab;

						return (
							<button
								key={tab.key}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => onTabChange(tab.key)}
								className={cn(
									// pill 圆角
									"rounded-[var(--radius-pill)]",
									// 内边距: Paper Design — paddingBlock 4px, paddingInline 11px
									"px-[11px] py-1",
									// 字体
									"text-[13px] font-medium",
									// 移除默认按钮样式
									"border-none outline-none cursor-pointer",
									// 平滑过渡
									"transition-all duration-150 ease-default",
									// 条件样式: 激活态 vs 默认态
									isActive
										? [
												// 激活态: 暖橙主色背景 + 白色文字
												"bg-[var(--ds-accent)] text-white",
											]
										: [
												// 默认态: 白色背景 + 边框 + 次要文字色
												"bg-[var(--surface)] text-[var(--fg-secondary)]",
												"border border-[var(--border-default)]",
												// 悬停态: 轻微背景变化
												"hover:bg-[var(--surface-alt)]",
											],
								)}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			);
		},
	),
);

ChartTabs.displayName = "ChartTabs";
