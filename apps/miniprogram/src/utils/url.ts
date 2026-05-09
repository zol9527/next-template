/**
 * URL 处理工具模块
 * Description: 提供 URL 拼接和规范化功能
 */

import envConfig from '../config/env';

/**
 * API 基础地址（从统一配置获取）
 */
const API_BASE_URL: string = envConfig.apiBaseURL;

/**
 * Function: buildFullUrl
 *
 * Description: 构建完整的资源 URL，将相对路径转换为绝对 URL
 *
 * Parameters:
 *   relativePath(string): 相对路径（如 /api/v1/public/files/...）
 *
 * Returns:
 *   string: 完整的 URL
 *
 * Notes:
 *   - 如果路径已经是完整 URL（以 http:// 或 https:// 开头），直接返回
 *   - 如果路径以 /static/ 开头，视为本地静态资源
 *   - 其他路径会移除 /api/v1/ 前缀后与 API_BASE_URL 拼接
 */
export function buildFullUrl(relativePath: string): string {
  if (!relativePath) {
    return '';
  }

  // 如果已经是完整 URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // 如果是本地静态资源路径，保持不变
  if (relativePath.startsWith('/static/')) {
    return relativePath;
  }

  // 移除 relativePath 开头的 /api/v1/ 前缀，避免 URL 重复
  // 后端 getFileUrl 返回 /api/v1/public/files/xxx，需要处理成正确的完整 URL
  const pathWithoutApiPrefix = relativePath.replace(/^\/api\/v1\//, '');

  // 拼接 API_BASE_URL 和处理后的路径
  return `${API_BASE_URL}/${pathWithoutApiPrefix}`;
}
