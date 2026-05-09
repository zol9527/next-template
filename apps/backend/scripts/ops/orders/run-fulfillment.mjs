import { createClient } from '@supabase/supabase-js'
import pino from 'pino'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 从 ops/orders/ 上溯 3 级到达后端根目录 apps/backend/
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = join(__dirname, '..', '..', '..')

const nodeEnv = process.env.NODE_ENV || 'development'
const envFiles = [`.env.${nodeEnv}`, '.env']
for (const file of envFiles) {
  const filePath = join(BACKEND_ROOT, file)
  try {
    process.loadEnvFile(filePath)
    console.log(`✓ Loaded env file: ${file}`)
    break
  } catch {
    // 文件不存在，继续尝试下一个
  }
}

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

function requireEnv(key, value) {
  if (!value) throw new Error(`${key} is required`)
  return value
}

const supabaseUrl = requireEnv('SUPABASE_URL', process.env.SUPABASE_URL)
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)

const supabase = createClient(supabaseUrl, serviceRoleKey)

function toIso(date) {
  return date.toISOString()
}

function computeBackoffSeconds(attemptCount) {
  const safeAttempt = Math.max(1, Math.min(Number(attemptCount) || 1, 20))
  const baseSeconds = 5
  const seconds = baseSeconds * 2 ** (safeAttempt - 1)
  return Math.min(seconds, 5 * 60)
}

async function tryMarkProcessing(jobId, nowIso) {
  const { data: existing, error: readError } = await supabase
    .from('order_fulfillment_jobs')
    .select('id,order_id,payment_id,status,attempt_count,available_at')
    .eq('id', jobId)
    .maybeSingle()

  if (readError) throw readError
  if (!existing) return null

  if (!['pending', 'retrying'].includes(existing.status)) return null
  if (existing.available_at > nowIso) return null

  const nextAttemptCount = Number(existing.attempt_count) + 1

  const { data, error } = await supabase
    .from('order_fulfillment_jobs')
    .update({
      status: 'processing',
      attempt_count: nextAttemptCount,
      started_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', jobId)
    .eq('attempt_count', existing.attempt_count)
    .in('status', ['pending', 'retrying'])
    .lte('available_at', nowIso)
    .select('id,order_id,payment_id,status,attempt_count')
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

async function markSucceeded(jobId, nowIso) {
  const { error } = await supabase
    .from('order_fulfillment_jobs')
    .update({
      status: 'succeeded',
      finished_at: nowIso,
      last_error: null,
      last_error_at: null,
      manual_required_at: null,
      updated_at: nowIso,
    })
    .eq('id', jobId)

  if (error) throw error
}

async function markRetrying(jobId, nowIso, nextAvailableAtIso, lastError) {
  const { error } = await supabase
    .from('order_fulfillment_jobs')
    .update({
      status: 'retrying',
      available_at: nextAvailableAtIso,
      finished_at: nowIso,
      last_error: lastError,
      last_error_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', jobId)

  if (error) throw error
}

async function markManualRequired(jobId, nowIso, lastError) {
  const { error } = await supabase
    .from('order_fulfillment_jobs')
    .update({
      status: 'manual_required',
      finished_at: nowIso,
      last_error: lastError,
      last_error_at: nowIso,
      manual_required_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', jobId)

  if (error) throw error
}

async function main() {
  const nowIso = toIso(new Date())

  const { data: jobs, error } = await supabase
    .from('order_fulfillment_jobs')
    .select('id,order_id,payment_id,attempt_count')
    .in('status', ['pending', 'retrying'])
    .lte('available_at', nowIso)
    .order('available_at', { ascending: true })
    .limit(20)

  if (error) throw error
  if (!jobs || jobs.length === 0) {
    logger.info('没有待处理的履约任务')
    return
  }

  logger.info({ count: jobs.length }, '开始处理履约任务')

  for (const job of jobs) {
    const claimed = await tryMarkProcessing(job.id, nowIso)
    if (!claimed) {
      continue
    }

    try {
      const { error: rpcError } = await supabase.rpc('process_order_fulfillment', {
        p_job_id: claimed.id,
      })

      if (rpcError) {
        throw rpcError
      }

      await markSucceeded(claimed.id, toIso(new Date()))
      logger.info({ jobId: claimed.id }, '履约成功')
    } catch (error) {
      const now = new Date()
      const attempts = Number(claimed.attempt_count) || 1
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (attempts >= 5) {
        await markManualRequired(claimed.id, toIso(now), errorMessage)
        logger.error({ jobId: claimed.id, error: errorMessage }, '履约失败，转人工处理')
      } else {
        const backoffSeconds = computeBackoffSeconds(attempts)
        const nextRun = new Date(now.getTime() + backoffSeconds * 1000)
        await markRetrying(claimed.id, toIso(now), toIso(nextRun), errorMessage)
        logger.warn({ jobId: claimed.id, error: errorMessage, backoffSeconds }, '履约失败，稍后重试')
      }
    }
  }
}

main().catch((error) => {
  logger.error({ err: error }, '履约任务执行失败')
  process.exit(1)
})
