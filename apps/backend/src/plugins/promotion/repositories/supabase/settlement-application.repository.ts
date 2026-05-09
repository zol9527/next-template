import type { SettlementApplicationRepository } from '@/plugins/promotion/repositories/interfaces/settlement-application.interface'
import type { AdminSettlementApplication, AdminSettlementApplicationListQuery } from '@/plugins/promotion/contracts/settlement-applications.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const SELECT_FIELDS = 'id,promoter_user_id,amount,status,payment_method,payment_account,rejection_reason,reviewer_id,settlement_id,created_at,updated_at'

function mapRow(row: Record<string, unknown>): AdminSettlementApplication {
  return {
    id: row.id as string,
    promoterUserId: row.promoter_user_id as string,
    amount: String(row.amount),
    status: row.status as 'pending' | 'approved' | 'rejected' | 'paid' | 'failed',
    paymentMethod: row.payment_method as string,
    paymentAccount: row.payment_account as string | null,
    rejectionReason: row.rejection_reason as string | null,
    settlementId: row.settlement_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    reviewerId: row.reviewer_id as string | null,
  }
}

export function createSupabaseSettlementApplicationRepository(): SettlementApplicationRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async createApplication(ctx: RepoContext, params: { promoterUserId: string; amount: string; paymentMethod: string; paymentAccount?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'create_application', promoterUserId: params.promoterUserId, amount: params.amount })

      const { data, error } = await supabase
        .from('settlement_applications')
        .insert({
          promoter_user_id: params.promoterUserId,
          amount: params.amount,
          payment_method: params.paymentMethod,
          payment_account: params.paymentAccount,
        })
        .select(SELECT_FIELDS)
        .single()

      if (error) throw error
      return mapRow(data as unknown as Record<string, unknown>)
    },

    async getApplicationById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_application_by_id', id: params.id })

      const { data, error } = await supabase
        .from('settlement_applications')
        .select(SELECT_FIELDS)
        .eq('id', params.id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRow(data as unknown as Record<string, unknown>)
    },

    async updateApplicationStatus(ctx: RepoContext, params: {
      id: string
      status: string
      updatedAt: string
      rejectionReason?: string | undefined
      reviewerId?: string | undefined
      settlementId?: string | undefined
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_application_status', id: params.id, status: params.status })

      const updates: Record<string, unknown> = {
        status: params.status,
        updated_at: params.updatedAt,
      }
      if (params.rejectionReason !== undefined) updates.rejection_reason = params.rejectionReason
      if (params.reviewerId !== undefined) updates.reviewer_id = params.reviewerId
      if (params.settlementId !== undefined) updates.settlement_id = params.settlementId

      const { data, error } = await supabase
        .from('settlement_applications')
        .update(updates)
        .eq('id', params.id)
        .select(SELECT_FIELDS)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRow(data as unknown as Record<string, unknown>)
    },

    async listApplications(ctx: RepoContext, params: AdminSettlementApplicationListQuery & { promoterUserId?: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_applications', limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 50))
      let query = supabase.from('settlement_applications').select(SELECT_FIELDS).order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)
      if (params.cursor) query = query.lt('created_at', params.cursor)
      if (params.promoterUserId) query = query.eq('promoter_user_id', params.promoterUserId)

      const { data, error } = await query.limit(safeLimit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapRow(r as unknown as Record<string, unknown>))
      const nextCursor = items.length === safeLimit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor }
    },
  }
}
