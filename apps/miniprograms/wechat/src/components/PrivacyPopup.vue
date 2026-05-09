<template>
	<!-- 隐私保护弹窗 - 微信审核必过项 -->
	<!-- 必须使用官方 button open-type="agreePrivacyAuthorization" -->
	<view v-if="visible" class="privacy-mask" @tap.stop>
		<view class="privacy-popup" @tap.stop>
			<!-- 标题区域 -->
			<view class="popup-header">
				<text class="popup-title">隐私保护提示</text>
			</view>

			<!-- 内容区域 -->
			<view class="popup-content">
				<text class="content-text">
					在使用本服务前，请仔细阅读
					<text class="link" @tap.stop="navigateToAgreement('USER_AGREEMENT')">《用户协议》</text>
					和
					<text class="link" @tap.stop="navigateToAgreement('PRIVACY_POLICY')">《隐私政策》</text>
					。如果您同意，请点击"同意"开始使用。
				</text>
			</view>

			<!-- 操作按钮 -->
			<view class="popup-actions">
				<!-- 同意按钮 - 必须使用微信官方隐私授权组件 -->
				<button
					id="agree-btn"
					class="btn-agree"
					open-type="agreePrivacyAuthorization"
					@agreeprivacyauthorization="handleAgree"
				>
					同意
				</button>

				<!-- 拒绝按钮 - 拒绝后弹窗不关闭，仅显示提示 -->
				<button class="btn-disagree" @tap="handleDisagree">
					拒绝
				</button>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, onMounted, onBeforeUnmount } from 'vue';
	import { logger } from '@/utils/logger';

	// 隐私授权 resolve 回调引用，由 onNeedPrivacyAuthorization 事件提供
	let privacyResolve: WechatMiniprogram.VoidCallback | null = null;

	// 控制弹窗显示
	const visible = ref(false);

	/**
	 * 监听隐私授权需求事件
	 * 当小程序调用需要隐私授权的 API 时，微信会触发此事件
	 * 必须在组件挂载时注册监听
	 */
	const handleNeedPrivacy = (
		resolve: WechatMiniprogram.VoidCallback,
		_event: WechatMiniprogram.OnNeedPrivacyAuthorizationCallbackResult
	) => {
		logger.info('[PrivacyPopup] 收到隐私授权需求事件');
		privacyResolve = resolve;
		visible.value = true;
	};

	/**
	 * 组件挂载时：
	 * 1. 检查隐私授权状态
	 * 2. 注册隐私授权需求监听
	 */
	onMounted(() => {
		// 注册隐私授权需求监听 - 当需要隐私授权时微信会触发此回调
		// uni-app 写法，底层在微信平台会调用 wx.onNeedPrivacyAuthorization
		uni.onNeedPrivacyAuthorization(handleNeedPrivacy);

		// 检查当前是否已经需要隐私授权（处理组件加载时就已经需要授权的场景）
		checkPrivacySetting();
	});

	/**
	 * 组件卸载时移除监听，避免内存泄漏
	 */
	onBeforeUnmount(() => {
		// uni-app 没有提供 offNeedPrivacyAuthorization，设置为空函数作为安全兜底
		privacyResolve = null;
	});

	/**
	 * 检查隐私授权状态
	 * 如果 needAuthorization 为 true，说明用户还未同意隐私协议，需要显示弹窗
	 */
	const checkPrivacySetting = () => {
		uni.getPrivacySetting({
			success: (res: any) => {
				logger.info('[PrivacyPopup] 隐私设置检查结果', {
					needAuthorization: res.needAuthorization,
					privacyList: res.privacyList,
				});

				if (res.needAuthorization) {
					visible.value = true;
				}
			},
			fail: (err: any) => {
				// 非微信平台或基础库版本过低时可能失败，静默处理
				logger.warn('[PrivacyPopup] 获取隐私设置失败', { errMsg: err?.errMsg });
			},
		});
	};

	/**
	 * 用户点击同意按钮
	 * 通过微信官方 button open-type="agreePrivacyAuthorization" 触发
	 * 回调中 resolve 隐私授权，告知微信用户已同意
	 */
	const handleAgree = () => {
		logger.info('[PrivacyPopup] 用户同意隐私授权');

		// 调用 resolve 回调，通知微信用户已同意隐私协议
		if (privacyResolve) {
			privacyResolve({
				buttonId: 'agree-btn',
				event: 'agree',
			} as any);
			privacyResolve = null;
		}

		// 关闭弹窗
		visible.value = false;
	};

	/**
	 * 用户点击拒绝按钮
	 * 拒绝后弹窗不关闭（不允许绕过），显示 toast 提示
	 */
	const handleDisagree = () => {
		logger.info('[PrivacyPopup] 用户拒绝隐私授权');

		uni.showToast({
			title: '需要同意隐私协议才能继续使用',
			icon: 'none',
			duration: 2500,
		});

		// 注意：弹窗不关闭，用户必须点击同意才能继续
	};

	/**
	 * 跳转到协议详情页
	 * @param type - 协议类型：USER_AGREEMENT | PRIVACY_POLICY
	 */
	const navigateToAgreement = (type: string) => {
		uni.navigateTo({
			url: `/subpackages/agreements/detail?type=${type}`,
		});
	};

	// 暴露方法给父组件（如需外部手动触发检查）
	defineExpose({
		checkPrivacySetting,
	});
</script>

<style lang="scss" scoped>
	/* 遮罩层 - 与 Popupcustom 风格一致 */
	.privacy-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: $uni-bg-color-mask;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
		animation: fadeIn 0.25s ease-out;
	}

	/* 弹窗主体 - 参考 Popupcustom 圆角和阴影风格 */
	.privacy-popup {
		width: 620rpx;
		background-color: $uni-bg-color;
		border-radius: 40rpx;
		padding: 50rpx 40rpx 40rpx;
		box-sizing: border-box;
		animation: scaleIn 0.3s ease-out;
		box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.12),
		            0 2rpx 16rpx rgba(0, 0, 0, 0.08);
	}

	/* 标题区域 */
	.popup-header {
		text-align: center;
		margin-bottom: 36rpx;
	}

	.popup-title {
		font-size: 34rpx;
		font-weight: 600;
		color: $uni-text-color;
	}

	/* 内容区域 */
	.popup-content {
		margin-bottom: 48rpx;
	}

	.content-text {
		font-size: 28rpx;
		color: $uni-text-color-grey;
		line-height: 1.7;
	}

	/* 协议链接 - 与 Popupcustom 一致的蓝色链接 */
	.link {
		color: #576b95;
	}

	/* 操作按钮区域 */
	.popup-actions {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	/* 同意按钮 - 使用品牌渐变色 */
	.btn-agree {
		width: 100%;
		height: 90rpx;
		background: linear-gradient(135deg, $plant-secondary 0%, #00C853 100%);
		color: $uni-text-color-inverse;
		border-radius: 16rpx;
		font-size: 30rpx;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		transition: all 0.3s;

		/* 去除微信小程序按钮默认边框 */
		&::after {
			border: none;
		}

		&:active {
			opacity: 0.85;
			transform: scale(0.98);
		}
	}

	/* 拒绝按钮 - 灰色次要样式 */
	.btn-disagree {
		width: 100%;
		height: 90rpx;
		background-color: #f5f5f5;
		color: $uni-text-color-grey;
		border-radius: 16rpx;
		font-size: 30rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		transition: all 0.3s;

		&::after {
			border: none;
		}

		&:active {
			background-color: #ebebeb;
		}
	}

	/* 入场动画 - 遮罩淡入 */
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* 入场动画 - 弹窗缩放弹出 */
	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
