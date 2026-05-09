'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, User, CheckCircle2 } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminOrderDetail } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import type { AdminPromoterListItem } from '@/plugins/promotion/contracts/admin-promoters.dto'
import { AdminOrderDetailResponseSchema } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date'

/**
Function: readApiErrorMessage

Description: 从 API 响应中读取错误消息

Parameters:
	res(Response): API 响应对象

Returns:
	promise(Promise<string>): 错误消息字符串
*/
async function readApiErrorMessage(res: Response): Promise<string> {
	try {
		const json = (await res.json()) as ApiResponse<unknown>
		if (!json.success) return json.error.message
	} catch {
		// ignore
	}
	return res.statusText || '请求失败'
}

/**
Function: getOrderStatusBadge

Description: 获取订单状态的徽章组件

Parameters:
	status(string): 订单状态

Returns:
	element(React.ReactElement): 状态徽章组件
*/
function getOrderStatusBadge(status: string) {
	switch (status) {
		case 'paid':
			return <Badge variant="success">已支付</Badge>
		case 'completed':
			return <Badge variant="secondary">已完成</Badge>
		case 'pending_payment':
			return <Badge variant="outline">待支付</Badge>
		case 'refunding':
			return <Badge variant="outline">退款中</Badge>
		case 'refunded':
			return <Badge variant="outline">已退款</Badge>
		case 'cancelled':
			return <Badge variant="outline">已取消</Badge>
		case 'closed':
			return <Badge variant="outline">已关闭</Badge>
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

/**
Function: AdminOrderDetailForm

Description: 管理后台订单详情对话框组件：使用 Dialog 展示订单完整信息，包括订单、商品、优惠券、推广人等详细信息。支持搜索并绑定推广人。

Parameters:
	orderId(string): 订单 ID
	onCloseAction(() => void): 关闭对话框的回调
	onSuccess(() => void): 绑定推广人成功后的回调

Returns:
	element(React.ReactElement): 订单详情对话框 UI
*/
export function AdminOrderDetailForm({
	orderId,
	onCloseAction,
	onSuccess,
}: {
	orderId: string | null
	onCloseAction: () => void
	onSuccess?: () => void
}) {
	const { toast } = useToast()
	const queryClient = useQueryClient()

	// 推广人搜索相关状态
	const [promoterSearch, setPromoterSearch] = React.useState('')
	const [promoters, setPromoters] = React.useState<AdminPromoterListItem[]>([])
	const [searchingPromoters, setSearchingPromoters] = React.useState(false)
	const [selectedPromoter, setSelectedPromoter] = React.useState<AdminPromoterListItem | null>(null)
	const [bindingPromoter, setBindingPromoter] = React.useState(false)

	// 使用 useQuery 获取订单详情
	const { data: orderDetail, isLoading, error } = useQuery<AdminOrderDetail>({
		queryKey: ['admin', 'orders', 'detail', orderId] as const,
		queryFn: async () => {
			if (!orderId) {
				throw new Error('Order ID is required')
			}

			const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
				credentials: 'include',
			})

			const json = (await res.json()) as ApiResponse<unknown>

			if (!res.ok) {
				throw new Error(await readApiErrorMessage(res))
			}

			if (!json.success) {
				throw new Error(json.error.message)
			}

			const parsed = AdminOrderDetailResponseSchema.safeParse(json.data)
			if (!parsed.success) {
				throw new Error('响应数据格式不符合预期')
			}

			return parsed.data.detail
		},
		enabled: !!orderId, // 只有当 orderId 存在时才执行查询
		staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜，避免重复请求
		gcTime: 10 * 60 * 1000, // 10 分钟后清理缓存
		refetchOnWindowFocus: false, // 窗口聚焦时不重新获取
		refetchOnMount: false, // 组件挂载时如果数据新鲜则不重新获取
	})

	// 搜索推广人 - 使用防抖优化
	React.useEffect(() => {
		if (promoterSearch.length < 2) {
			setPromoters([])
			return
		}

		const search = async () => {
			setSearchingPromoters(true)
			try {
				const params = new URLSearchParams({ limit: '20', keyword: promoterSearch })
				const res = await fetch(`/api/v1/admin/promoters?${params.toString()}`, { credentials: 'include' })
				if (!res.ok) return

				const json = (await res.json()) as ApiResponse<{ promoters: AdminPromoterListItem[] }>
				if (json.success) {
					setPromoters(json.data.promoters)
				}
			} catch {
				// ignore
			} finally {
				setSearchingPromoters(false)
			}
		}

		const timer = setTimeout(() => void search(), 300)
		return () => clearTimeout(timer)
	}, [promoterSearch])

	// 绑定推广人
	const handleBindPromoter = React.useCallback(async () => {
		if (!selectedPromoter || !orderId) return

		setBindingPromoter(true)
		try {
			const res = await fetch(`/api/v1/admin/orders/${orderId}/promoter`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promoterUserId: selectedPromoter.userId }),
				credentials: 'include',
			})

			if (!res.ok) {
				const error = await res.json()
				toast({ title: '绑定失败', description: error.error?.message || '未知错误', variant: 'destructive' })
				return
			}

			const json = (await res.json()) as ApiResponse<unknown>
			if (!json.success) {
				toast({ title: '绑定失败', description: json.error.message, variant: 'destructive' })
				return
			}

			toast({ title: '绑定成功', description: '推广人已绑定' })
			onSuccess?.()
			// 重置搜索状态
			setPromoterSearch('')
			setPromoters([])
			setSelectedPromoter(null)
			// 清除订单详情查询缓存，确保数据完全刷新
			if (orderId) {
				queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'detail', orderId] })
			}
		} catch {
			toast({ title: '绑定失败', description: '网络错误', variant: 'destructive' })
		} finally {
			setBindingPromoter(false)
		}
	}, [selectedPromoter, orderId, toast, onSuccess, queryClient])

	return (
		<Dialog open onOpenChange={(v) => !v && onCloseAction()}>
			<DialogContent size="lg" className="max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>订单详情</DialogTitle>
					<DialogDescription>查看订单完整信息和管理推广人</DialogDescription>
				</DialogHeader>
				<ScrollArea className="flex-1 min-h-0 pr-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center py-8 space-y-3">
							<div className="text-sm text-destructive font-medium">加载失败</div>
							<div className="text-xs text-muted-foreground text-center max-w-md">
								{error instanceof Error ? error.message : '未知错误'}
							</div>
						</div>
					) : orderDetail ? (
						<div className="space-y-4">
							{/* 订单基础信息 */}
							<div className="border rounded-lg p-4">
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">订单信息</h3>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="text-muted-foreground">订单号：</span>
										<span className="font-mono">{orderDetail.order.orderNo}</span>
									</div>
									<div>
										<span className="text-muted-foreground">订单 ID：</span>
										<span className="font-mono text-xs">{orderDetail.order.id}</span>
									</div>
									<div>
										<span className="text-muted-foreground">状态：</span>
										{getOrderStatusBadge(orderDetail.order.status)}
									</div>
									<div>
										<span className="text-muted-foreground">创建时间：</span>
										<span>{formatDateTime(orderDetail.order.createdAt)}</span>
									</div>
									{orderDetail.order.paidAt && (
										<div>
											<span className="text-muted-foreground">支付时间：</span>
											<span>{formatDateTime(orderDetail.order.paidAt)}</span>
										</div>
									)}
									<div>
										<span className="text-muted-foreground">应付金额：</span>
										<span className="font-semibold">¥{orderDetail.order.priceAmount}</span>
									</div>
									{orderDetail.order.paidAmount && (
										<div>
											<span className="text-muted-foreground">实付金额：</span>
											<span className="font-semibold">¥{orderDetail.order.paidAmount}</span>
										</div>
									)}
								</div>
							</div>

							{/* 商品信息 */}
							{orderDetail.product && (
								<div className="border rounded-lg p-4">
									<h3 className="text-sm font-semibold text-muted-foreground mb-3">商品信息</h3>
									<div className="flex gap-4">
										{orderDetail.product.coverUrl && (
											<img
												src={orderDetail.product.coverUrl}
												alt={orderDetail.product.name}
												className="w-16 h-16 rounded-md object-cover"
											/>
										)}
										<div>
											<div className="font-medium">{orderDetail.product.name}</div>
											<div className="text-sm text-muted-foreground">
												¥{orderDetail.product.price.amount}
												{orderDetail.product.originalPrice && (
													<span className="line-through ml-2">¥{orderDetail.product.originalPrice.amount}</span>
												)}
											</div>
											<Badge variant="outline" className="mt-1">
												{orderDetail.product.kind === 'course' ? '课程' : '证书'}
											</Badge>
										</div>
									</div>
								</div>
							)}

							{/* 优惠券信息 */}
							<div className="border rounded-lg p-4">
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">优惠券</h3>
								{orderDetail.coupon ? (
									<div className="flex items-center justify-between">
										<div>
											<div className="font-medium">{orderDetail.coupon.name}</div>
											<div className="text-sm text-muted-foreground">优惠 ¥{orderDetail.coupon.discountAmount}</div>
										</div>
										<Badge variant="secondary">已使用</Badge>
									</div>
								) : (
									<div className="text-sm text-muted-foreground">未使用优惠券</div>
								)}
							</div>

							{/* 推广人信息 */}
							<div className="border rounded-lg p-4">
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">推广信息</h3>
								{orderDetail.promoter ? (
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
												<User className="w-5 h-5 text-primary" />
											</div>
											<div>
												<div className="font-medium">{orderDetail.promoter.username || '未知用户'}</div>
												<div className="text-sm text-muted-foreground">
													等级 {orderDetail.promoter.level}
													{orderDetail.promoter.commission && (
														<span className="ml-2">佣金 ¥{orderDetail.promoter.commission.amount}</span>
													)}
												</div>
											</div>
										</div>
										<Badge variant={orderDetail.promoter.commission ? 'success' : 'outline'}>
											{orderDetail.promoter.commission ? '已生成' : '待支付'}
										</Badge>
									</div>
								) : (
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">该订单暂无推广人，可以为用户绑定推广人：</p>

										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<input
												type="text"
												placeholder="搜索推广人用户名..."
												value={promoterSearch}
												onChange={(e) => setPromoterSearch(e.target.value)}
												className="w-full h-9 pl-10 rounded-md border border-input bg-transparent px-3 text-sm"
											/>
										</div>

										{searchingPromoters && (
											<div className="flex items-center justify-center py-4">
												<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
											</div>
										)}

										{promoters.length > 0 && (
											<div className="border rounded-md">
												{promoters.map((promoter, index) => (
													<button
														key={promoter.userId}
														type="button"
														onClick={() => setSelectedPromoter(promoter)}
														className={cn(
															'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors',
															selectedPromoter?.userId === promoter.userId && 'bg-primary/10',
															index === promoters.length - 1 && 'rounded-b-md',
														)}
													>
														<div className="flex items-center gap-2">
															<User className="w-4 h-4 text-muted-foreground" />
															<span className="text-sm">{promoter.username || '未知用户'}</span>
														</div>
														<div className="flex items-center gap-2">
															<Badge variant="outline" className="text-xs">
																Lv.{promoter.currentLevel.level}
															</Badge>
															{selectedPromoter?.userId === promoter.userId && (
																<CheckCircle2 className="w-4 h-4 text-primary" />
															)}
														</div>
													</button>
												))}
											</div>
										)}

										{selectedPromoter && (
											<div className="flex items-center justify-between p-3 bg-muted/30 rounded-md mt-3">
												<div className="flex items-center gap-2">
													<CheckCircle2 className="w-4 h-4 text-primary" />
													<span className="text-sm">已选择：{selectedPromoter.username}</span>
												</div>
												<Button
													type="button"
													size="sm"
													onClick={handleBindPromoter}
													disabled={bindingPromoter}
												>
													{bindingPromoter ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
													确认绑定
												</Button>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					) : null}
				</ScrollArea>
				<DialogFooter className="flex-shrink-0">
					<Button variant="outline" onClick={onCloseAction}>
						关闭
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
