/**
 * Supabase Miniprogram FAQ Repository (Placeholder)
 *
 * @module repositories/supabase/miniprogram-faq
 * @description Supabase 实现的小程序常见问题仓储(占位符)
 *
 * 注意: 这是一个占位符实现。如果需要使用 Supabase,请实现以下方法。
 */

import type { MiniProgramFaqRepository } from '@/plugins/wechat/repositories/interfaces/miniprogram-faq.interface'

/**
 * Function: createSupabaseMiniProgramFaqRepository
 *
 * Description: 创建 Supabase 小程序常见问题仓储实例(占位符)
 *
 * Returns:
 *     repository(MiniProgramFaqRepository): 常见问题仓储实例
 *
 * Throws:
 *     Error: 调用此方法时会抛出错误,提示需要实现
 */
export function createSupabaseMiniProgramFaqRepository(): MiniProgramFaqRepository {
	throw new Error(
		'Supabase implementation for MiniProgramFaqRepository is not yet implemented. ' +
			'Please either switch to Prisma or implement this repository.'
	)

	// 以下是实现示例,需要根据实际情况补充:

	// return {
	//   async listAll(ctx) {
	//     // TODO: 实现查询逻辑
	//     return []
	//   },
	//
	//   async listEnabled(ctx) {
	//     // TODO: 实现查询逻辑
	//     return []
	//   },
	//
	//   async getById(ctx, params) {
	//     // TODO: 实现查询逻辑
	//     return null
	//   },
	//
	//   async create(ctx, params) {
	//     // TODO: 实现创建逻辑
	//     return null as any
	//   },
	//
	//   async update(ctx, params) {
	//     // TODO: 实现更新逻辑
	//     return null as any
	//   },
	//
	//   async delete(ctx, params) {
	//     // TODO: 实现删除逻辑
	//   }
	// }
}
