/**
 * Promoter Code Service
 * 推广员推广码服务，提供推广码的生成、验证、绑定等业务逻辑
 */

import crypto from 'node:crypto'
import type { PromoterCode, PromoterCodeType, PromoterCodeStatus } from '@/plugins/promotion/contracts/promoter-codes.dto'
import type { PromoterCodeRepository } from '@/plugins/promotion/repositories/interfaces/promoter-code.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 推广码服务错误类
 */
export class PromoterCodeServiceError extends Error {
  public readonly code: 'INVALID_INPUT' | 'INVALID_STATE' | 'CONFLICT' | 'NOT_FOUND' | 'FORBIDDEN'

  constructor(code: PromoterCodeServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
Function: generateAutoCode

Description: 生成自动推广码（8位随机字母数字，确保易读性）

Parameters:
	无

Returns:
	code(string): 8位推广码
*/
function generateAutoCode(): string {
  // 去除易混淆字符：0OIl1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  let code = ''
  for (const byte of bytes) {
    code += chars[byte % chars.length]
  }
  return code
}

/**
Function: validateCustomCode

Description: 验证自定义推广码格式（仅字母数字，3-20位）

Parameters:
	code(string): 自定义推广码

Returns:
	valid(boolean): 是否有效
*/
function validateCustomCode(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/i.test(code)
}

/**
Function: createPromoterCodeService

Description: 创建推广码服务，负责推广码的生成、验证、绑定等业务逻辑

Parameters:
	deps({ promoterCodes: PromoterCodeRepository, distributions: DistributionRepository }): 依赖注入
	ctx(ServiceContext): Service 上下文

Returns:
	service(object): 提供推广码相关方法
*/
export function createPromoterCodeService(
  deps: {
    promoterCodes: PromoterCodeRepository
    distributions: DistributionRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
    Function: generateCodeForPromoter

    Description: 为推广员生成推广码（支持自动生成和自定义）

    Parameters:
      params({ promoterUserId: string, type: PromoterCodeType, customCode: string | undefined, activeTo: string | undefined }): 生成参数

    Returns:
      code(PromoterCode): 生成的推广码
    */
    async generateCodeForPromoter(params: {
      promoterUserId: string
      type: PromoterCodeType
      customCode?: string
      activeTo?: string
    }): Promise<PromoterCode> {
      const { promoterUserId, type, customCode, activeTo } = params

      // 自定义推广码验证
      if (type === 'custom') {
        if (!customCode) {
          throw new PromoterCodeServiceError('INVALID_INPUT', 'Custom code is required for custom type')
        }
        if (!validateCustomCode(customCode)) {
          throw new PromoterCodeServiceError('INVALID_INPUT', 'Custom code must be 3-20 alphanumeric characters')
        }
        const upperCode = customCode.toUpperCase()
        const exists = await deps.promoterCodes.checkCodeExists(repoCtx, { code: upperCode })
        if (exists) {
          throw new PromoterCodeServiceError('CONFLICT', 'Custom code already exists')
        }
      }

      // 自动生成推广码（带重试机制）
      let finalCode: string
      if (type === 'custom') {
        finalCode = customCode!.toUpperCase()
      } else {
        let attempts = 0
        const maxAttempts = 10
        do {
          finalCode = generateAutoCode()
          const exists = await deps.promoterCodes.checkCodeExists(repoCtx, { code: finalCode })
          if (!exists) break
          attempts++
        } while (attempts < maxAttempts)

        if (attempts >= maxAttempts) {
          throw new PromoterCodeServiceError('CONFLICT', 'Failed to generate unique code after multiple attempts')
        }
      }

      // 检查推广员总推广码数量限制（防止滥用）
      const totalCount = await deps.promoterCodes.getTotalCodesCount(repoCtx, { promoterUserId })
      if (totalCount >= 3) {
        throw new PromoterCodeServiceError('INVALID_STATE', '最多只能创建 3 个推广码')
      }

      const created = await deps.promoterCodes.createCode(repoCtx, {
        code: finalCode,
        promoterUserId,
        type,
        activeTo: activeTo ?? null,
        metadata: {},
      })

      logger.info({
        action: 'promoter_code.create',
        promoterUserId,
        codeId: created.id,
        code: finalCode,
        type,
      })

      return created
    },

    /**
    Function: getCodeByCode

    Description: 根据 code 查询推广码（用于验证）

    Parameters:
      params({ code: string }): 查询参数

    Returns:
      code(PromoterCode | null): 推广码，不存在或不可用时返回 null
    */
    async getCodeByCode(params: { code: string }): Promise<PromoterCode | null> {
      const codeRecord = await deps.promoterCodes.getCodeByCode(repoCtx, { code: params.code })
      if (!codeRecord) {
        return null
      }

      // 检查状态
      if (codeRecord.status !== 'active') {
        logger.info({ action: 'promoter_code.inactive', code: params.code, status: codeRecord.status })
        return null
      }

      // 检查有效期
      if (codeRecord.activeTo && new Date(codeRecord.activeTo) < new Date()) {
        logger.info({ action: 'promoter_code.expired', code: params.code, activeTo: codeRecord.activeTo })
        return null
      }

      return codeRecord
    },

    /**
    Function: bindByPromoterCode

    Description: 通过推广码绑定分销关系

    Parameters:
      params({ userId: string, code: string }): 绑定参数

    Returns:
      relation(object): 绑定的分销关系
    */
    async bindByPromoterCode(params: { userId: string; code: string }): Promise<{
      id: string
      userId: string
      promoterUserId: string
      effectiveAt: string
      promoterCode: string
    }> {
      const { userId, code } = params

      // 查询推广码
      const codeRecord = await this.getCodeByCode({ code })
      if (!codeRecord) {
        throw new PromoterCodeServiceError('NOT_FOUND', 'Invalid or inactive promoter code')
      }

      // 不能绑定自己
      if (codeRecord.promoterUserId === userId) {
        throw new PromoterCodeServiceError('INVALID_INPUT', 'Cannot bind to yourself')
      }

      // 检查是否已有分销关系
      const existingRelation = await deps.distributions.getRelationByUserId(repoCtx, { userId })
      if (existingRelation) {
        if (existingRelation.promoterUserId === codeRecord.promoterUserId) {
          // 已绑定到同一推广员，幂等返回
          return {
            id: existingRelation.id,
            userId: existingRelation.userId,
            promoterUserId: existingRelation.promoterUserId,
            effectiveAt: existingRelation.effectiveAt,
            promoterCode: code,
          }
        }
        throw new PromoterCodeServiceError('INVALID_STATE', 'Already bound to another promoter')
      }

      // 绑定分销关系
      const effectiveAt = new Date().toISOString()
      const relation = await deps.distributions.bindRelation(repoCtx, {
        userId,
        promoterUserId: codeRecord.promoterUserId,
        effectiveAt,
      })

      // 递增推广码使用次数
      await deps.promoterCodes.incrementUsageCount(repoCtx, {
        id: codeRecord.id,
        updatedAt: new Date().toISOString(),
      })

      logger.info({
        action: 'promoter_code.bind',
        userId,
        promoterUserId: codeRecord.promoterUserId,
        codeId: codeRecord.id,
        code,
      })

      return {
        id: relation.id,
        userId: relation.userId,
        promoterUserId: relation.promoterUserId,
        effectiveAt: relation.effectiveAt,
        promoterCode: code,
      }
    },

    /**
    Function: listCodesForPromoter

    Description: 列出推广员的推广码

    Parameters:
      params({ promoterUserId: string, limit: number, cursor: string | null, status: PromoterCodeStatus | undefined }): 查询参数

    Returns:
      result(object): 推广码列表和下一页游标
    */
    async listCodesForPromoter(params: {
      promoterUserId: string
      limit: number
      cursor: string | null
      status?: PromoterCodeStatus
    }): Promise<{ codes: PromoterCode[]; nextCursor: string | null }> {
      const result = await deps.promoterCodes.listCodesByPromoterUserId(repoCtx, {
        promoterUserId: params.promoterUserId,
        limit: params.limit,
        cursor: params.cursor,
        status: params.status ?? null,
      })

      return { codes: result.items, nextCursor: result.nextCursor }
    },

    /**
    Function: updateCodeStatus

    Description: 更新推广码状态

    Parameters:
      params({ id: string, status: PromoterCodeStatus, promoterUserId: string }): 更新参数

    Returns:
      code(PromoterCode): 更新后的推广码
    */
    async updateCodeStatus(params: {
      id: string
      status: PromoterCodeStatus
      promoterUserId: string
    }): Promise<PromoterCode> {
      const codeRecord = await deps.promoterCodes.getCodeById(repoCtx, { id: params.id })
      if (!codeRecord) {
        throw new PromoterCodeServiceError('NOT_FOUND', 'Promoter code not found')
      }

      // 权限校验：只能操作自己的推广码
      if (codeRecord.promoterUserId !== params.promoterUserId) {
        throw new PromoterCodeServiceError('FORBIDDEN', 'Access denied')
      }

      const updated = await deps.promoterCodes.updateCodeStatus(repoCtx, {
        id: params.id,
        status: params.status,
        updatedAt: new Date().toISOString(),
      })

      if (!updated) {
        throw new PromoterCodeServiceError('INVALID_STATE', 'Failed to update code status')
      }

      logger.info({
        action: 'promoter_code.update_status',
        codeId: params.id,
        oldStatus: codeRecord.status,
        newStatus: params.status,
      })

      return updated
    },

    /**
    Function: deleteCode

    Description: 删除推广码

    Parameters:
      params({ id: string, promoterUserId: string }): 删除参数

    Returns:
      void: 无返回值
    */
    async deleteCode(params: {
      id: string
      promoterUserId: string
    }): Promise<void> {
      const codeRecord = await deps.promoterCodes.getCodeById(repoCtx, { id: params.id })
      if (!codeRecord) {
        throw new PromoterCodeServiceError('NOT_FOUND', 'Promoter code not found')
      }

      // 权限校验：只能删除自己的推广码
      if (codeRecord.promoterUserId !== params.promoterUserId) {
        throw new PromoterCodeServiceError('FORBIDDEN', 'Access denied')
      }

      await deps.promoterCodes.deleteCode(repoCtx, { id: params.id })

      logger.info({
        action: 'promoter_code.delete',
        codeId: params.id,
        code: codeRecord.code,
      })
    },
  }
}
