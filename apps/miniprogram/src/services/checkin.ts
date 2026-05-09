/**
 * Function: checkinService
 *
 * Description: 签到服务模块，对接后端签到 API，提供用户每日签到、查看签到状态和签到历史的功能
 *
 * 后端 API 端点:
 *   POST /user/checkin          — 每日签到
 *   GET  /user/checkin/status   — 获取签到状态
 *   GET  /user/checkin/history  — 获取签到历史（query: month=YYYY-MM）
 *
 * 所有端点需要用户认证（Authorization header 由 httpClient 自动携带）
 *
 * Returns:
 *   checkin(function): 每日签到
 *   getCheckinStatus(function): 获取签到状态
 *   getCheckinHistory(function): 获取签到历史
 */

import { httpClient } from '../core/http-client';
import { logger } from '../utils/logger';
import { BusinessError } from '../utils/error-handler';

/**
 * 签到状态接口
 */
export interface CheckinStatus {
  todayCheckedIn: boolean; // 今日是否已签到
  streakDays: number; // 连续签到天数
  totalDays: number; // 总签到天数
  lastCheckinDate: string | null; // 最后一次签到日期，ISO 8601 格式
}

/**
 * 签到响应接口
 */
export interface CheckinResponse {
  success: boolean;
  streakDays: number; // 当前连续签到天数
  reward?: {
    // 签到奖励（可选，根据业务需求配置）
    points: number; // 积分奖励
    coupons?: string[]; // 优惠券 ID 数组（可选）
  };
}

/**
 * 签到历史接口
 */
export interface CheckinHistory {
  month: string; // 月份，格式：YYYY-MM
  days: string[]; // 已签到日期数组，格式：YYYY-MM-DD
}

/**
 * 签到服务 — 对接后端真实 API
 */
export const checkinService = {
  /**
   * 每日签到
   *
   * 调用后端 POST /user/checkin 接口
   * 如果今日已签到，后端会返回 409 状态码，前端抛出错误
   *
   * @returns Promise<CheckinResponse> - 签到响应
   */
  async checkin(): Promise<CheckinResponse> {
    logger.info('执行每日签到');

    try {
      const result = await httpClient.post<CheckinResponse>('/user/checkin');
      logger.info('签到成功', { streakDays: result?.streakDays, reward: result?.reward });
      return result;
    } catch (error: any) {
      // 后端返回 409 ALREADY_CHECKED_IN — 拦截器已转为 BusinessError
      // 兼容两种错误类型：BusinessError(code) 和普通 Error(message)
      const isAlreadyCheckedIn =
        (error instanceof BusinessError && error.code === 'ALREADY_CHECKED_IN') ||
        error?.message === '今日已签到';

      if (isAlreadyCheckedIn) {
        logger.warn('今日已签到');
        throw new Error('今日已签到');
      }

      // 未登录或 token 过期，给出更明确的提示
      if (error instanceof BusinessError && error.code === 'UNAUTHORIZED') {
        logger.warn('签到失败：未登录');
        throw new Error('请先登录后再签到');
      }

      logger.error('签到失败', error);
      throw error;
    }
  },

  /**
   * 获取签到状态
   *
   * 调用后端 GET /user/checkin/status 接口
   * 返回当前签到状态：是否已签到、连续天数、总天数等
   *
   * @returns Promise<CheckinStatus> - 签到状态
   */
  async getCheckinStatus(): Promise<CheckinStatus> {
    logger.info('获取签到状态');

    try {
      const result = await httpClient.get<CheckinStatus>('/user/checkin/status');
      logger.info('获取签到状态成功', result);
      return result;
    } catch (error) {
      logger.error('获取签到状态失败', error);
      throw error;
    }
  },

  /**
   * 获取签到历史
   *
   * 调用后端 GET /user/checkin/history?month=YYYY-MM 接口
   * 返回指定月份的签到日期列表
   *
   * @param month - 月份，格式：YYYY-MM
   * @returns Promise<CheckinHistory> - 签到历史
   */
  async getCheckinHistory(month: string): Promise<CheckinHistory> {
    logger.info('获取签到历史', { month });

    // 前端参数校验：确保月份格式正确
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      logger.warn('无效的月份格式', { month });
      throw new Error('无效的月份格式，应为 YYYY-MM');
    }

    try {
      const result = await httpClient.get<CheckinHistory>('/user/checkin/history', { month });
      logger.info('获取签到历史成功', { month, daysCount: result?.days?.length ?? 0 });
      return result;
    } catch (error) {
      logger.error('获取签到历史失败', error);
      throw error;
    }
  },
};
