/**
 * API 通用类型定义
 */

/**
 * 通用分页参数
 */
interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

/**
 * 通用分页响应
 */
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 通用 API 响应
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 金额类型
 */
interface Money {
  amount: number;
  currency: string;
}

/**
 * 时间戳类型
 */
interface Timestamp {
  createdAt: string;
  updatedAt: string;
}

export type {
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  Money,
  Timestamp,
};
