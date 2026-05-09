/**
 * Function: feedbackService
 *
 * Description: 反馈服务模块，提供用户提交反馈、查看反馈列表和详情的功能
 *
 * Returns:
 *   submitFeedback(function): 提交反馈
 *   getFeedbackList(function): 获取反馈列表
 */

import { logger } from '../utils/logger';

/**
 * 反馈类型枚举
 */
export enum FeedbackType {
  SUGGESTION = 'suggestion',
  BUG = 'bug',
  OTHER = 'other',
}

/**
 * 反馈状态枚举
 */
export enum FeedbackStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * 反馈项接口
 */
export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  content: string;
  images: string[]; // 图片 URL 数组
  status: FeedbackStatus;
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

/**
 * 提交反馈请求接口
 */
export interface SubmitFeedbackRequest {
  type: FeedbackType;
  title: string;
  content: string;
  images?: string[]; // 可选，图片 URL 数组
}

/**
 * 反馈列表响应接口
 */
export interface FeedbackListResponse {
  items: Feedback[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Mock 反馈数据
 */
const mockFeedbacks: Feedback[] = [
  {
    id: 'fb_001',
    userId: 'user_123',
    type: FeedbackType.BUG,
    title: '课程播放卡顿问题',
    content: '在观看第 3 章第 2 节课程时，视频会频繁卡顿，尝试多次刷新问题依旧。设备是 iPhone 13，网络是 5G。',
    images: [
      'https://cdn.example.com/uploads/feedback/2025/01/16/image1.jpg',
      'https://cdn.example.com/uploads/feedback/2025/01/16/image2.jpg',
    ],
    status: FeedbackStatus.PENDING,
    createdAt: '2025-01-16T10:30:00Z',
    updatedAt: '2025-01-16T10:30:00Z',
  },
  {
    id: 'fb_002',
    userId: 'user_123',
    type: FeedbackType.SUGGESTION,
    title: '建议增加夜间模式',
    content: '希望小程序能增加夜间模式，方便晚上学习。',
    images: [],
    status: FeedbackStatus.PROCESSING,
    createdAt: '2025-01-15T14:20:00Z',
    updatedAt: '2025-01-16T09:00:00Z',
  },
  {
    id: 'fb_003',
    userId: 'user_123',
    type: FeedbackType.OTHER,
    title: '商品描述不够详细',
    content: '商城中部分绿植商品的描述信息不够详细，建议增加养护难度、光照需求等说明。',
    images: [],
    status: FeedbackStatus.RESOLVED,
    createdAt: '2025-01-10T08:45:00Z',
    updatedAt: '2025-01-11T16:30:00Z',
  },
];

/**
 * 反馈服务
 */
export const feedbackService = {
  /**
   * 提交反馈
   *
   * @param data - 反馈数据
   * @returns Promise<{ success: boolean }> - 操作结果
   */
  async submitFeedback(data: SubmitFeedbackRequest): Promise<{ success: boolean }> {
    logger.info('提交反馈', { type: data.type, title: data.title });

    try {
      // TODO: 连接后端 API
      // return await httpClient.post<{ success: boolean }>('/api/v1/user/feedback', data)

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          const newFeedback: Feedback = {
            id: `fb_${Date.now()}`,
            userId: 'user_123',
            type: data.type,
            title: data.title,
            content: data.content,
            images: data.images || [],
            status: FeedbackStatus.PENDING,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockFeedbacks.unshift(newFeedback);
          logger.info('提交反馈成功', { feedbackId: newFeedback.id });
          resolve({ success: true });
        }, 300);
      });
    } catch (error) {
      logger.error('提交反馈失败', error);
      throw error;
    }
  },

  /**
   * 获取反馈列表
   *
   * @param params - 查询参数
   * @param params.cursor - 分页游标
   * @param params.limit - 每页数量
   * @returns Promise<FeedbackListResponse> - 反馈列表响应
   */
  async getFeedbackList(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<FeedbackListResponse> {
    logger.info('获取反馈列表', { params });

    try {
      // TODO: 连接后端 API
      // return await httpClient.get<FeedbackListResponse>('/api/v1/user/feedback', params)

      // Mock 实现
      return new Promise((resolve) => {
        setTimeout(() => {
          // 简单的分页模拟
          const limit = params?.limit || 20;
          const startIndex = params?.cursor ? parseInt(params.cursor, 10) : 0;
          const endIndex = startIndex + limit;
          const items = mockFeedbacks.slice(startIndex, endIndex);

          resolve({
            items,
            nextCursor: endIndex < mockFeedbacks.length ? String(endIndex) : null,
            hasMore: endIndex < mockFeedbacks.length,
          });
        }, 300);
      });
    } catch (error) {
      logger.error('获取反馈列表失败', error);
      throw error;
    }
  },
};
