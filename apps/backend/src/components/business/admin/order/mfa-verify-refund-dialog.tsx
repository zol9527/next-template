'use client'

import * as React from 'react'
import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * 组件属性接口
 *
 * orderId: 目标订单的 UUID，用于调用 MFA 验证和退款接口
 * maxRefundAmount: 最大可退款金额（字符串形式的十进制数），预填到退款金额输入框
 * orderStatus: 当前订单状态，用于判断是否显示佣金结算警告
 * onCloseAction: 关闭对话框的回调函数
 * onSuccess: 退款成功后的回调函数，通常用于刷新列表
 */
interface MfaVerifyRefundDialogProps {
	orderId: string
	maxRefundAmount: string
	orderStatus: string
	onCloseAction: () => void
	onSuccess: () => void
}

/** MFA 验证接口返回结构 */
interface MfaVerifyResponse {
	actionToken: string
	expiresAt: string
}

/**
 * Function: MfaVerifyRefundDialog
 *
 * Description: MFA 二步验证退款对话框组件：在发起退款前要求管理员输入 TOTP 验证码，
 *   先验证身份获取 actionToken，再携带 actionToken 调用退款接口。
 *   对已完成订单额外显示佣金结算风险警告。
 *
 * Flow:
 *   1. 管理员输入退款金额、退款原因、6 位 TOTP 验证码
 *   2. 点击"确认退款"后先调用 POST /api/v1/user/mfa/verify-action 获取 actionToken
 *   3. 携带 actionToken 调用 POST /api/v1/admin/orders/:id/refund 执行退款
 *   4. 显示成功或失败反馈
 *
 * Parameters:
 *     props(MfaVerifyRefundDialogProps): 组件属性
 *
 * Returns:
 *     element(React.ReactElement): MFA 验证退款对话框 UI
 */
export function MfaVerifyRefundDialog({
	orderId,
	maxRefundAmount,
	orderStatus,
	onCloseAction,
	onSuccess,
}: MfaVerifyRefundDialogProps) {
	const { toast } = useToast()

	/** 退款金额，默认预填最大可退金额 */
	const [refundAmount, setRefundAmount] = React.useState(maxRefundAmount)
	/** 退款原因（可选） */
	const [reason, setReason] = React.useState('')
	/** 6 位 TOTP 验证码 */
	const [totpCode, setTotpCode] = React.useState('')

	/** MFA 注册状态检测: 'checking' | 'enrolled' | 'not-enrolled' | 'error' */
	const [enrollmentStatus, enrollmentStatusSet] = React.useState<'checking' | 'enrolled' | 'not-enrolled' | 'error'>('checking')

	/** 提交中状态，防止重复提交 */
	const [submitting, submittingSet] = React.useState(false)
	/** 当前处理步骤：'idle' | 'verifying' | 'refunding' */
	const [step, setStep] = React.useState<'idle' | 'verifying' | 'refunding'>('idle')

	/** 判断是否已完成订单（需要显示佣金结算警告） */
	const isCompletedOrder = orderStatus === 'completed'

	/**
	 * 启动时检查 MFA 注册状态
	 *
	 * 如果管理员尚未设置 MFA，显示引导界面而非 TOTP 输入框。
	 * 这样避免了管理员看到验证码输入框但无法通过验证的困境。
	 */
	React.useEffect(() => {
		let active = true

		function handleResult(status: 'enrolled' | 'not-enrolled' | 'error') {
			if (active) enrollmentStatusSet(status)
		}

		fetch('/api/v1/user/mfa/status', { credentials: 'include' })
			.then((res) => {
				if (!res.ok) {
					handleResult('error')
					return null
				}
				return res.json()
			})
			.then((json) => {
				if (json) {
					handleResult(json.data?.enabled ? 'enrolled' : 'not-enrolled')
				}
			})
			.catch(() => {
				handleResult('error')
			})

		return () => { active = false }
	}, [])

	/**
	 * 处理退款提交
	 *
	 * 先验证 MFA 获取 actionToken，再调用退款接口。
	 * 两步串行执行，任何一步失败都会终止流程并显示错误提示。
	 */
	const handleSubmit = React.useCallback(async () => {
		// 前端校验：退款金额不能为空或非正数
		const amountNum = Number(refundAmount)
		if (!refundAmount || isNaN(amountNum) || amountNum <= 0) {
			toast({ title: '参数错误', description: '请输入有效的退款金额', variant: 'destructive' })
			return
		}

		// 前端校验：退款金额不能超过最大可退金额
		if (amountNum > Number(maxRefundAmount)) {
			toast({ title: '参数错误', description: `退款金额不能超过 ${maxRefundAmount}`, variant: 'destructive' })
			return
		}

		// 前端校验：TOTP 验证码必须是 6 位数字
		if (!totpCode || !/^\d{6}$/.test(totpCode)) {
			toast({ title: '参数错误', description: '请输入 6 位数字验证码', variant: 'destructive' })
			return
		}

		submittingSet(true)

		try {
			// 第一步：MFA 验证，获取 actionToken
			setStep('verifying')
			const verifyRes = await fetch('/api/v1/user/mfa/verify-action', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: totpCode,
					action: 'refund',
					resourceId: orderId,
				}),
				credentials: 'include',
			})

			if (!verifyRes.ok) {
				toast({ title: 'MFA 验证失败', description: '身份验证请求失败，请稍后再试', variant: 'destructive' })
				return
			}

			const verifyJson = (await verifyRes.json()) as ApiResponse<MfaVerifyResponse>
			if (!verifyJson.success) {
				// 后端返回 MFA_NOT_ENROLLED 时，切换到未注册引导界面
				if (verifyJson.error?.code === 'MFA_NOT_ENABLED') {
					enrollmentStatusSet('not-enrolled')
					return
				}
				toast({ title: 'MFA 验证失败', description: verifyJson.error?.message || '验证码无效或已过期', variant: 'destructive' })
				return
			}

			// 第二步：携带 actionToken 调用退款接口
			setStep('refunding')
			const refundRes = await fetch(`/api/v1/admin/orders/${orderId}/refund`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					refundAmount,
					reason: reason || undefined,
					actionToken: verifyJson.data.actionToken,
				}),
				credentials: 'include',
			})

			if (!refundRes.ok) {
				toast({ title: '退款失败', description: '退款请求失败，请稍后再试', variant: 'destructive' })
				return
			}

			const refundJson = (await refundRes.json()) as ApiResponse<unknown>
			if (!refundJson.success) {
				toast({ title: '退款失败', description: refundJson.error?.message || '退款处理异常', variant: 'destructive' })
				return
			}

			// 退款成功
			toast({ title: '操作成功', description: '退款已发起', variant: 'default' })
			onSuccess()
		} catch {
			toast({ title: '操作失败', description: '网络错误，请稍后再试', variant: 'destructive' })
		} finally {
			submittingSet(false)
			setStep('idle')
		}
	}, [refundAmount, maxRefundAmount, totpCode, reason, orderId, toast, onSuccess, enrollmentStatus])

	/** 获取当前步骤的按钮文本 */
	const submitButtonText = React.useMemo(() => {
		switch (step) {
			case 'verifying':
				return '验证中...'
			case 'refunding':
				return '退款中...'
			default:
				return '确认退款'
		}
	}, [step])

	return (
		<Dialog open onOpenChange={(v) => !v && onCloseAction()}>
			<DialogContent size="sm" className="max-w-[28rem]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldAlert className="h-5 w-5 text-amber-500" />
						安全验证 - 退款操作
					</DialogTitle>
					<DialogDescription>
						{enrollmentStatus === 'not-enrolled'
							? '退款操作需要 MFA 二步验证保护'
							: '退款操作需要 MFA 二步验证，请输入您的 TOTP 验证码'}
					</DialogDescription>
				</DialogHeader>

				{/* 根据注册状态显示不同界面 */}
				{enrollmentStatus === 'checking' && (
					<div className="flex flex-col items-center justify-center py-8 gap-3">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						<p className="text-sm text-muted-foreground">正在检查 MFA 状态...</p>
					</div>
				)}

				{enrollmentStatus === 'not-enrolled' && (
					<div className="space-y-4 py-2">
						<div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
							<ShieldCheck className="h-10 w-10 text-amber-500" />
							<h3 className="text-base font-semibold">需要先设置 MFA</h3>
							<p className="text-sm text-muted-foreground max-w-xs">
								退款操作需要 MFA 二步验证保护。请先前往安全设置完成 MFA 绑定后再进行退款。
							</p>
						</div>
						<Link
							href="/admin/mfa-setup"
							className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full"
						>
							前往设置 MFA
						</Link>
					</div>
				)}

				{enrollmentStatus === 'error' && (
					<div className="space-y-4 py-2">
						<div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
							<AlertTriangle className="h-10 w-10 text-destructive" />
							<p className="text-sm text-muted-foreground">无法检查 MFA 状态，请刷新页面重试</p>
						</div>
					</div>
				)}

				{enrollmentStatus === 'enrolled' && (
					<div className="space-y-4 py-2">
						{/* 已完成订单的佣金结算警告 */}
						{isCompletedOrder && (
							<div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
								<AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
								<span>
									<strong>警告：</strong>该订单已完成，佣金可能正在结算中。退款可能会导致佣金数据异常。
								</span>
							</div>
						)}

						{/* 退款金额输入 */}
						<div className="space-y-1.5">
							<Label htmlFor="refund-amount">退款金额</Label>
							<Input
								id="refund-amount"
								type="text"
								inputMode="decimal"
								placeholder="请输入退款金额"
								value={refundAmount}
								onChange={(e) => setRefundAmount(e.target.value)}
								disabled={submitting}
							/>
							<p className="text-xs text-muted-foreground">
								最大可退金额：{maxRefundAmount}
							</p>
						</div>

						{/* 退款原因输入 */}
						<div className="space-y-1.5">
							<Label htmlFor="refund-reason">退款原因（选填）</Label>
							<Textarea
								id="refund-reason"
								placeholder="请输入退款原因"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								disabled={submitting}
								rows={3}
							/>
						</div>

						{/* TOTP 验证码输入 */}
						<div className="space-y-1.5">
							<Label htmlFor="totp-code">TOTP 验证码</Label>
							<Input
								id="totp-code"
								type="text"
								inputMode="numeric"
								maxLength={6}
								placeholder="请输入 6 位数字验证码"
								value={totpCode}
								onChange={(e) => {
									// 仅允许输入数字，最多 6 位
									const val = e.target.value.replace(/\D/g, '').slice(0, 6)
									setTotpCode(val)
								}}
								disabled={submitting}
								autoFocus
							/>
							<p className="text-xs text-muted-foreground">
								请打开您的身份验证器获取 6 位验证码
							</p>
						</div>
					</div>
				)}

				<DialogFooter className="flex-row gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={submitting}
						onClick={onCloseAction}
					>
						{enrollmentStatus === 'not-enrolled' ? '关闭' : '取消'}
					</Button>
					{/* 仅已注册 MFA 时显示确认退款按钮 */}
					{enrollmentStatus === 'enrolled' && (
						<Button
							type="button"
							variant="destructive"
							size="sm"
							disabled={submitting}
							onClick={() => void handleSubmit()}
						>
							{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{submitButtonText}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
