'use client'

import * as React from 'react'
import { Scroll, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useVersionReleases } from './use-version-releases'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'

/**
 * 初始每页加载数量
 */
const INITIAL_PAGE_SIZE = 10

/**
 * Function: ChangelogDropdown
 *
 * Description: 版本更新日志下拉组件，支持无限滚动加载和展开详情
 *
 * Parameters:
 * 	props(object): 组件属性对象
 *
 * Returns:
 * 	element(React.JSX.Element): 版本日志下拉组件
 */
export function ChangelogDropdown() {
	const [open, setOpen] = React.useState(false)
	const [expandedId, setExpandedId] = React.useState<string | null>(null)
	const [page, setPage] = React.useState(1)
	const [items, setItems] = React.useState<Array<{ id: string; version: string; title: string; description: string; releasedAt: string }>>([])

	// 重置状态当 popover 打开时
	React.useEffect(() => {
		if (open && items.length === 0) {
			setPage(1)
		}
	}, [open, items.length])

	// 获取版本列表
	const { data, isLoading, isError } = useVersionReleases({
		page,
		pageSize: INITIAL_PAGE_SIZE,
	})

	// 合并新数据
	React.useEffect(() => {
		if (data?.data?.items) {
			if (page === 1) {
				setItems(data.data.items)
			} else {
				setItems((prev) => {
					const newItems = data.data.items.filter(
						(item) => !prev.some((existing) => existing.id === item.id),
					)
					return [...prev, ...newItems]
				})
			}
		}
	}, [data, page])

	const hasMore = data ? items.length < data.data.total : false

	/**
	 * 处理无限滚动加载
	 */
	const loadMoreRef = React.useRef<HTMLDivElement>(null)

	React.useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !isLoading && page < (data?.data.totalPages ?? 1)) {
					setPage((prev) => prev + 1)
				}
			},
			{ threshold: 0.1 },
		)

		const currentRef = loadMoreRef.current
		if (currentRef) {
			observer.observe(currentRef)
		}

		return () => {
			if (currentRef) {
				observer.unobserve(currentRef)
			}
		}
	}, [hasMore, isLoading, page, data])

	/**
	 * 切换展开/收起状态
	 */
	const toggleExpanded = (id: string) => {
		setExpandedId((prev) => (prev === id ? null : id))
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9"
					aria-label="查看更新日志"
				>
					<Scroll className="h-5 w-5" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[420px] p-0"
				align="end"
				sideOffset={4}
			>
				{/* 头部 */}
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="font-semibold text-sm">更新日志</h3>
					{data?.data && (
						<span className="text-xs text-muted-foreground">共 {data.data.total} 个版本</span>
					)}
				</div>

				{/* 列表内容 */}
				<ScrollArea className="h-[500px]">
					<div className="px-2">
						{isError && (
							<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
								加载失败，请稍后重试
							</div>
						)}

						{items.length === 0 && !isLoading && !isError && (
							<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
								暂无更新记录
							</div>
						)}

						{items.map((item) => (
							<div
								key={item.id}
								className="border-b last:border-b-0"
							>
								{/* 版本头部 - 可点击展开 */}
								<button
									type="button"
									onClick={() => toggleExpanded(item.id)}
									className="w-full text-left px-3 py-3 hover:bg-accent/50 transition-colors flex items-start gap-3"
								>
									{/* 版本号徽章 */}
									<Badge variant="secondary" className="shrink-0 text-xs">
										{item.version}
									</Badge>

									{/* 标题和日期 */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<span className="font-medium text-sm truncate">{item.title}</span>
											{expandedId === item.id ? (
												<ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
											) : (
												<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
											)}
										</div>
										<span className="text-xs text-muted-foreground">
											{format(new Date(item.releasedAt), 'yyyy年MM月dd日', { locale: zhCN })}
										</span>
									</div>
								</button>

								{/* 展开的详细内容 */}
								{expandedId === item.id && (
									<div className="px-3 pb-3 pl-14">
										<div className="prose prose-sm max-w-none dark:prose-invert">
											<ReactMarkdown>{item.description}</ReactMarkdown>
										</div>
									</div>
								)}
							</div>
						))}

						{/* 加载更多指示器 */}
						<div ref={loadMoreRef} className="py-4">
							{isLoading && (
								<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>加载中...</span>
								</div>
							)}

							{!hasMore && items.length > 0 && (
								<div className="flex items-center justify-center text-xs text-muted-foreground">
									已加载全部版本
								</div>
							)}
						</div>
					</div>
				</ScrollArea>
			</PopoverContent>
		</Popover>
	)
}
