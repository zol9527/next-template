/**
 * Function: utils/index
 *
 * Description: 工具模块统一导出入口
 *
 * Returns:
 *   exports(object): 导出的所有工具函数和类型
 */

// 日志
export { logger, createLogger, createRequestLogger } from './logger';
export type { LoggerInstance, LoggerOptions, LogLevel } from './logger';

// 错误处理
export {
  AppError,
  NetworkError,
  BusinessError,
  AuthError,
  ValidationError,
  ErrorSeverity,
  getErrorMessage,
  getErrorCode,
  isAuthError,
  isNetworkError,
  isRetryableError,
  handleError,
  wrapAsync,
  createErrorFromResponse,
} from './error-handler';
export type { ErrorHandleOptions } from './error-handler';

// Toast 提示
export {
  showToast,
  showSuccess,
  showError,
  showFail,
  showText,
  showLoading,
  hideLoading,
  showModal,
  showConfirm,
  showActionSheet,
  withLoading,
  withLoadingAsync,
  ToastIcon,
} from './toast';
export type { ToastIconType } from './toast';

// 存储
export { storage } from './storage';

// 追踪 ID
export { generateTraceId } from './trace-id';

// URL 工具
export { buildFullUrl } from './url';

// 图片预览
export { previewImage, previewImages } from './image-preview';
