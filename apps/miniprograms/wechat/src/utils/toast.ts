/**
 * Toast 提示封装模块
 * Description: 提供统一的提示样式和行为
 */

/**
 * Toast 图标类型
 */
export const ToastIcon = {
  SUCCESS: 'success',
  ERROR: 'error',
  FAIL: 'fail',
  NONE: 'none',
  LOADING: 'loading',
} as const;

export type ToastIconType = typeof ToastIcon[keyof typeof ToastIcon];

/**
 * Toast 配置选项
 */
interface ToastOptions {
  title?: string;
  icon?: ToastIconType | string;
  duration?: number;
  mask?: boolean;
  onSuccess?: () => void;
  onFail?: () => void;
  onComplete?: () => void;
}

/**
 * Toast 默认配置
 */
const DEFAULT_CONFIG: ToastOptions = {
  duration: 2000,
  mask: false,
};

/**
 * Function: showToast
 *
 * Description: 显示 Toast 提示
 *
 * Parameters:
 *   options(ToastOptions): Toast 配置
 *
 * Returns:
 *   void: 无返回值
 */
export function showToast(options: ToastOptions = {}): void {
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  uni.showToast({
    title: config.title || '',
    icon: config.icon || 'none',
    duration: config.duration,
    mask: config.mask,
    success: () => {
      if (config.onSuccess) {
        config.onSuccess();
      }
    },
    fail: () => {
      if (config.onFail) {
        config.onFail();
      }
    },
    complete: () => {
      if (config.onComplete) {
        config.onComplete();
      }
    },
  });
}

/**
 * Function: showSuccess
 *
 * Description: 显示成功提示
 *
 * Parameters:
 *   title(string): 提示内容
 *   duration(number): 持续时间
 *
 * Returns:
 *   void: 无返回值
 */
export function showSuccess(title: string, duration: number = 2000): void {
  showToast({
    title,
    icon: ToastIcon.SUCCESS,
    duration,
  });
}

/**
 * Function: showError
 *
 * Description: 显示错误提示
 *
 * Parameters:
 *   title(string): 提示内容
 *   duration(number): 持续时间
 *
 * Returns:
 *   void: 无返回值
 */
export function showError(title: string, duration: number = 2000): void {
  showToast({
    title,
    icon: ToastIcon.ERROR,
    duration,
  });
}

/**
 * Function: showFail
 *
 * Description: 显示失败提示
 *
 * Parameters:
 *   title(string): 提示内容
 *   duration(number): 持续时间
 *
 * Returns:
 *   void: 无返回值
 */
export function showFail(title: string, duration: number = 2000): void {
  showToast({
    title,
    icon: ToastIcon.FAIL,
    duration,
  });
}

/**
 * Function: showText
 *
 * Description: 显示纯文本提示（无图标）
 *
 * Parameters:
 *   title(string): 提示内容
 *   duration(number): 持续时间
 *
 * Returns:
 *   void: 无返回值
 */
export function showText(title: string, duration: number = 2000): void {
  showToast({
    title,
    icon: ToastIcon.NONE,
    duration,
  });
}

/**
 * Function: showLoading
 *
 * Description: 显示加载提示
 *
 * Parameters:
 *   title(string): 提示内容
 *   mask(boolean): 是否显示透明蒙层
 *
 * Returns:
 *   void: 无返回值
 */
export function showLoading(title: string = '加载中...', mask: boolean = true): void {
  uni.showLoading({
    title,
    mask,
  });
}

/**
 * Function: hideLoading
 *
 * Description: 隐藏加载提示
 *
 * Returns:
 *   void: 无返回值
 */
export function hideLoading(): void {
  uni.hideLoading();
}

/**
 * 模态对话框配置
 */
interface ModalOptions {
  title?: string;
  content?: string;
  showCancel?: boolean;
  cancelText?: string;
  confirmText?: string;
}

/**
 * Function: showModal
 *
 * Description: 显示模态对话框
 *
 * Parameters:
 *   options(ModalOptions): 对话框配置
 *
 * Returns:
 *   Promise<boolean>: 用户是否点击确定
 */
export function showModal(options: ModalOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: options.title || '提示',
      content: options.content || '',
      showCancel: options.showCancel !== false,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * Function: showConfirm
 *
 * Description: 显示确认对话框
 *
 * Parameters:
 *   content(string): 对话框内容
 *   title(string): 对话框标题
 *
 * Returns:
 *   Promise<boolean>: 用户是否点击确定
 */
export function showConfirm(content: string, title: string = '确认'): Promise<boolean> {
  return showModal({
    title,
    content,
  });
}

/**
 * Function: showActionSheet
 *
 * Description: 显示操作菜单
 *
 * Parameters:
 *   itemList(string[]): 菜单项列表
 *   title(string): 菜单标题
 *
 * Returns:
 *   Promise<number>: 用户点击的菜单项索引
 */
export function showActionSheet(itemList: string[], title: string = ''): Promise<number> {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList,
      title,
      success: (res) => {
        resolve(res.tapIndex);
      },
      fail: () => {
        resolve(-1);
      },
    });
  });
}

/**
 * Function: withLoading
 *
 * Description: 显示加载并返回 hide 函数（用于自动管理）
 *
 * Parameters:
 *   title(string): 提示内容
 *
 * Returns:
 *   () => void: hide 函数
 */
export function withLoading(title: string = '加载中...'): () => void {
  showLoading(title);
  return () => hideLoading();
}

/**
 * Function: withLoadingAsync
 *
 * Description: 异步操作包装器（自动显示/隐藏加载）
 *
 * Parameters:
 *   promise(Promise<T>): 异步操作
 *   title(string): 加载提示内容
 *
 * Returns:
 *   Promise<T>: 原始 Promise
 */
export function withLoadingAsync<T>(promise: Promise<T>, title: string = '加载中...'): Promise<T> {
  showLoading(title);
  return promise.finally(() => {
    hideLoading();
  });
}
