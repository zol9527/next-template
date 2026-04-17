'use client'

import * as React from 'react'
import { Loader2, Mail, Calendar, Activity, Award, UserPlus, Copy, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminPromoterDetail } from '@/plugins/promotion/contracts/admin-promoters.dto'

/**
Component: AdminPromoterDetailContent

Description: 推广员详情内容组件，显示推广员的完整信息和统计数据

Parameters:
	promoterUserId(string): 推广员用户 ID

Returns:
	JSX.Element: 详情内容组件
*/
export function AdminPromoterDetailContent({ promoterUserId }: { promoterUserId: string }) {
	const { toast } = useToast()
	const [detail, setDetail] = React.useState<AdminPromoterDetail | null>(null)
	const [loading, setLoading] = React.useState(false)
	const [copied, setCopied] = React.useState(false)

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

			const json = (await res.json()) as ApiResponse<{ promoter: AdminPromoterDetail }>
			if (!json.success) {
				toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
				return
			}

			setDetail(json.data.promoter)
		} catch {
			toast({ title: '加载失败', description: '网络错误', variant: 'destructive' })
		} finally {
			setLoading(false)
		}
	}, [promoterUserId, toast])

	React.useEffect(() => {
		void loadDetail()
	}, [loadDetail])

	const handleCopyUserId = () => {
		if (detail?.userId) {
			navigator.clipboard.writeText(detail.userId)
			setCopied(true)
			toast({ title: '已复制', description: '用户 ID 已复制到剪贴板' })
			setTimeout(() => setCopied(false), 2000)
		}
	}

	const getLevelBadge = (level: { name: string; level: number }) => {
		const colors = {
			1: 'bg-muted/30 text-muted-foreground border-muted', // 青铜
			2: 'bg-info/20 text-info-foreground border-info/30', // 白银
			3: 'bg-warning/20 text-warning-foreground border-warning/30', // 黄金
			4: 'bg-primary/20 text-primary-foreground border-primary/30', // 钻石
		}
		const colorClass = colors[level.level as keyof typeof colors] || colors[1]
		return (
			<Badge variant="outline" className={cn(colorClass, 'border text-sm px-3 py-1')}>
				{level.name}
			</Badge>
		)
	}

	const getStatusBadge = (status: string) => {
		const config = {
			active: { label: '正常', color: 'bg-success/20 text-success-foreground border-success/30' },
			inactive: { label: '未激活', color: 'bg-muted/30 text-muted-foreground border-muted' },
			locked: { label: '已锁定', color: 'bg-destructive/20 text-destructive-foreground border-destructive/30' },
		}
		const statusConfig = config[status as keyof typeof config] || config.inactive
		return (
			<Badge variant="outline" className={cn(statusConfig.color, 'border')}>
				{statusConfig.label}
			</Badge>
		)
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">加载中...</p>
				</div>
			</div>
		)
	}

	if (!detail) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">未找到推广员信息</p>
			</div>
		)
	}

	return (
		<div className="space-y-5">
			{/* 推广员基本信息卡片 */}
			<Card className="border-border/10 overflow-hidden">
				<CardHeader className="pb-4">
					<div className="flex items-start gap-5">
						<div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center text-primary text-xl font-bold border border-primary/20 shadow-sm shrink-0">
							{detail.username?.[0]?.toUpperCase() || '?'}
						</div>
						<div className="flex-1 min-w-0">
							<h2 className="text-lg font-bold text-foreground truncate">{detail.username || '未设置用户名'}</h2>
							<div className="flex items-center gap-2 mt-2 flex-wrap">
								{getLevelBadge(detail.currentLevel)}
								{getStatusBadge(detail.status)}
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-0 space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1 p-3 bg-muted/5 rounded-lg border border-border/5">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Activity className="h-3.5 w-3.5" />
								<span>用户 ID</span>
							</div>
							<div className="flex items-center gap-2">
								<code className="text-sm text-primary/80 font-mono">{detail.userId}</code>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0"
									onClick={handleCopyUserId}
								>
									{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
								</Button>
							</div>
						</div>
						{detail.email && (
							<div className="space-y-1 p-3 bg-muted/5 rounded-lg border border-border/5">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Mail className="h-3.5 w-3.5" />
									<span>邮箱</span>
								</div>
								<div className="text-sm text-foreground truncate">{detail.email}</div>
							</div>
						)}
						<div className="space-y-1 p-3 bg-muted/5 rounded-lg border border-border/5">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Calendar className="h-3.5 w-3.5" />
								<span>注册时间</span>
							</div>
							<div className="text-sm text-foreground">{new Date(detail.createdAt).toLocaleDateString('zh-CN')}</div>
						</div>
						<div className="space-y-1 p-3 bg-muted/5 rounded-lg border border-border/5">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Award className="h-3.5 w-3.5" />
								<span>等级更新</span>
							</div>
							<div className="text-sm text-foreground">{new Date(detail.levelUpdatedAt).toLocaleString('zh-CN')}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 业绩统计卡片 */}
			<Card>
				<CardHeader>
					<CardTitle className="text-foreground">业绩统计</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">累计佣金</div>
							<div className="text-xl font-bold text-foreground">¥{detail.stats.totalCommission}</div>
						</div>
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">可提现</div>
							<div className="text-xl font-bold text-success-foreground">¥{detail.stats.payableCommission}</div>
						</div>
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">冻结中</div>
							<div className="text-xl font-bold text-warning-foreground">¥{detail.stats.frozenCommission}</div>
						</div>
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">已结算</div>
							<div className="text-xl font-bold text-info-foreground">¥{detail.stats.settledCommission}</div>
						</div>
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">推广订单</div>
							<div className="text-xl font-bold text-foreground">{detail.stats.totalOrders}</div>
						</div>
						<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4">
							<div className="text-sm text-muted-foreground mb-1">销售额</div>
							<div className="text-xl font-bold text-foreground">¥{detail.stats.totalSalesAmount}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 下级推广员 */}
			<Card>
				<CardHeader>
					<CardTitle className="text-foreground flex items-center gap-2">
						<UserPlus className="h-5 w-5" />
						下级推广员
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-6 text-center">
						<div className="text-4xl font-bold text-foreground mb-2">{detail.subPromoterCount}</div>
						<div className="text-sm text-muted-foreground">人</div>
					</div>
				</CardContent>
			</Card>

			{/* 刷新按钮 */}
			<div className="flex justify-center">
				<Button variant="secondary" onClick={() => void loadDetail()} disabled={loading}>
					{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
					刷新数据
				</Button>
			</div>
		</div>
	)
}
