/**
 * PM2 Ecosystem Configuration
 *
 * Description: PM2 进程管理配置文件，用于生产环境部署
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart edu-app
 *   pm2 logs edu-app
 *   pm2 save
 */

const appDir = process.env.APP_CWD || __dirname

module.exports = {
  apps: [
    {
      name: 'edu-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: appDir,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: `${appDir}/logs/error.log`,
      out_file: `${appDir}/logs/out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
