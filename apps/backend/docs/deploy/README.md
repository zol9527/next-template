# 部署指南

## 架构概览

```
Internet
    │
    ▼
┌─────────┐     HTTPS (443)      ┌──────────┐
│  用户    │ ───────────────────▶ │  Caddy   │
└─────────┘                      └────┬─────┘
                                      │ 反向代理
                                      │ localhost:3000
                                      ▼
                                ┌───────────┐
                                │  Next.js  │
                                │  (PM2)    │
                                └─────┬─────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐      ┌──────────┐
              │ Supabase │      │   OSS    │      │   日志   │
              │  (PG)    │      │ (对象存储)│      │  (Pino)  │
              └──────────┘      └──────────┘      └──────────┘
```

---

## 一、服务器准备

### 1.1 系统要求

- **操作系统**: Ubuntu 22.04+ / Debian 12+
- **内存**: 最低 2GB，推荐 4GB+
- **存储**: 20GB+
- **Node.js**: v20+

### 1.2 安装 Node.js 20

```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v  # 应显示 v20.x.x
npm -v
```

### 1.3 安装 PM2

```bash
sudo npm install -g pm2

# 配置 PM2 开机自启
pm2 startup systemd
# 按照提示执行输出的命令
```

### 1.4 安装 Caddy（含 TLS 插件）

```bash
# 安装 Caddy (标准版)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 如需 DNS 验证 (通配符证书)，安装带插件的版本
# sudo apt install caddy-plus-plugins

# 验证
caddy version
```

---

## 二、GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|------------|-----|-----|
| `SERVER_HOST` | 服务器 IP 或域名 | `1.2.3.4` |
| `SERVER_USER` | SSH 用户名 | `root` |
| `SERVER_PORT` | SSH 端口 | `22` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role 密钥 | `eyJhbGci...` |
| `APP_URL` | 应用完整 URL | `https://your-domain.com` |

### 生成 SSH 密钥

```bash
# 在本地生成
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/github_deploy.pub root@your-server.com

# 复制私钥内容到 GitHub Secrets
cat ~/.ssh/github_deploy
```

---

## 三、服务器配置

### 3.1 创建目录和日志

```bash
# 创建应用目录
sudo mkdir -p /var/www/edu-mini-app
sudo chown $USER:$USER /var/www/edu-mini-app

# 创建日志目录
sudo mkdir -p /var/log/edu-app
sudo chown $USER:$USER /var/log/edu-app

# 创建备份目录
sudo mkdir -p /var/backups/edu-mini-app
```

### 3.2 配置环境变量

```bash
cd /var/www/edu-mini-app
nano .env.production
```

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_random_secret_at_least_32_chars

# 微信小程序
WECHAT_APP_ID=your_wechat_appid
WECHAT_APP_SECRET=your_wechat_secret

# OSS (阿里云/腾讯云)
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret_key
OSS_BUCKET=your-bucket-name

# 日志
LOG_LEVEL=info
```

### 3.3 配置 Caddy

```bash
# 编辑 Caddyfile
sudo nano /etc/caddy/Caddyfile
```

将 `deploy/Caddyfile` 的内容复制进去，**替换域名**。

```bash
# 验证配置
caddy validate --config /etc/caddy/Caddyfile

# 重启 Caddy
sudo systemctl reload caddy
```

---

## 四、首次启动服务（必须手动执行）

> **重要：首次部署前，必须手动启动 Caddy 和应用。之后 CI/CD 会自动重启。**

### 4.1 启动 Caddy

Caddy 安装后通常已配置为 systemd 服务，检查并启动：

```bash
# 检查 Caddy 状态
sudo systemctl status caddy

# 如果未运行，启动并设为开机自启
sudo systemctl start caddy
sudo systemctl enable caddy

# 验证 Caddy 正常运行（应显示版本号）
caddy version

# 查看日志
sudo journalctl -u caddy -f
```

### 4.2 首次启动应用（PM2）

**首次必须手动启动应用**，之后部署会自动 `pm2 restart`：

```bash
# 进入应用目录
cd /var/www/edu-mini-app

# 方式 A：使用 ecosystem.config.cjs（推荐）
pm2 start ecosystem.config.cjs
pm2 save    # 保存进程列表，确保重启后自动恢复
pm2 startup # 配置开机自启（按输出的命令执行）

# 方式 B：直接启动（如果 ecosystem.config.cjs 不存在）
pm2 start npm --name edu-app -- start
pm2 save
pm2 startup
```

### 4.3 验证服务状态

```bash
# 检查 PM2 进程
pm2 status

# 检查应用日志
pm2 logs edu-app --lines 50

# 健康检查
curl http://localhost:3000/api/health

# 通过域名访问（Caddy 反向代理）
curl https://your-domain.com/api/health
```

### 部署流程说明

```
首次部署流程（需要手动操作）：

┌─────────────────────────────────────────────────────────┐
│  1. 服务器准备                                            │
│     • 安装 Node.js, PM2, Caddy                           │
│     • 配置 /etc/caddy/Caddyfile                          │
│     • 创建 .env.production                               │
│     • 启动 Caddy: systemctl start caddy                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  2. 首次部署                                              │
│     • 方式 A: 本地运行 ./scripts/deploy.sh               │
│     • 方式 B: 推送代码，等 CI/CD 完成                     │
│     • 手动启动应用: pm2 start ecosystem.config.cjs       │
│     • pm2 save + pm2 startup                             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  3. 之后每次部署（全自动）                                │
│     • git push origin dev                                │
│     • CI/CD: 编译 → 上传 → pm2 restart                   │
│     • deploy.sh: 编译 → 上传 → pm2 restart               │
│     • 无需手动操作！                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 五、后续部署

### 方式 A: 自动部署 (CI/CD)

1. 推送代码到 `dev` 或 `main` 分支
2. GitHub Actions 自动触发
3. 自动执行：编译 → 上传 → `pm2 restart`
4. 在 Actions 页面查看部署日志

### 方式 B: 手动部署 (本地编译)

```bash
# 1. 修改 scripts/deploy.sh 中的服务器信息
nano scripts/deploy.sh

# 2. 执行部署
./scripts/deploy.sh production
```

---

## 六、验证部署

```bash
# 1. 检查 PM2 状态
ssh root@your-server "pm2 status"

# 2. 检查应用日志
ssh root@your-server "pm2 logs edu-app --lines 50"

# 3. 健康检查
curl https://your-domain.com/api/health

# 4. 访问管理后台
# 打开浏览器: https://your-domain.com
```

---

## 七、常用运维命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs edu-app

# 重启应用
pm2 restart edu-app

# 停止应用
pm2 stop edu-app

# 监控
pm2 monit
```

### Caddy 管理

```bash
# 重载配置
sudo systemctl reload caddy

# 查看日志
sudo journalctl -u caddy -f

# 手动续期证书
caddy renew --force
```

### 回滚部署

```bash
# 列出备份
ls -lh /var/backups/edu-mini-app/

# 恢复指定备份
sudo rm -rf /var/www/edu-mini-app/*
sudo tar -xzf /var/backups/edu-mini-app/backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/edu-mini-app
cd /var/www/edu-mini-app && pm2 restart edu-app
```

---

## 八、监控建议

### 7.1 使用 PM2 Plus (可选)

```bash
pm2 link <secret_key> <public_key>
```

### 7.2 日志聚合

将 Pino 日志发送到:
- 阿里云 SLS
- 腾讯云 CLS
- Loki + Grafana

### 7.3 告警配置

- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry - 项目已配置)
- Resource alerts (云服务商提供)

---

## 九、故障排查

| 问题 | 可能原因 | 解决方法 |
|-----|---------|---------|
| 502 Bad Gateway | Next.js 未启动 | `pm2 restart edu-app` |
| 证书错误 | Caddy 配置问题 | `caddy validate --config /etc/caddy/Caddyfile` |
| 构建失败 | Node 版本不匹配 | 检查 `package.json` engines |
| 数据库连接失败 | 环境变量未配置 | 检查 `.env.production` |
| 内存溢出 | 需增加内存或 swap | `fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile` |

---

## 文件清单

| 文件 | 用途 |
|-----|-----|
| `ecosystem.config.cjs` | PM2 进程配置 |
| `.github/workflows/deploy.yml` | CI/CD 自动部署 |
| `scripts/deploy.sh` | 手动部署脚本 |
| `deploy/Caddyfile` | Caddy 反向代理配置 |
| `src/app/api/health/route.ts` | 健康检查端点 |
| `deploy/README.md` | 本文档 |
