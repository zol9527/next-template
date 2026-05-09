import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const JOB_SELECT = 'id,order_id,payment_id,status,attempt_count,available_at,started_at,finished_at,last_error,last_error_at,manual_required_at,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

function mapJob(row: Record<string, unknown>) {
  return {
    id: getString(row, 'id')!,
    orderId: getString(row, 'order_id')!,
    paymentId: getString(row, 'payment_id')!,
    status: getString(row, 'status') as 'pending' | 'processing' | 'succeeded' | 'retrying' | 'manual_required',
    attemptCount: getNumber(row, 'attempt_count') ?? 0,
    availableAt: getString(row, 'available_at') ?? new Date().toISOString(),
    startedAt: getString(row, 'started_at'),
    finishedAt: getString(row, 'finished_at'),
    lastError: getString(row, 'last_error'),
    lastErrorAt: getString(row, 'last_error_at'),
    manualRequiredAt: getString(row, 'manual_required_at'),
    createdAt: getString(row, 'created_at')!,
    updatedAt: getString(row, 'updated_at')!,
  }
}

/**
Function: createSupabaseOrderFulfillmentJobRepository

Description: 创建基于 Supabase（Service Role）的订单履约任务仓储实现

Parameters:

Returns:
    repository(OrderFulfillmentJobRepository): OrderFulfillmentJobRepository 的 Supabase 实现
*/
export function createSupabaseOrderFulfillmentJobRepository(): OrderFulfillmentJobRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async listDueJobs(ctx: RepoContext, params: { limit: number; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_due_jobs', limit: params.limit, nowIso: params.nowIso })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .select(JOB_SELECT)
        .in('status', ['pending', 'retrying'])
        .or(`available_at.is.null,available_at.lte.${params.nowIso}`)
        .order('created_at', { ascending: true })
        .limit(params.limit)

      if (error) throw error
      return (data ?? []).map((r) => mapJob(r as unknown as Record<string, unknown>))
    },

    async tryMarkProcessing(ctx: RepoContext, params: { jobId: string; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'try_mark_processing', jobId: params.jobId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .update({ status: 'processing', started_at: params.nowIso, updated_at: params.nowIso })
        .eq('id', params.jobId)
        .in('status', ['pending', 'retrying'])
        .select(JOB_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async markSucceeded(ctx: RepoContext, params: { jobId: string; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_succeeded', jobId: params.jobId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .update({ status: 'succeeded', finished_at: params.nowIso, updated_at: params.nowIso })
        .eq('id', params.jobId)
        .select(JOB_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async markRetrying(ctx: RepoContext, params: { jobId: string; nowIso: string; nextAvailableAtIso: string; lastError: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_retrying', jobId: params.jobId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .update({
          status: 'retrying',
          available_at: params.nextAvailableAtIso,
          last_error: params.lastError,
          last_error_at: params.nowIso,
          updated_at: params.nowIso,
        })
        .eq('id', params.jobId)
        .select(JOB_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async markManualRequired(ctx: RepoContext, params: { jobId: string; nowIso: string; lastError: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_manual_required', jobId: params.jobId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .update({ status: 'manual_required', last_error: params.lastError, last_error_at: params.nowIso, manual_required_at: params.nowIso, updated_at: params.nowIso })
        .eq('id', params.jobId)
        .select(JOB_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async getJobById(ctx: RepoContext, params: { jobId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_job_by_id', jobId: params.jobId })

      const { data, error } = await supabase.from('order_fulfillment_jobs').select(JOB_SELECT).eq('id', params.jobId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async upsertJobByPaymentId(ctx: RepoContext, params: { orderId: string; paymentId: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'upsert_job_by_payment_id', orderId: params.orderId, paymentId: params.paymentId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .upsert({ order_id: params.orderId, payment_id: params.paymentId, available_at: params.updatedAt, updated_at: params.updatedAt }, { onConflict: 'order_id' })
        .select(JOB_SELECT)
        .single()

      if (error) throw error
      return mapJob(data as unknown as Record<string, unknown>)
    },

    async getFulfillmentStatusByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_fulfillment_status_by_order_id', orderId: params.orderId })

      const { data, error } = await supabase
        .from('order_fulfillment_jobs')
        .select('status')
        .eq('order_id', params.orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data?.status ?? null
    },

    async applyFulfillment(ctx: RepoContext, params: { orderId: string; paymentId: string }) {
      const { logger } = ctx
      logger.info({ action: 'apply_fulfillment', orderId: params.orderId, paymentId: params.paymentId })

      let entitlementInserted = false
      let commissionInserted = false

      // 1. 查询订单信息
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id,order_no,user_id,product_id,price_amount')
        .eq('id', params.orderId)
        .maybeSingle()

      if (orderError) throw orderError
      if (!orderData) {
        logger.warn({ action: 'apply_fulfillment', message: 'order_not_found', orderId: params.orderId })
        return { entitlementInserted, commissionInserted }
      }

      const productId = orderData.product_id as string
      const userId = orderData.user_id as string
      const priceAmount = String(orderData.price_amount ?? 0)

      // 2. 插入课程权益记录 (course_entitlements)
      const { data: existingEntitlement, error: entitlementCheckError } = await supabase
        .from('course_entitlements')
        .select('id')
        .eq('order_id', params.orderId)
        .maybeSingle()

      if (entitlementCheckError) throw entitlementCheckError

      if (!existingEntitlement) {
        const { error: entitlementError } = await supabase.from('course_entitlements').insert({
          user_id: userId,
          product_id: productId,
          order_id: params.orderId,
          payment_id: params.paymentId,
          status: 'active',
        })

        if (entitlementError) throw entitlementError
        entitlementInserted = true
        logger.info({ action: 'apply_fulfillment', message: 'entitlement_created', orderId: params.orderId })
      } else {
        logger.info({ action: 'apply_fulfillment', message: 'entitlement_already_exists', orderId: params.orderId })
      }

      // 3. 插入佣金记录 (commission_records)
      // 查询分销关系和推广员等级
      const { data: relationData, error: relationError } = await supabase
        .from('distribution_relations')
        .select('promoter_user_id')
        .eq('user_id', userId)
        .is('inactive_at', null)
        .maybeSingle()

      if (relationError) throw relationError

      if (relationData) {
        const promoterUserId = relationData.promoter_user_id as string

        // 查询推广员当前等级
        const { data: levelRecord, error: levelError } = await supabase
          .from('promoter_level_records')
          .select('promoter_level_id')
          .eq('user_id', promoterUserId)
          .is('inactive_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (levelError) throw levelError

        let commissionRate = '0.10' // 默认佣金比例
        let rateSource: 'promoter_level' | 'global_rule' | null = null

        if (levelRecord) {
          const { data: levelData, error: levelDataError } = await supabase
            .from('promoter_levels')
            .select('commission_rate')
            .eq('id', levelRecord.promoter_level_id)
            .maybeSingle()

          if (levelDataError) throw levelDataError
          if (levelData) {
            commissionRate = String(levelData.commission_rate ?? '0.10')
            rateSource = 'promoter_level'
          }
        } else {
          // 使用全局佣金规则
          const { data: globalRule, error: globalRuleError } = await supabase
            .from('commission_rules')
            .select('rate')
            .eq('scope', 'global')
            .lte('active_from', new Date().toISOString())
            .or('active_to.is.null,active_to.gt.' + new Date().toISOString())
            .order('active_from', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (globalRuleError) throw globalRuleError
          if (globalRule) {
            commissionRate = String(globalRule.rate ?? '0.10')
            rateSource = 'global_rule'
          }
        }

        // 检查是否已有佣金记录
        const { data: existingCommission, error: commissionCheckError } = await supabase
          .from('commission_records')
          .select('id')
          .eq('order_id', params.orderId)
          .eq('promoter_user_id', promoterUserId)
          .maybeSingle()

        if (commissionCheckError) throw commissionCheckError

        if (!existingCommission) {
          const commissionAmount = (parseFloat(priceAmount) * parseFloat(commissionRate)).toFixed(2)

          const { error: commissionError } = await supabase.from('commission_records').insert({
            order_id: params.orderId,
            promoter_user_id: promoterUserId,
            base_amount: priceAmount,
            rate: commissionRate,
            commission_amount: commissionAmount,
            status: 'frozen',
            rate_source: rateSource,
          })

          if (commissionError) throw commissionError
          commissionInserted = true
          logger.info({ action: 'apply_fulfillment', message: 'commission_created', orderId: params.orderId, promoterUserId })
        } else {
          logger.info({ action: 'apply_fulfillment', message: 'commission_already_exists', orderId: params.orderId })
        }
      } else {
        logger.info({ action: 'apply_fulfillment', message: 'no_distribution_relation', userId })
      }

      return { entitlementInserted, commissionInserted }
    },
  }
}
