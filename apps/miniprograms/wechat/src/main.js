import App from './App'

import { createSSRApp } from 'vue'
import pinia from './stores/index'
import { initRequestInterceptor } from './core/request-interceptor'
import { httpClient } from './core/http-client'
import config from './config/index'
import { logger } from './utils/logger'

/**
 * Function: validateAppConfig
 *
 * Description: 验证应用配置完整性
 * 检查关键配置项是否正确设置
 */
function validateAppConfig() {
  const errors = []

  // 检查 API 地址
  if (!config.api.baseURL) {
    errors.push('API 地址未配置')
  } else if (!config.api.baseURL.startsWith('http')) {
    errors.push(`API 地址格式无效: ${config.api.baseURL}`)
  }

  // 检查日志级别
  const validLogLevels = ['debug', 'info', 'warn', 'error']
  if (!validLogLevels.includes(config.log.level)) {
    errors.push(`日志级别无效: ${config.log.level}`)
  }

  // 检查认证模式
  const validAuthModes = ['password', 'wechat']
  if (!validAuthModes.includes(config.env.authMode)) {
    errors.push(`认证模式无效: ${config.env.authMode}`)
  }

  // 检查应用版本
  if (!config.api.version) {
    errors.push('API 版本未配置')
  }

  // 输出验证结果
  if (errors.length > 0) {
    logger.error('应用配置验证失败', { errors })
    console.error('[配置错误]', errors.join('\n'))
    return false
  }

  logger.info('应用配置验证通过', {
    apiBaseURL: config.api.baseURL,
    logLevel: config.log.level,
    authMode: config.env.authMode,
    requireAuth: config.env.requireAuth,
    skipStartupLogin: config.env.skipStartupLogin,
    version: config.api.version,
  })
  return true
}

export function createApp() {
  const app = createSSRApp(App)

  app.use(pinia)

  // 启动时验证配置
  validateAppConfig()

  // 初始化 HTTP 客户端基础地址
  if (config.api.baseURL) {
    httpClient.setBaseURL(config.api.baseURL)
  }
  httpClient.setTimeout(config.api.timeout)
  httpClient.setRetry(config.api.retryTimes, config.api.retryDelay)

  // 初始化 uni-app 请求拦截器（替代自定义 HttpClient HttpClient 拦截器）
  initRequestInterceptor()

  app.config.globalProperties.$config = config
  app.config.globalProperties.$logger = logger

  app.config.errorHandler = (error, instance, info) => {
    logger.error('Vue Error', error, {
      component: instance?.$options?.name,
      info
    })
  }

  logger.info('应用启动', {
       env: config.env.isDev ? 'development' : 'production',
    apiBaseURL: config.api.baseURL,
    version: config.api.version,
    platform: 'mp-weixin'
  })

  return {
    app
  }
}
