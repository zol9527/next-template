/**
 * Compatibility re-export.
 *
 * 项目规范要求使用 src/env.mjs 作为唯一的环境变量入口。
 * 保留 src/env.ts 仅用于 TypeScript/旧引用兼容，避免出现两份 schema 漂移。
 */
import { env as rawEnv, BACKEND_ROOT_DIR as rawBackendRootDir } from './env.mjs'

export const env: typeof rawEnv & { SITE_CURRENCY_CODE: string } = rawEnv

/** 后端项目根目录（next.config.ts 所在目录），用于路径解析 */
export const BACKEND_ROOT_DIR: string = rawBackendRootDir

export { APP_NAME, DEFAULT_TITLE, TITLE_TEMPLATE, OG_SITE_NAME, SITE_DESCRIPTION, getCopyrightText } from './site'
