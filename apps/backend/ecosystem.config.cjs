/**
 * PM2 Ecosystem Configuration
 *
 * PM2 进程管理配置文件，支持 development / production 多环境部署。
 *
 * 环境切换原理:
 *   PM2 只负责设置 NODE_ENV，Next.js 启动时自动加载对应的 .env 文件：
 *     NODE_ENV=development → .env.development.local > .env.development > .env
 *     NODE_ENV=production  → .env.production.local  > .env.production  > .env
 *   数据库、密钥、端口等所有业务配置都在 .env 文件中管理。
 *
 * 日志策略:
 *   应用使用 Pino 结构化日志（logs/app.log），支持按日期/大小滚动和保留策略。
 *   PM2 日志文件已关闭（指向 /dev/null），避免两套系统同时写入同一目录。
 *   Pino 通过 .env 中的 LOG_TO_STDOUT 控制是否输出到 stdout（pm2 logs 可查看）。
 *
 * 用法（推荐通过 Makefile 调用）:
 *   make deploy ENV=production       # 启动生产环境
 *   make deploy ENV=development      # 启动开发环境（非本地 next dev）
 *   make pm2-stop                    # 停止服务
 *   make pm2-restart                 # 重启服务
 *   make pm2-logs                    # 查看实时日志
 *
 * 也可以直接使用 pm2 命令:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 restart nextjs-app
 *   pm2 logs nextjs-app
 *   pm2 save
 */

const path = require('path')

// 允许通过环境变量覆盖应用根目录（部署到远程服务器时常用）
const appDir = process.env.APP_CWD || __dirname

module.exports = {
  apps: [
    {
      // ========== 基础配置 ==========

      // 进程名称，pm2 list / pm2 logs 时显示
      name: 'nextjs-app',

      // Next.js 启动入口
      script: path.join(appDir, 'node_modules/next/dist/bin/next'),
      args: 'start',

      // 工作目录，确保 PM2 能正确解析相对路径
      cwd: appDir,

      // 单实例 + fork 模式（Next.js 自身处理并发，不需要 cluster）
      instances: 1,
      exec_mode: 'fork',

      // ========== 进程管理 ==========

      // 异常退出后自动重启
      autorestart: true,

      // 生产环境不监听文件变化
      watch: false,

      // 内存超限自动重启（防止内存泄漏）
      max_memory_restart: '1G',

      // 异常退出时延迟 4 秒再重启，避免快速循环
      restart_delay: 4000,

      // 最大连续重启次数（超过后停止尝试，需人工介入）
      max_restarts: 10,

      // ========== 日志配置 ==========
      // 所有业务日志由 Pino 管理（logs/app.log），PM2 只管进程。
      // 通过 .env 中的 LOG_TO_STDOUT 控制是否输出到 stdout（pm2 logs 可查看）。

      out_file: '/dev/null',
      error_file: '/dev/null',
      merge_logs: true,

      // ========== 环境配置 ==========
      // PM2 只设置 NODE_ENV，其余所有配置由 .env 文件管理。
      // PORT、HOSTNAME、LOG_TO_STDOUT、DATABASE_URL 等都写在对应的 .env 文件中。

      env_development: {
        NODE_ENV: 'development',
      },

      env_production: {
        NODE_ENV: 'production',
      },
    },
  ]
}
