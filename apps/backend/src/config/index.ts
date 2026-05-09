/**
 * Compatibility re-export.
 *
 * 项目规范要求使用 src/env.mjs 作为唯一的环境变量入口。
 * 保留 src/env.ts 仅用于 TypeScript/旧引用兼容，避免出现两份 schema 漂移。
 */
import { env as rawEnv } from './env.mjs'

export const env: typeof rawEnv & { SITE_CURRENCY_CODE: string } = rawEnv
