import type { RepoContext } from '@/types/repo/repo-context'
import type { ExportJobResponse } from '@/contracts/dtos/export.dto'
import type { BuyersPaymentExportRow } from '@/contracts/dtos/export-buyers.dto'
import type { PromotersCommissionExportRow } from '@/plugins/promotion/contracts/export-promoters.dto'

/**
 * 导出任务筛选条件
 */
export interface ExportJobFilters {
  jobType?: string
  status?: string
  limit?: number
  cursor?: string | null
}

/**
 * 购买者支付记录筛选条件
 */
export interface BuyersPaymentFilters {
  startTime?: string
  endTime?: string
  status?: string
  productId?: string
}

/**
 * 推广员佣金记录筛选条件
 */
export interface PromotersCommissionFilters {
  startTime?: string
  endTime?: string
  settlementStatus?: string
  promoterLevel?: string
}

/**
 * 导出任务仓库接口
 */
export interface ExportJobRepository {
  /**
   * Function: createExportJob
   *
   * Description: 创建导出任务
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(object): 请求参数
   *     jobType(string): 任务类型
   *     requestedBy(string): 请求者用户 ID
   *     filters(object): 筛选条件
   *
   * Returns:
   *   job(ExportJobResponse): 创建的导出任务
   */
  createExportJob(
    ctx: RepoContext,
    params: {
      jobType: string
      requestedBy: string
      filters: Record<string, unknown>
    }
  ): Promise<ExportJobResponse>

  /**
   * Function: getExportJobById
   *
   * Description: 根据 ID 获取导出任务
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(object): 请求参数
   *     id(string): 任务 ID
   *
   * Returns:
   *   job(ExportJobResponse | null): 导出任务，不存在时返回 null
   */
  getExportJobById(ctx: RepoContext, params: { id: string }): Promise<ExportJobResponse | null>

  /**
   * Function: listExportJobs
   *
   * Description: 列出导出任务
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(ExportJobFilters): 筛选条件
   *
   * Returns:
   *   result(object): 导出任务列表
   *     items(Array<ExportJobResponse>): 任务列表
   *     nextCursor(string | null): 下一页游标
   */
  listExportJobs(
    ctx: RepoContext,
    params: ExportJobFilters
  ): Promise<{ items: ExportJobResponse[]; nextCursor: string | null }>

  /**
   * Function: updateExportJobStatus
   *
   * Description: 更新导出任务状态
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(object): 请求参数
   *     id(string): 任务 ID
   *     status(string): 新状态
   *     fileUrl(string, optional): 文件 URL
   *     fileName(string, optional): 文件名
   *     fileSize(number, optional): 文件大小
   *     recordCount(number, optional): 记录数量
   *     errorMessage(string, optional): 错误信息
   *
   * Returns:
   *   job(ExportJobResponse): 更新后的导出任务
   */
  updateExportJobStatus(
    ctx: RepoContext,
    params: {
      id: string
      status: string
      fileUrl?: string
      fileName?: string
      fileSize?: number
      recordCount?: number
      errorMessage?: string
    }
  ): Promise<ExportJobResponse>

  /**
   * Function: getBuyersPaymentData
   *
   * Description: 获取购买者支付记录数据（用户聚合）
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(BuyersPaymentFilters): 筛选条件
   *
   * Returns:
   *   rows(Array<BuyersPaymentExportRow>): 购买者支付记录行数据
   */
  getBuyersPaymentData(
    ctx: RepoContext,
    params: BuyersPaymentFilters
  ): Promise<BuyersPaymentExportRow[]>

  /**
   * Function: getBuyersPaymentDataPaginated
   *
   * Description: 获取购买者支付记录数据（游标分页）
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(BuyersPaymentFilters & { cursor?: string; limit: number }): 筛选条件 + 分页参数
   *
   * Returns:
   *   result(object): 分页结果
   *     rows(Array<BuyersPaymentExportRow>): 当页数据
   *     nextCursor(string | null): 下一页游标
   */
  getBuyersPaymentDataPaginated(
    ctx: RepoContext,
    params: BuyersPaymentFilters & { cursor?: string; limit: number }
  ): Promise<{ rows: BuyersPaymentExportRow[]; nextCursor: string | null }>

  /**
   * Function: getPromotersCommissionData
   *
   * Description: 获取推广员佣金记录数据（推广员聚合）
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(PromotersCommissionFilters): 筛选条件
   *
   * Returns:
   *   rows(Array<PromotersCommissionExportRow>): 推广员佣金记录行数据
   */
  getPromotersCommissionData(
    ctx: RepoContext,
    params: PromotersCommissionFilters
  ): Promise<PromotersCommissionExportRow[]>

  /**
   * Function: getPromotersCommissionDataPaginated
   *
   * Description: 获取推广员佣金记录数据（游标分页）
   *
   * Parameters:
   *   ctx(RepoContext): 仓库上下文
   *   params(PromotersCommissionFilters & { cursor?: string; limit: number }): 筛选条件 + 分页参数
   *
   * Returns:
   *   result(object): 分页结果
   *     rows(Array<PromotersCommissionExportRow>): 当页数据
   *     nextCursor(string | null): 下一页游标
   */
  getPromotersCommissionDataPaginated(
    ctx: RepoContext,
    params: PromotersCommissionFilters & { cursor?: string; limit: number }
  ): Promise<{ rows: PromotersCommissionExportRow[]; nextCursor: string | null }>
}
