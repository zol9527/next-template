/**
 * Function: stores/index
 *
 * Description: Store 模块统一导出入口，同时创建并导出 Pinia 实例
 *
 * Returns:
 *   exports(object): 导出的所有 Store 和类型
 */

import * as Pinia from 'pinia';

// 创建 Pinia 实例 (uni-app Vue3 标准写法)
const pinia = Pinia.createPinia();

// 默认导出 Pinia 实例，用于 main.js 中 app.use(pinia)
export default pinia;

// 同时导出 Pinia 模块，用于 nvue 页面的 map 工具方法
export { Pinia };

// Auth Store
export { useAuthStore } from './authStore';
export type { AuthState } from './authStore';

// User Documents Store
export { useUserDocumentsStore } from './user-documents-store';
