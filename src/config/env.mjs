import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * 集中校验并导出运行时环境变量（避免在组件中直接读取 process.env）
 *
 * 注意：此文件由 Next.js 自动加载 .env 文件，无需手动调用 loadEnvFile。
 * loadEnvFile 函数已移至 @/config/load-env-file，用于非 Next.js 环境。
 */
export const env = createEnv({
  server: {
    // 基础配置
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    SITE_CURRENCY_CODE: z.string().min(1).default('CNY'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // 认证相关
    AUTH_JWT_ACCESS_SECRET: z.string().min(32).optional(),
    AUTH_REFRESH_TOKEN_PEPPER: z.string().min(32).optional(),
    AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
    AUTH_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 24 * 60 * 60),
    AUTH_MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(3),
    AUTH_LOGIN_LOCK_THRESHOLD: z.coerce.number().int().positive().default(10),
    AUTH_LOGIN_LOCK_DURATION_SECONDS: z.coerce.number().int().positive().default(10 * 60),

    // Cookie 相关
    AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
    AUTH_COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),

    // CORS 相关
    AUTH_ALLOWED_ORIGINS: z.string().optional(),

    // 微信相关
    WECHAT_APPID: z.string().min(1).optional(),
    WECHAT_APPSECRET: z.string().min(1).optional(),
    WECHAT_SESSION_KEY_SECRET: z.string().min(32).optional(),
    WECHAT_PAY_APPID: z.string().min(1).optional(),
    WECHAT_PAY_MCHID: z.string().min(1).optional(),
    WECHAT_PAY_API_V3_KEY: z.string().min(1).optional(),
    WECHAT_PAY_CERT_SERIAL: z.string().min(1).optional(),
    WECHAT_PAY_PRIVATE_KEY_PEM: z.string().min(1).optional(),
    WECHAT_PAY_PUBLIC_KEY: z.string().min(1).optional(),
    WECHAT_PAY_PUBLIC_KEY_ID: z.string().min(1).optional(),
    WECHAT_PAY_PUBLIC_KEYS_JSON: z.string().min(1).optional(),
    WECHAT_PAY_NOTIFY_URL: z.string().url().optional(),

    // 内部定时任务认证令牌
    INTERNAL_CRON_TOKEN: z.string().min(16).optional(),

    // 内部 API IP 白名单（支持单个 IP 和 CIDR 格式，逗号分隔）
    INTERNAL_ALLOWED_IPS: z.string().optional(),

    // 阿里云 OSS 相关
    ALIYUN_OSS_ACCESS_KEY_ID: z.string().min(1).optional(),
    ALIYUN_OSS_ACCESS_KEY_SECRET: z.string().min(1).optional(),
    ALIYUN_OSS_BUCKET: z.string().min(1).optional(),
    ALIYUN_OSS_REGION: z.string().min(1).optional(),
    ALIYUN_OSS_UPLOAD_HOST: z.string().url().optional(),
    ALIYUN_OSS_DIR_PREFIX: z.string().min(1).optional(),
    ALIYUN_OSS_POLICY_TTL_SECONDS: z.coerce.number().int().positive().default(60),

    // 初始管理员账号
    INITIAL_ADMIN_USERNAME: z.string().min(1).optional(),
    INITIAL_ADMIN_PASSWORD: z.string().min(8).optional(),

    // 日志相关
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    LOG_DIR: z.string().min(1).optional(),
    LOG_TO_STDOUT: z.coerce.boolean().optional(),
    LOG_ROTATE_SIZE_BYTES: z.coerce.number().int().positive().optional(),
    LOG_ROTATE_DAILY: z.coerce.boolean().optional(),
    LOG_RETENTION_DAYS: z.coerce.number().int().positive().optional(),
    LOG_RETENTION_MAX_TOTAL_BYTES: z.coerce.number().int().positive().optional(),
    LOG_HTTP_DETAILS_ENABLED: z.coerce.boolean().default(false),

    // 数据库相关
    DATABASE_PROVIDER: z.enum(['supabase', 'prisma']).default('supabase'),
    DATABASE_URL: z.string().url().optional(),

    // MySQL/MariaDB 连接配置（当 DATABASE_PROVIDER=prisma 时使用）
    DATABASE_HOST: z.string().min(1).optional(),
    DATABASE_USER: z.string().min(1).optional(),
    DATABASE_PASSWORD: z.string().min(1).optional(),
    DATABASE_NAME: z.string().min(1).optional(),
    CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

    // OSS 提供者配置
    OSS_PROVIDER: z.enum(['aliyun_oss', 'tencent_cos', 'local']).default('local'),
    LOCAL_UPLOAD_HOST: z.string().url().optional(),
    LOCAL_UPLOAD_DIR: z.string().min(1).default('uploads'),

    // 用户证件存储配置
    USER_DOCUMENTS_STORAGE_DIR: z.string().min(1).default('uploads/user-documents'),
    USER_DOCUMENTS_MAX_FILE_SIZE: z.coerce.number().int().positive().default(5242880),

    // 腾讯云 COS 相关
    TENCENT_COS_SECRET_ID: z.string().min(1).optional(),
    TENCENT_COS_SECRET_KEY: z.string().min(1).optional(),
    TENCENT_COS_BUCKET: z.string().min(1).optional(),
    TENCENT_COS_REGION: z.string().min(1).optional(),
    TENCENT_COS_CDN_HOST: z.string().url().optional(),

    // 签名 URL TTL 配置
    OSS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

    // ==================== MFA Configuration ====================
    MFA_SECRET_ENCRYPTION_KEY: z.string().min(32, 'MFA 加密密钥必须至少 32 字节'),
    TOTP_SERVICE_NAME: z.string().default('EduMiniApp'),
    TOTP_ISSUER: z.string().default('EduMiniApp Admin'),
    TOTP_DIGITS: z.coerce.number().default(6),
    TOTP_STEP: z.coerce.number().default(30),
    MFA_ACTION_TOKEN_TTL: z.coerce.number().default(300),
    MFA_PENDING_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(300),

    // ==================== Rate Limit Configuration ====================
    RATE_LIMIT_TRUST_PROXY: z.coerce.boolean().default(false),
    RATE_LIMIT_ALLOW_PRIVATE_IP: z.coerce.boolean().default(false),
    RATE_LIMIT_REQUIRE_IP: z.coerce.boolean().default(true),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  },
  runtimeEnv: {
    // 基础配置
    NODE_ENV: process.env.NODE_ENV,
    SITE_CURRENCY_CODE: process.env.SITE_CURRENCY_CODE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

    // 认证相关
    AUTH_JWT_ACCESS_SECRET: process.env.AUTH_JWT_ACCESS_SECRET,
    AUTH_REFRESH_TOKEN_PEPPER: process.env.AUTH_REFRESH_TOKEN_PEPPER,
    AUTH_ACCESS_TTL_SECONDS: process.env.AUTH_ACCESS_TTL_SECONDS,
    AUTH_REFRESH_TTL_SECONDS: process.env.AUTH_REFRESH_TTL_SECONDS,
    AUTH_MAX_SESSIONS_PER_USER: process.env.AUTH_MAX_SESSIONS_PER_USER,
    AUTH_LOGIN_LOCK_THRESHOLD: process.env.AUTH_LOGIN_LOCK_THRESHOLD,
    AUTH_LOGIN_LOCK_DURATION_SECONDS: process.env.AUTH_LOGIN_LOCK_DURATION_SECONDS,

    // Cookie 相关
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
    AUTH_COOKIE_SAMESITE: process.env.AUTH_COOKIE_SAMESITE,

    // CORS 相关
    AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,

    // 微信相关
    WECHAT_APPID: process.env.WECHAT_APPID,
    WECHAT_APPSECRET: process.env.WECHAT_APPSECRET,
    WECHAT_SESSION_KEY_SECRET: process.env.WECHAT_SESSION_KEY_SECRET,
    WECHAT_PAY_APPID: process.env.WECHAT_PAY_APPID,
    WECHAT_PAY_MCHID: process.env.WECHAT_PAY_MCHID,
    WECHAT_PAY_API_V3_KEY: process.env.WECHAT_PAY_API_V3_KEY,
    WECHAT_PAY_CERT_SERIAL: process.env.WECHAT_PAY_CERT_SERIAL,
    WECHAT_PAY_PRIVATE_KEY_PEM: process.env.WECHAT_PAY_PRIVATE_KEY_PEM,
    WECHAT_PAY_PUBLIC_KEY: process.env.WECHAT_PAY_PUBLIC_KEY,
    WECHAT_PAY_PUBLIC_KEY_ID: process.env.WECHAT_PAY_PUBLIC_KEY_ID,
    WECHAT_PAY_PUBLIC_KEYS_JSON: process.env.WECHAT_PAY_PUBLIC_KEYS_JSON,
    WECHAT_PAY_NOTIFY_URL: process.env.WECHAT_PAY_NOTIFY_URL,

    // 内部定时任务认证令牌
    INTERNAL_CRON_TOKEN: process.env.INTERNAL_CRON_TOKEN,

    // 内部 API IP 白名单
    INTERNAL_ALLOWED_IPS: process.env.INTERNAL_ALLOWED_IPS,

    // 阿里云 OSS 相关
    ALIYUN_OSS_ACCESS_KEY_ID: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    ALIYUN_OSS_ACCESS_KEY_SECRET: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    ALIYUN_OSS_BUCKET: process.env.ALIYUN_OSS_BUCKET,
    ALIYUN_OSS_REGION: process.env.ALIYUN_OSS_REGION,
    ALIYUN_OSS_UPLOAD_HOST: process.env.ALIYUN_OSS_UPLOAD_HOST,
    ALIYUN_OSS_DIR_PREFIX: process.env.ALIYUN_OSS_DIR_PREFIX,
    ALIYUN_OSS_POLICY_TTL_SECONDS: process.env.ALIYUN_OSS_POLICY_TTL_SECONDS,

    // 初始管理员账号
    INITIAL_ADMIN_USERNAME: process.env.INITIAL_ADMIN_USERNAME,
    INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,

    // 日志相关
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_DIR: process.env.LOG_DIR,
    LOG_TO_STDOUT: process.env.LOG_TO_STDOUT,
    LOG_ROTATE_SIZE_BYTES: process.env.LOG_ROTATE_SIZE_BYTES,
    LOG_ROTATE_DAILY: process.env.LOG_ROTATE_DAILY,
    LOG_RETENTION_DAYS: process.env.LOG_RETENTION_DAYS,
    LOG_RETENTION_MAX_TOTAL_BYTES: process.env.LOG_RETENTION_MAX_TOTAL_BYTES,
    LOG_HTTP_DETAILS_ENABLED: process.env.LOG_HTTP_DETAILS_ENABLED,

    // 数据库相关
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    DATABASE_URL: process.env.DATABASE_URL,

    // MySQL/MariaDB 连接配置
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    CONNECTION_LIMIT: process.env.CONNECTION_LIMIT,

    // OSS 提供者配置
    OSS_PROVIDER: process.env.OSS_PROVIDER,
    LOCAL_UPLOAD_HOST: process.env.LOCAL_UPLOAD_HOST,
    LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR,

    // 用户证件存储配置
    USER_DOCUMENTS_STORAGE_DIR: process.env.USER_DOCUMENTS_STORAGE_DIR,
    USER_DOCUMENTS_MAX_FILE_SIZE: process.env.USER_DOCUMENTS_MAX_FILE_SIZE,

    // 腾讯云 COS 相关
    TENCENT_COS_SECRET_ID: process.env.TENCENT_COS_SECRET_ID,
    TENCENT_COS_SECRET_KEY: process.env.TENCENT_COS_SECRET_KEY,
    TENCENT_COS_BUCKET: process.env.TENCENT_COS_BUCKET,
    TENCENT_COS_REGION: process.env.TENCENT_COS_REGION,
    TENCENT_COS_CDN_HOST: process.env.TENCENT_COS_CDN_HOST,

    // 签名 URL TTL 配置
    OSS_SIGNED_URL_TTL_SECONDS: process.env.OSS_SIGNED_URL_TTL_SECONDS,

    // ==================== MFA Configuration ====================
    MFA_SECRET_ENCRYPTION_KEY: process.env.MFA_SECRET_ENCRYPTION_KEY,
    TOTP_SERVICE_NAME: process.env.TOTP_SERVICE_NAME,
    TOTP_ISSUER: process.env.TOTP_ISSUER,
    TOTP_DIGITS: process.env.TOTP_DIGITS,
    TOTP_STEP: process.env.TOTP_STEP,
    MFA_ACTION_TOKEN_TTL: process.env.MFA_ACTION_TOKEN_TTL,
    MFA_PENDING_TOKEN_TTL_SECONDS: process.env.MFA_PENDING_TOKEN_TTL_SECONDS,

    // ==================== Rate Limit Configuration ====================
    RATE_LIMIT_TRUST_PROXY: process.env.RATE_LIMIT_TRUST_PROXY,
    RATE_LIMIT_ALLOW_PRIVATE_IP: process.env.RATE_LIMIT_ALLOW_PRIVATE_IP,
    RATE_LIMIT_REQUIRE_IP: process.env.RATE_LIMIT_REQUIRE_IP,
  },
  emptyStringAsUndefined: true,
})
