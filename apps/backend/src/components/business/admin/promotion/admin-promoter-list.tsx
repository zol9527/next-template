'use client'

import * as React from 'react'
import { Loader2, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
	User,
	Calendar,
	Crown,
	DollarSign,
	ShoppingCart,
	Users,
	TrendingUp,
	Wallet,
	Snowflake,
	CheckCircle2,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { DataTable } from '@/components/ui/data-table'
import { getPromoterColumns } from '@/components/business/admin/promotion/admin-promoter-columns'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminPromoterListItem, AdminPromoterListResponse } from '@/plugins/promotion/contracts/admin-promoters.dto'
import type { PromoterProfile } from '@/plugins/promotion/contracts/promoter.dto'

/**
Component: AdminPromoterList

Description: 后台推广员列表组件，提供搜索、筛选、分页和操作功能

Parameters:
	refreshKey(number): 外部刷新触发器
	setRefreshKey(function): 设置刷新键的函数

Returns:
	JSX.Element: 推广员列表 UI
*/
export function AdminPromoterList(props: { refreshKey: number; setRefreshKey: React.Dispatch<React.SetStateAction<number>> }) {
	const { toast } = useToast()
	const [items, setItems] = React.useState<AdminPromoterListItem[]>([])
	const [loading, setLoading] = React.useState(false)
	const [search, setSearch] = React.useState('')
	const [nextCursor, setNextCursor] = React.useState<string | null>(null)
	const [prevCursors, setPrevCursors] = React.useState<string[]>([])

	// 选中的推广员（用于详情查看和等级调整）
	const [selectedPromoter, setSelectedPromoter] = React.useState<AdminPromoterListItem | null>(null)
	const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
	const [levelModalOpen, setLevelModalOpen] = React.useState(false)

	const debouncedSearch = useDebounce(search, 500)

	const load = React.useCallback(
		async (cursor?: string | null, direction: 'next' | 'prev' = 'next') => {
			setLoading(true)
			try {
				const params = new URLSearchParams({
					limit: '50',
					...(debouncedSearch && { keyword: debouncedSearch }),
					...(cursor && { cursor }),
				})

				const res = await fetch(`/api/v1/admin/promoters?${params.toString()}`, {
					credentials: 'include',
				})

				if (!res.ok) {
					toast({ title: '加载失败', description: res.statusText, variant: 'destructive' })
					return
				}

				const json = (await res.json()) as ApiResponse<AdminPromoterListResponse>
				if (!json.success) {
					toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
					return
				}

				setItems(json.data.promoters)
				setNextCursor(json.data.nextCursor)

				// 更新游标历史
				if (direction === 'next' && cursor) {
					setPrevCursors((prev) => [...prev, cursor])
				} else if (direction === 'prev') {
					setPrevCursors((prev) => prev.slice(0, -1))
				}
			} catch {
				toast({ title: '加载失败', description: '网络错误，请稍后再试', variant: 'destructive' })
			} finally {
				setLoading(false)
			}
		},
		[debouncedSearch, toast],
	)

	React.useEffect(() => {
		void load()
	}, [load, props.refreshKey])

	const handleNextPage = () => {
		if (nextCursor) {
			void load(nextCursor, 'next')
		}
	}

	const handlePrevPage = () => {
		const prevCursor = prevCursors[prevCursors.length - 2]
		void load(prevCursor || null, 'prev')
	}

	const handleViewDetail = React.useCallback((promoter: AdminPromoterListItem) => {
		setSelectedPromoter(promoter)
		setDetailDialogOpen(true)
	}, [])

	const handleAdjustLevel = React.useCallback((promoter: AdminPromoterListItem) => {
		setSelectedPromoter(promoter)
		setLevelModalOpen(true)
	}, [])

	const columns = React.useMemo(
		() => getPromoterColumns({
			onViewDetail: handleViewDetail,
			onAdjustLevel: handleAdjustLevel,
		}),
		[handleAdjustLevel, handleViewDetail],
	)

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex flex-row items-center justify-between gap-4 flex-shrink-0">
					<div>
						<h2 className="text-lg font-bold">推广员列表</h2>
						<p className="text-xs text-foreground/60 mt-0.5">查看所有推广员信息</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
							<Input
								type="text"
								placeholder="搜索用户名..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9 w-48 bg-background/50"
							/>
						</div>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={loading}
							onClick={() => void load()}
						>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
						</Button>
					</div>
				</div>
				<DataTable
					columns={columns}
					data={items}
					pagination={{
						nextCursor,
						prevCursors,
						isLoading: loading,
						onNextPage: handleNextPage,
						onPrevPage: handlePrevPage,
						onPageSizeChange: () => {},
						pageSize: 50,
						totalCount: items.length,
						totalRecords: items.length,
					}}
				/>
			</div>

			{/* 详情查看弹窗 */}
			{selectedPromoter && (
				<AdminPromoterDetailDialog
					promoterUserId={selectedPromoter.userId}
					open={detailDialogOpen}
					onOpenChange={setDetailDialogOpen}
					onRefresh={() => {
						props.setRefreshKey((prev) => prev + 1)
					}}
				/>
			)}

			{/* 等级调整弹窗 */}
			{selectedPromoter && (
				<AdminPromoterLevelModal
					promoter={selectedPromoter}
					open={levelModalOpen}
					onOpenChange={setLevelModalOpen}
					onSuccess={() => {
						props.setRefreshKey((prev) => prev + 1)
						setLevelModalOpen(false)
					}}
				/>
			)}
		</>
	)
}

// ============ 详情 Dialog 组件 ============

/**
Component: AdminPromoterDetailDialog

Description: 推广员详情弹窗组件

Parameters:
	promoterUserId(string): 推广员用户 ID
	open(boolean): 是否打开
	onOpenChange(function): 打开状态变更回调
	onRefresh(function): 刷新回调

Returns:
	JSX.Element: 详情弹窗组件
*/
function AdminPromoterDetailDialog({
	promoterUserId,
	open,
	onOpenChange,
	onRefresh,
}: {
	promoterUserId: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onRefresh: () => void
}) {
	const { toast } = useToast()
	const [detail, setDetail] = React.useState<PromoterProfile | null>(null)
	const [loading, setLoading] = React.useState(false)

	const loadDetail = React.useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch(`/api/v1/admin/promoters/${promoterUserId}`, {
				credentials: 'include',
			})
			if (!res.ok) {
				toast({ title: '加载失败', description: res.statusText, variant: 'destructive' })
				return
			}

			const json = (await res.json()) as ApiResponse<PromoterProfile>
			if (!json.success) {
				toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
				return
			}

			setDetail(json.data)
			// 刷新回调
			onRefresh?.()
		} catch {
			toast({ title: '加载失败', description: '网络错误', variant: 'destructive' })
		} finally {
			setLoading(false)
		}
	}, [onRefresh, promoterUserId, toast])

	React.useEffect(() => {
		if (open) {
			void loadDetail()
		}
	}, [open, loadDetail])

	const getLevelColor = (level: number) => {
		const colors = {
			1: {
				bg: 'bg-muted/20',
				text: 'text-muted-foreground',
				accent: 'text-muted-foreground/70',
				badge: 'bg-muted/30 text-muted-foreground border-muted/30',
				label: '青铜',
				iconColor: 'from-muted-foreground/40 to-muted-foreground/50',
			},
			2: {
				bg: 'bg-info/20',
				text: 'text-info-foreground',
				accent: 'text-info-foreground/80',
				badge: 'bg-info/20 text-info-foreground border-info/30',
				label: '白银',
				iconColor: 'from-info to-info/80',
			},
			3: {
				bg: 'bg-warning/20',
				text: 'text-warning-foreground',
				accent: 'text-warning-foreground/80',
				badge: 'bg-warning/20 text-warning-foreground border-warning/30',
				label: '黄金',
				iconColor: 'from-warning to-warning/80',
			},
			4: {
				bg: 'bg-primary/20',
				text: 'text-primary-foreground',
				accent: 'text-primary-foreground/80',
				badge: 'bg-primary/20 text-primary-foreground border-primary/30',
				label: '钻石',
				iconColor: 'from-primary to-primary/80',
			},
		}
		return colors[level as keyof typeof colors] || colors[1]
	}

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('zh-CN', {
			style: 'currency',
			currency: 'CNY',
		}).format(Number(amount) || 0)
	}

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-'
		return new Date(dateStr).toLocaleString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col p-0">
				{/* 头部 */}
				<div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
					<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
					<div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-lg">
							<div className="p-1.5 rounded-lg bg-primary/10">
								<User className="w-4 h-4 text-primary" />
							</div>
							推广员详情
						</DialogTitle>
					</DialogHeader>

					{loading ? (
						<div className="flex items-center gap-4 mt-6">
							<div className="h-14 w-14 rounded-full bg-primary/10 animate-pulse" />
							<div className="flex-1 space-y-2">
								<div className="h-4 w-32 bg-primary/10 rounded animate-pulse" />
								<div className="h-3 w-24 bg-primary/10 rounded animate-pulse" />
							</div>
						</div>
					) : detail ? (
						<div className="flex items-center gap-4 mt-6">
							<div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold">
								{detail.username?.[0]?.toUpperCase() || '?'}
							</div>
							<div className="flex-1 min-w-0">
								<h3 className="text-base font-semibold truncate">{detail.username || '未设置用户名'}</h3>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-xs text-foreground/50 font-mono">ID: {detail.userId.slice(0, 12)}...</span>
								</div>
							</div>
							<div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
								{detail.currentLevel.name}
							</div>
						</div>
					) : null}
				</div>

				{/* 内容区域 */}
				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
					{loading ? (
						<div className="space-y-4">
							{[1, 2, 3, 4].map((i) => (
								<div key={i} className="h-20 bg-primary/5 animate-pulse" />
							))}
						</div>
					) : detail ? (
						<div className="space-y-4">
							{/* 等级卡片 */}
							<div className={cn('p-4 border', getLevelColor(detail.currentLevel.level).bg)}>
								<div className="flex items-center gap-4">
									<div className={cn('p-3 bg-gradient-to-br', getLevelColor(detail.currentLevel.level).iconColor)}>
										<Crown className="w-5 h-5 text-white" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<span className={cn('font-semibold text-lg', getLevelColor(detail.currentLevel.level).text)}>
												{detail.currentLevel.name}
											</span>
											<div className={cn('text-xs px-2 py-0.5 rounded', getLevelColor(detail.currentLevel.level).badge)}>
												Lv.{detail.currentLevel.level}
											</div>
										</div>
										<div className="flex items-center gap-2 mt-1.5 text-sm text-foreground/60">
											<span>佣金比例</span>
											<span className={cn('font-mono font-medium', getLevelColor(detail.currentLevel.level).accent)}>
												{Number(detail.currentLevel.commissionRate) * 100}%
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* 佣金统计 */}
							<div>
								<h4 className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-3 px-1">佣金收益</h4>
								<div className="grid grid-cols-2 gap-3">
									<div className="group relative p-4 bg-muted/10 border border-border/10 hover:border-success/30 transition-colors">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs text-foreground/60">累计佣金</span>
											<div className="p-1 rounded-lg bg-success/10">
												<DollarSign className="w-3.5 h-3.5 text-success" />
											</div>
										</div>
										<div className="font-semibold text-success">{formatCurrency(detail.totalCommission)}</div>
									</div>
									<div className="group relative p-4 bg-muted/10 border border-border/10 hover:border-info/30 transition-colors">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs text-foreground/60">可提现</span>
											<div className="p-1 rounded-lg bg-info/10">
												<Wallet className="w-3.5 h-3.5 text-info" />
											</div>
										</div>
										<div className="font-semibold text-info">{formatCurrency(detail.payableCommission)}</div>
									</div>
									<div className="group relative p-4 bg-muted/10 border border-border/10 hover:border-warning/30 transition-colors">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs text-foreground/60">冻结中</span>
											<div className="p-1 rounded-lg bg-warning/10">
												<Snowflake className="w-3.5 h-3.5 text-warning" />
											</div>
										</div>
										<div className="font-semibold text-warning">{formatCurrency(detail.frozenCommission)}</div>
									</div>
									<div className="group relative p-4 bg-muted/10 border border-border/10 hover:border-primary/30 transition-colors">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs text-foreground/60">已结算</span>
											<div className="p-1 rounded-lg bg-primary/10">
												<CheckCircle2 className="w-3.5 h-3.5 text-primary" />
											</div>
										</div>
										<div className="font-semibold text-primary">{formatCurrency(detail.settledCommission)}</div>
									</div>
								</div>
							</div>

							<Separator />

							{/* 销售数据 */}
							<div>
								<h4 className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-3 px-1">业绩数据</h4>
								<div className="grid grid-cols-3 gap-3">
									<div className="p-4 bg-background/80 border hover:border-primary/20 transition-colors">
										<div className="flex items-center gap-2 mb-2 text-foreground/50">
											<ShoppingCart className="w-4 h-4" />
											<span className="text-xs">订单数</span>
										</div>
										<div className="text-xl font-bold">{detail.totalOrders}</div>
										<div className="text-xs text-foreground/40 mt-1">单</div>
									</div>
									<div className="p-4 bg-background/80 border hover:border-primary/20 transition-colors">
										<div className="flex items-center gap-2 mb-2 text-foreground/50">
											<TrendingUp className="w-4 h-4" />
											<span className="text-xs">销售额</span>
										</div>
										<div className="text-xl font-bold truncate">{formatCurrency(detail.totalSalesAmount)}</div>
									</div>
									<div className="p-4 bg-background/80 border hover:border-primary/20 transition-colors">
										<div className="flex items-center gap-2 mb-2 text-foreground/50">
											<Users className="w-4 h-4" />
											<span className="text-xs">下级</span>
										</div>
										<div className="text-xl font-bold">{detail.subPromoterCount}</div>
										<div className="text-xs text-foreground/40 mt-1">人</div>
									</div>
								</div>
							</div>

							<Separator />

							{/* 时间信息 */}
							<div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-primary/5 border">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10">
										<Calendar className="w-4 h-4 text-primary" />
									</div>
									<div>
										<div className="text-xs text-foreground/50">等级更新时间</div>
										<div className="text-sm font-medium mt-0.5">{formatDate(detail.levelUpdatedAt)}</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<div className="p-4 rounded-full bg-primary/5 mb-4">
								<User className="w-8 h-8 text-primary/30" />
							</div>
							<span className="text-foreground/40">暂无数据</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

// ============ 等级调整 Modal 组件 ============

/**
Component: AdminPromoterLevelModal

Description: 推广员等级调整弹窗组件

Parameters:
	promoter(AdminPromoterListItem): 推广员信息
	open(boolean): 是否打开
	onOpenChange(function): 打开状态变更回调
	onSuccess(function): 成功回调

Returns:
	JSX.Element: 等级调整弹窗组件
*/
function AdminPromoterLevelModal({
	promoter,
	open,
	onOpenChange,
	onSuccess,
}: {
	promoter: AdminPromoterListItem
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}) {
	const { toast } = useToast()
	const [submitting, setSubmitting] = React.useState(false)
	const [levelId, setLevelId] = React.useState(promoter.currentLevel.id)
	const [reason, setReason] = React.useState('')

	const handleSubmit = async () => {
		setSubmitting(true)
		try {
			const res = await fetch(`/api/v1/admin/promoters/${promoter.userId}/level`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ levelId, reason }),
			})

			if (!res.ok) {
				toast({ title: '调整失败', description: res.statusText, variant: 'destructive' })
				return
			}

			const json = (await res.json()) as ApiResponse<unknown>
			if (!json.success) {
				toast({ title: '调整失败', description: json.error.message, variant: 'destructive' })
				return
			}

			toast({ title: '成功', description: '等级调整成功' })
			onSuccess()
		} catch {
			toast({ title: '调整失败', description: '网络错误', variant: 'destructive' })
		} finally {
			setSubmitting(false)
		}
	}

	// TODO: 从 API 获取所有等级
	const levels = [
		{ id: '1', name: '青铜', level: 1 },
		{ id: '2', name: '白银', level: 2 },
		{ id: '3', name: '黄金', level: 3 },
		{ id: '4', name: '钻石', level: 4 },
	]

	return (
		<div className={cn(!open && 'hidden')}>
			<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
				<div className="bg-background rounded-xl border border-border/10 shadow-xl p-6 w-[420px] space-y-5">
					<div className="flex items-center gap-3 pb-4 border-b border-border/10">
						<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
							<Crown className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h3 className="text-lg font-bold">调整推广员等级</h3>
							<p className="text-xs text-muted-foreground">手动调整推广员等级及说明</p>
						</div>
					</div>

					<div className="space-y-4">
						<div className="p-3 bg-muted/50 rounded-lg border border-border/5">
							<div className="text-xs text-muted-foreground mb-1">当前用户</div>
							<div className="font-medium truncate">{promoter.username || promoter.userId}</div>
						</div>

						<div className="p-3 bg-muted/50 rounded-lg border border-border/5">
							<div className="text-xs text-muted-foreground mb-1">当前等级</div>
							<div className="font-medium">{promoter.currentLevel.name}</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">选择新等级</Label>
							<Select value={levelId} onValueChange={setLevelId}>
								<SelectTrigger className="h-10">
									<SelectValue placeholder="选择等级" />
								</SelectTrigger>
								<SelectContent>
									{levels.map((level) => (
										<SelectItem key={level.id} value={level.id}>
											<div className="flex items-center gap-2">
												<span className="font-medium">{level.name}</span>
												<span className="text-xs text-muted-foreground">Lv.{level.level}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">调整原因（可选）</Label>
							<Textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="请输入调整原因..."
								rows={3}
								className="resize-none"
							/>
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-4 border-t border-border/10">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
							取消
						</Button>
						<Button type="button" disabled={submitting} onClick={handleSubmit} className="h-10 gap-2">
							{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							确认调整
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
