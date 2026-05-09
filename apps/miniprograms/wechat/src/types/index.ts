/**
 * API 类型定义
 * Description: 统一导出所有 API 相关类型
 */

/**
 * 登录参数 - 密码登录
 */
export interface LoginParams {
  identifier: string;
  password: string;
}

/**
 * 登录参数 - 微信登录
 */
export interface WechatLoginParams {
  code: string;
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  user: {
    id: string;
    username: string;
    nickname?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  };
  roles: Array<{ id: string; name: string }>;
  permissions: string[];
}

/**
 * 登录响应
 */
export interface LoginResponse {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * 通用 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    traceId: string;
    timestamp: string;
  };
}

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
