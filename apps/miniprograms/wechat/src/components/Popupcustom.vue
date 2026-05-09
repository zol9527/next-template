<template>
		<!-- 登录弹窗遮罩 -->
		<view v-if="isVisible" class="mask" @tap.stop="hidePopup">
			<!-- 弹窗主体 - 阻止点击冒泡 -->
			<view class="popup-box" @tap.stop>
				<!-- 关闭按钮 -->
				<view class="close-icon" @tap="hidePopup">
					<text class="close-text">×</text>
				</view>

				<!-- 品牌/Logo 区域 -->
				<view class="brand-section">
					<view class="logo-outer">
						<view class="logo-inner">
							<text class="user-icon">👤</text>
						</view>
					</view>
					<text class="brand-title">欢迎登录小程序</text>
					<text class="brand-desc">使用微信快捷登录，安全便捷</text>
				</view>

				<!-- 功能点展示 -->
				<view class="feature-item">
					<!-- <view class="feature-icon">🛡️</view> -->
					<text class="feature-text">安全加密：您的个人隐私信息将受到严格保护</text>
				</view>

				<!-- 协议勾选 -->
				<view class="agreement-section" @tap="toggleAgreement">
					<view :class="['checkbox', agreementChecked ? 'checked' : '']">
						<text v-if="agreementChecked" class="check-mark">✓</text>
					</view>
					<view class="agreement-text">
						我已阅读并同意
						<text class="link" @tap.stop="openAgreement('USER_AGREEMENT')">《用户协议》</text> 和
						<text class="link" @tap.stop="openAgreement('PRIVACY_POLICY')">《隐私政策》</text>
					</view>
				</view>

				<!-- 操作按钮 -->
				<view class="action-buttons">
					<button :class="['login-btn', agreementChecked ? 'login-btn-enabled' : '', loading ? 'loading-state' : '']" :disabled="loading || !agreementChecked" @tap="handleLogin">
						<view v-if="loading" class="spinner"></view>
						<text v-else>微信授权登录</text>
					</button>

					<view class="cancel-text" @tap="hidePopup">
						<text>暂不登录</text>
					</view>
				</view>

				<!-- 底部备注 -->
				<!-- <view class="footer-note">
					<text>Powered by UniApp System</text>
				</view> -->
			</view>
		</view>
</template>

<script setup>
	import { ref } from 'vue';
	import { logger } from '@/utils/logger'
	import { useAuthStore } from '@/stores/authStore'

	// 响应式状态定义
	const isVisible = ref(false); // 默认隐藏，通过外部调用显示
	const agreementChecked = ref(false);
	const loading = ref(false);

	// 事件
	const emit = defineEmits(['loginSuccess', 'needProfileCompletion']);

	// 获取认证 store
	const authStore = useAuthStore();

	// 显示弹窗
	const showPopup = () => {
		isVisible.value = true;
	};

	// 隐藏弹窗
	const hidePopup = () => {
		isVisible.value = false;
	};

	// 切换协议勾选状态
	const toggleAgreement = () => {
		agreementChecked.value = !agreementChecked.value;
	};

	/**
	 * Function: openAgreement
	 *
	 * Description: 打开协议页面
	 */
	const openAgreement = (type) => {
		uni.navigateTo({
			url: `/subpackages/agreements/detail?type=${type}`
		});
	};

	/**
	 * Function: handleLogin
	 *
	 * Description: 处理微信登录逻辑（三段式：只提交 code）
	 *
	 * Flow:
	 *  1. 验证协议勾选
	 *  2. 调用 uni.login 获取微信 code
	 *  3. 调用 authStore.loginWithWechat(code) 完成登录
	 *  4. 判断资料是否完整，触发资料补全
	 */
	const handleLogin = async () => {
		// 1. 验证协议勾选
		if (!agreementChecked.value) {
			uni.showToast({
				title: '请先阅读并勾选协议',
				icon: 'none',
				duration: 2000
			});
			return;
		}

		loading.value = true;

		try {
			// 2. 调用微信登录获取 code（不再获取用户资料）
			logger.info('开始微信登录...');
			const loginResult = await new Promise((resolve, reject) => {
				uni.login({
					provider: 'weixin',
					onlyAuthorize: true,
					success: (res) => {
						if (res && res.code) {
							logger.info('获取微信 code 成功', { codeLength: res.code.length });
							resolve({ code: res.code });
						} else {
							logger.error('uni.login 返回对象中没有 code 字段', { res });
							reject(new Error('获取微信授权码失败：返回数据格式错误'));
						}
					},
					fail: (err) => {
						logger.error('uni.login 调用失败', { errMsg: err.errMsg });
						reject(new Error(`获取微信 code 失败: ${err.errMsg || '未知错误'}`));
					}
				});
			});

			// 3. 只提交 code 登录
			logger.info('调用 authStore 登录方法...', { code: loginResult.code });
			await authStore.loginWithWechat(loginResult.code);

			// 4. 延迟关闭弹窗
			setTimeout(() => {
				loading.value = false;
				isVisible.value = false;

				// 5. 判断是否需要完善资料（新用户且未跳过过）
				if (authStore.shouldCompleteProfile.value) {
					emit('needProfileCompletion');
				}
				emit('loginSuccess');
			}, 1500);

		} catch (error) {
			loading.value = false;
			logger.error('微信登录失败', error);

			let errorMessage = '登录失败，请重试';
			if (error instanceof Error) {
				errorMessage = error.message;
				if (errorMessage.includes('invalid code') || errorMessage.includes('code 无效')) {
					errorMessage = '微信授权码无效，请重试';
				} else if (errorMessage.includes('code 已使用') || errorMessage.includes('code 已被使用')) {
					errorMessage = '授权码已使用，请重新登录';
				} else if (errorMessage.includes('网络') || errorMessage.includes('timeout')) {
					errorMessage = '网络连接失败，请检查网络';
				} else if (errorMessage.includes('40029')) {
					errorMessage = '授权码无效，请重试';
				}
			}

			uni.showToast({
				title: errorMessage,
				icon: 'none',
				duration: 2500
			});
		}
	};

	// 暴露方法给父组件
	defineExpose({
		showPopup,
		hidePopup
	});
</script>

<style scoped>
	/* 弹窗遮罩 */
	.mask {
		width: 620rpx;
		position: fixed;
		top: 50%; /* 垂直居中可选 */
		left: 50%; /* 将左上角定位到视口中心 */
		transform: translate(-50%, -50%); /* 向左上平移自身一半宽高 */
		/* background-color: rgba(0, 0, 0, 0.5); */
		display: flex;
		align-items: flex-end;
		z-index: 999;
	}

	/* 弹窗主体 */
	.popup-box {
		width: 100%;
		background-color: #ffffff;
		border-radius: 40rpx;
		padding: 40rpx 40rpx 60rpx;
		box-sizing: border-box;
		position: relative;
		animation: slideUp 0.3s ease-out;
		border-radius: 40rpx;
		/* 添加阴影效果 */
		box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.12),
		            0 2rpx 16rpx rgba(0, 0, 0, 0.08);
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	/* 关闭按钮 */
	.close-icon {
		position: absolute;
		right: 40rpx;
		top: 40rpx;
		padding: 10rpx;
		z-index: 10;
	}

	.close-text {
		font-size: 48rpx;
		color: #ccc;
		line-height: 1;
	}

	/* 品牌区域 */
	.brand-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 40rpx;
		margin-bottom: 60rpx;
	}

	.logo-outer {
		width: 120rpx;
		height: 120rpx;
		background-color: #f0fdf4;
		border-radius: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 30rpx;
	}

	.logo-inner {
		width: 90rpx;
		height: 90rpx;
		background-color: #07c160;
		border-radius: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 10rpx 20rpx rgba(7, 193, 96, 0.2);
	}

	.user-icon {
		color: white;
		font-size: 50rpx;
	}

	.brand-title {
		font-size: 34rpx;
		font-weight: 600;
		color: #111;
	}

	.brand-desc {
		font-size: 24rpx;
		color: #999;
		margin-top: 10rpx;
	}

	/* 功能展示 */
	.feature-item {
		display: flex;
		align-items: flex-start;
		background-color: #fafafa;
		padding: 20rpx;
		border-radius: 16rpx;
		margin-bottom: 40rpx;
	}

	.feature-icon {
		margin-right: 16rpx;
	}

	.feature-text {
		font-size: 24rpx;
		color: #666;
	}

	/* 协议勾选 */
	.agreement-section {
		display: flex;
		align-items: center;
		margin-bottom: 40rpx;
	}

	.checkbox {
		width: 32rpx;
		height: 32rpx;
		border: 2rpx solid #ddd;
		border-radius: 50%;
		margin-right: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.checkbox.checked {
		background-color: #009666;
		border-color: #009666;
	}

	.check-mark {
		color: white;
		font-size: 20rpx;
		font-weight: bold;
	}

	.agreement-text {
		font-size: 24rpx;
		color: #888;
	}

	.link {
		color: #576b95;
	}

	/* 按钮 */
	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
/* 		text{
			background: linear-gradient(135deg, #009666 0%, #00C853 100%);
			box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.3);
		} */
	}

	.login-btn {
		width: 100%;
		height: 90rpx;
		background-color: #ccc;
		color: white !important;
		border-radius: 16rpx;
		font-size: 30rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		transition: all 0.3s;
	}

	.login-btn-enabled {
		background: linear-gradient(135deg, #009666 0%, #00C853 100%);
		box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.3);
	}
/* 	.loading-state{
		background: linear-gradient(135deg, #009666 0%, #00C853 100%);
		box-shadow: 0 8rpx 24rpx rgba(0, 150, 102, 0.3);
	} */
	.login-btn::after {
		border: none;
	}

	.login-btn:active:not(:disabled) {
		opacity: 0.8;
		transform: scale(0.98);
	}

	/* 禁用状态 */
	.login-btn:disabled {
		color: #999999 !important;
		opacity: 0.5;
	}

	/* 取消按钮 - 改为文字链接 */
	.cancel-text {
		text-align: center;
		padding: 20rpx;
		font-size: 28rpx;
		color: #999;
		margin-top: 10rpx;
	}

	.cancel-text:active {
		color: #666;
	}

	/* 加载动画 */
	.spinner {
		width: 30rpx;
		height: 30rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.footer-note {
		margin-top: 40rpx;
		text-align: center;
		font-size: 20rpx;
		color: #ccc;
		letter-spacing: 2rpx;
	}
</style>
