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
import { httpClient, RequestError } from '../core/http-client';
import { createErrorFromResponse } from '../utils/error-handler';

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

/** 后端用户反馈接口路径 */
const FEEDBACK_API_PATH = '/user/feedback';

/**
 * 判断图片地址是否为后端 DTO 可接受的 URL。
 * 小程序 chooseImage 返回的是本地临时路径，当前后端反馈接口只接受 URL，
 * 因此提交前需要过滤掉未上传的本地临时路径，避免整个反馈请求被 400 拒绝。
 */
function isRemoteImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

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
      const remoteImages = (data.images || []).filter(isRemoteImageUrl);

      if ((data.images?.length || 0) > remoteImages.length) {
        logger.warn('反馈截图包含未上传的本地临时路径，提交时已忽略', {
          total: data.images?.length || 0,
          submitted: remoteImages.length,
        });
      }

      const feedback = await httpClient.post<Feedback>(FEEDBACK_API_PATH, {
        type: data.type,
        title: data.title,
        content: data.content,
        images: remoteImages,
      });

      logger.info('提交反馈成功', { feedbackId: feedback.id });
      return { success: true };
    } catch (error) {
      // 将 HTTP 层的 RequestError 转换为应用层错误，保留后端返回的具体错误消息
      if (error instanceof RequestError && error.response) {
        throw createErrorFromResponse(error.response.statusCode, error.response.data);
      }
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
      return await httpClient.get<FeedbackListResponse>(FEEDBACK_API_PATH, params);
    } catch (error) {
      logger.error('获取反馈列表失败', error);
      throw error;
    }
  },
};
