.PHONY: help install dev dev-backend dev-wechat \
  build build-backend build-wechat \
  compile-wechat watch-wechat open-wechat \
  lint test test-backend test-wechat \
  pack pack-backend pack-wechat pack-monorepo \
  release release-backend release-wechat release-monorepo \
  deploy pm2-start pm2-stop pm2-restart pm2-reload pm2-status pm2-logs pm2-delete \
  caddy-start caddy-stop caddy-reload caddy-restart caddy-status caddy-validate \
  backend-shell wechat-shell

.DEFAULT_GOAL := help

BACKEND_DIR := apps/backend
WECHAT_MINIPROGRAM_DIR := apps/miniprograms/wechat
RELEASE ?= backend
TYPE ?= patch
VERSION ?=
RELEASE_CONFIG := .release/$(RELEASE).yml
RELEASE_VALUE := $(if $(VERSION),$(VERSION),$(TYPE))

# PM2 部署配置
ENV ?= production
PM2_APP_NAME := nextjs-app
BACKEND_ECOSYSTEM := $(BACKEND_DIR)/ecosystem.config.cjs

# Caddy 配置
# 根据环境选择 Caddyfile: production → Caddyfile, development → Caddyfile.development
CADDY_DIR := $(BACKEND_DIR)/deploy
CADDYFILE := $(CADDY_DIR)/Caddyfile$(if $(filter development,$(ENV)),.development,)
# Caddy 配置文件在远程服务器上的路径
CADDY_REMOTE_PATH ?= /etc/caddy/Caddyfile

help:
	@echo "📦 Monorepo 命令"
	@echo ""
	@echo "  依赖:"
	@echo "    install              使用 Bun 安装所有 workspace 依赖"
	@echo ""
	@echo "  后端 Next.js:"
	@echo "    dev                  启动后端开发服务"
	@echo "    dev-backend          启动后端开发服务"
	@echo "    build-backend        构建后端"
	@echo "    lint                 执行后端 lint"
	@echo "    test                 执行后端测试"
	@echo ""
	@echo "  微信小程序:"
	@echo "    dev-wechat           监听编译并自动打开微信开发者工具"
	@echo "    compile-wechat       一次性编译 mp-weixin 后退出"
	@echo "    watch-wechat         只监听编译，不自动打开工具"
	@echo "    build-wechat         构建微信小程序并打开构建产物"
	@echo "    open-wechat          打开当前微信小程序开发产物"
	@echo ""
	@echo "  未来小程序:"
	@echo "    apps/miniprograms/douyin   抖音小程序预留位置"
	@echo "    apps/miniprograms/alipay   支付宝小程序预留位置"
	@echo ""
	@echo "  打包:"
	@echo "    pack                 打包后端（默认）"
	@echo "    pack-backend         打包后端到 apps/backend/dist/"
	@echo "    pack-wechat          打包微信小程序到 apps/miniprograms/wechat/dist/"
	@echo "    pack-monorepo        打包 monorepo 模板到 dist/"
	@echo ""
	@echo "  发布管理 (release-cli):"
	@echo "    release-backend      发布后端单元，默认 patch"
	@echo "    release-wechat       发布微信小程序单元，默认 patch"
	@echo "    release-monorepo     发布 monorepo 模板单元，默认 patch"
	@echo "    release              通用发布入口，可传 RELEASE=wechat TYPE=minor"
	@echo ""
	@echo "  子项目原生命令:"
	@echo "    backend-shell        查看后端原 Makefile 帮助"
	@echo "    wechat-shell         查看微信小程序原 Makefile 帮助"
	@echo ""
	@echo "  示例:"
	@echo "    make release-backend TYPE=minor"
	@echo "    make release-wechat VERSION=1.1.0"
	@echo "    make pack-wechat"
	@echo "    make pack-monorepo"
	@echo ""
	@echo "  PM2 部署:"
	@echo "    deploy              构建 + 启动 PM2（默认 ENV=production）"
	@echo "    pm2-start           启动 PM2 进程（不构建）"
	@echo "    pm2-stop            停止 PM2 进程"
	@echo "    pm2-restart         重启 PM2 进程（硬重启，有短暂不可用）"
	@echo "    pm2-reload          平滑重载 PM2 进程（零停机）"
	@echo "    pm2-status          查看 PM2 进程状态"
	@echo "    pm2-logs            查看实时日志（Ctrl+C 退出）"
	@echo "    pm2-delete          删除 PM2 进程（彻底移除）"
	@echo ""
	@echo "  部署示例:"
	@echo "    make deploy ENV=production"
	@echo "    make deploy ENV=development"
	@echo "    make pm2-restart ENV=development"
	@echo ""
	@echo "  Caddy 反向代理:"
	@echo "    caddy-start          启动 Caddy（上传配置 + 启动服务）"
	@echo "    caddy-stop           停止 Caddy"
	@echo "    caddy-reload         上传配置 + 重载 Caddy（零停机）"
	@echo "    caddy-restart        重启 Caddy"
	@echo "    caddy-status         查看 Caddy 运行状态"
	@echo "    caddy-validate       本地验证 Caddyfile 语法"
	@echo ""
	@echo "  Caddy 示例:"
	@echo "    make caddy-start ENV=development    # 测试环境"
	@echo "    make caddy-reload ENV=production    # 正式环境"

install:
	bun install

dev: dev-backend

dev-backend:
	bun run --filter @repo/backend dev

dev-wechat:
	bun run --filter @repo/miniprogram-wechat dev

build: build-backend

build-backend:
	bun run --filter @repo/backend build

build-wechat:
	bun run --filter @repo/miniprogram-wechat build

compile-wechat:
	bun run --filter @repo/miniprogram-wechat compile:mp-weixin

watch-wechat:
	bun run --filter @repo/miniprogram-wechat watch:mp-weixin

open-wechat:
	bun run --filter @repo/miniprogram-wechat open:mp-weixin

lint:
	bun run --filter @repo/backend lint

test: test-backend

test-backend:
	bun run --filter @repo/backend test

test-wechat:
	bun run --filter @repo/miniprogram-wechat test

release:
	@if [ ! -f "$(RELEASE_CONFIG)" ]; then echo "❌ 未找到发布配置: $(RELEASE_CONFIG)"; exit 1; fi
	release-cli --config "$(RELEASE_CONFIG)" release "$(RELEASE_VALUE)"

release-backend:
	@$(MAKE) release RELEASE=backend TYPE=$(TYPE) VERSION=$(VERSION)

release-wechat:
	@$(MAKE) release RELEASE=wechat TYPE=$(TYPE) VERSION=$(VERSION)

release-monorepo:
	@$(MAKE) release RELEASE=monorepo TYPE=$(TYPE) VERSION=$(VERSION)

# ==================== 打包命令 ====================

pack: pack-backend

pack-backend:
	@release-cli --config .release/backend.yml pack

pack-wechat:
	@release-cli --config .release/wechat.yml pack

pack-monorepo:
	@release-cli --config .release/monorepo.yml pack

backend-shell:
	$(MAKE) -C $(BACKEND_DIR) help

wechat-shell:
	$(MAKE) -C $(WECHAT_MINIPROGRAM_DIR) help

# ==================== PM2 部署命令 ====================

# 完整部署流程：构建 → 启动 PM2
deploy: build-backend pm2-start
	@echo "✅ 部署完成 ($(ENV) 环境)"
	@pm2 status $(PM2_APP_NAME)

# 启动 PM2 进程（如果已存在则先删除再启动）
pm2-start:
	@echo "🚀 启动 PM2 ($(ENV) 环境)..."
	@pm2 delete $(PM2_APP_NAME) 2>/dev/null || true
	@pm2 start $(BACKEND_ECOSYSTEM) --env $(ENV)

# 停止 PM2 进程（保留进程信息，可再次 start）
pm2-stop:
	@echo "⏹  停止 PM2 进程..."
	@pm2 stop $(PM2_APP_NAME)

# 硬重启（kill + 重新启动，有短暂不可用）
pm2-restart:
	@echo "🔄 重启 PM2 ($(ENV) 环境)..."
	@pm2 delete $(PM2_APP_NAME) 2>/dev/null || true
	@pm2 start $(BACKEND_ECOSYSTEM) --env $(ENV)

# 平滑重载（推荐，零停机；基于已加载的配置重启进程）
pm2-reload:
	@echo "♻️  平滑重载 PM2 ($(ENV) 环境)..."
	@pm2 gracefulReload $(PM2_APP_NAME)

# 查看 PM2 进程状态
pm2-status:
	@pm2 status $(PM2_APP_NAME)

# 查看实时日志
pm2-logs:
	@pm2 logs $(PM2_APP_NAME) --lines 50

# 彻底删除 PM2 进程
pm2-delete:
	@echo "🗑  删除 PM2 进程..."
	@pm2 delete $(PM2_APP_NAME)

# ==================== Caddy 反向代理命令 ====================
# 通过 ENV=staging / ENV=production 选择不同的 Caddyfile
# Caddyfile 文件位置:
#   production  → apps/backend/deploy/Caddyfile
#   development → apps/backend/deploy/Caddyfile.development

# 本地验证 Caddyfile 语法（不需要服务器）
caddy-validate:
	@echo "🔍 验证 Caddyfile ($(ENV) 环境)..."
	@caddy validate --config $(CADDYFILE) --adapter caddyfile

# 启动 Caddy（前台运行，适用于调试；生产环境推荐用 systemd）
caddy-start:
	@echo "🚀 启动 Caddy ($(ENV) 环境)..."
	@sudo caddy start --config $(CADDYFILE) --adapter caddyfile

# 停止 Caddy
caddy-stop:
	@echo "⏹  停止 Caddy..."
	@sudo caddy stop

# 重载 Caddy 配置（零停机，推荐日常更新使用）
caddy-reload:
	@echo "♻️  重载 Caddy ($(ENV) 环境)..."
	@sudo caddy reload --config $(CADDYFILE) --adapter caddyfile

# 重启 Caddy（先停再启，有短暂不可用）
caddy-restart:
	@echo "🔄 重启 Caddy ($(ENV) 环境)..."
	@sudo caddy stop || true
	@sudo caddy start --config $(CADDYFILE) --adapter caddyfile

# 查看 Caddy 运行状态
caddy-status:
	@caddy version 2>/dev/null || echo "❌ Caddy 未安装"
	@echo ""
	@sudo systemctl is-active caddy 2>/dev/null || echo "systemd 服务状态未知（可能未使用 systemd 管理）"
