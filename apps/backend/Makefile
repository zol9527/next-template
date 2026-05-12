.PHONY: help dev install start stop restart clean \
  seed-minimal seed-development seed-full seed-help \
  setup-db reset-db reset-db-empty fix-prisma \
  release release-patch release-minor release-major release-version \
  deploy pm2-start pm2-stop pm2-restart pm2-reload pm2-status pm2-logs pm2-delete \
  caddy-start caddy-stop caddy-reload caddy-restart caddy-status caddy-validate

.DEFAULT_GOAL := help
.EXPORT_ALL_VARIABLES:

SEED_SCRIPT := node scripts/seed/index.mjs
MONOREPO_ROOT := ../..

# ============================================
# 帮助
# ============================================

help:
	@echo "🚀 开发命令"
	@echo ""
	@echo "  dev      启动本地开发服务"
	@echo "  install  安装生产依赖"
	@echo "  start    启动生产服务 (PM2)"
	@echo "  stop     停止生产服务 (PM2)"
	@echo "  restart  重启生产服务 (PM2)"
	@echo "  clean    清理本地构建产物"
	@echo ""
	@echo "  版本发布 (release-cli):"
	@echo "    release          统一发布入口 (默认 patch，可传 TYPE=minor)"
	@echo "    release-patch    兼容别名，等价于 make release TYPE=patch"
	@echo "    release-minor    兼容别名，等价于 make release TYPE=minor"
	@echo "    release-major    兼容别名，等价于 make release TYPE=major"
	@echo "    release-version  兼容别名，自定义版本号 (make release-version V=1.2.3)"
	@echo ""
	@echo "  Seed 数据:"
	@echo "    seed-minimal       执行核心 seed (admin + permission)"
	@echo "    seed-development   执行开发环境 seed"
	@echo "    seed-full          执行完整 seed"
	@echo "    seed-help          查看 seed 帮助"
	@echo ""
	@echo "  数据库管理:"
	@echo "    setup-db           数据库初始化/刷新"
	@echo "    reset-db           重置数据库 (⚠️ 危险操作)"
	@echo "    reset-db-empty     重置数据库但不执行 seed (⚠️ 危险操作)"
	@echo ""
	@echo "  自定义参数:"
	@echo "    make release TYPE=minor"
	@echo "    make release VERSION=1.2.3 RELEASE_TITLE='发布新版本'"
	@echo "    make release RELEASE_CREATE_PR=1 RELEASE_PUSH=1"
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
	@echo "  Caddy 反向代理:"
	@echo "    caddy-start          启动 Caddy（上传配置 + 启动服务）"
	@echo "    caddy-stop           停止 Caddy"
	@echo "    caddy-reload         上传配置 + 重载 Caddy（零停机）"
	@echo "    caddy-restart        重启 Caddy"
	@echo "    caddy-status         查看 Caddy 运行状态"
	@echo "    caddy-validate       本地验证 Caddyfile 语法"
	@echo ""
	@echo "  部署示例:"
	@echo "    make deploy ENV=production"
	@echo "    make deploy ENV=development"
	@echo "    make pm2-restart ENV=development"
	@echo "    make caddy-reload ENV=production"

# ============================================
# 本地开发
# ============================================

dev:
	@bun run dev

# ============================================
# 依赖安装（部署场景）
# ============================================

install:
	@echo "📦 安装生产依赖..."
	@bun install --production
	@echo "✅ 依赖安装完成"

# ============================================
# 进程管理（部署场景，基于 PM2）
# ============================================

# ENV 环境变量，默认 production
ENV ?= production

start:
	@pm2 delete nextjs-app 2>/dev/null || true
	@pm2 start ecosystem.config.cjs --env $(ENV)

stop:
	@pm2 stop nextjs-app

restart:
	@pm2 delete nextjs-app 2>/dev/null || true
	@pm2 start ecosystem.config.cjs --env $(ENV)

# ============================================
# 清理
# ============================================

clean:
	@echo "🧹 清理本地构建产物..."
	@echo "  - 删除 .next/..."
	@rm -rf .next/
	@echo "  - 删除部署打包产物..."
	@rm -rf dist
	@echo "  - 清理 node_modules/.cache..."
	@rm -rf node_modules/.cache 2>/dev/null || true
	@echo "  - 清理 Prisma 生成的 client..."
	@rm -rf src/lib/prisma/generated 2>/dev/null || true
	@echo "✅ 本地清理完成!"

# ============================================
# Seed 数据
# ============================================

seed-minimal:
	@echo "🌱 执行 minimal seed（核心数据）..."
	@$(SEED_SCRIPT) --mode=minimal

seed-development:
	@echo "🌱 执行 development seed..."
	@$(SEED_SCRIPT) --mode=development

seed-full:
	@echo "🌱 执行 full seed..."
	@$(SEED_SCRIPT) --mode=full

seed-help:
	@$(SEED_SCRIPT) --help

# ============================================
# 版本发布 (使用 release-cli)
# ============================================

TYPE ?= patch
V ?=

release:
	@$(MAKE) -C $(MONOREPO_ROOT) release-backend TYPE=$(TYPE) VERSION=$(VERSION)

release-patch:
	@$(MAKE) release TYPE=patch

release-version:
	@if [ -z "$(V)" ]; then echo "❌ 请传入 V=1.2.3"; exit 1; fi
	@$(MAKE) -C $(MONOREPO_ROOT) release-backend VERSION=$(V)

release-minor:
	@$(MAKE) release TYPE=minor

release-major:
	@$(MAKE) release TYPE=major

# ============================================
# 数据库初始化/重置
# ============================================

setup-db:
	@echo "🔧 数据库初始化/刷新..."
	@./scripts/db/prisma/setup.sh --force

reset-db-empty:
	@echo "🗑️  重置数据库但不执行 seed..."
	@./scripts/db/prisma/setup.sh --reset --force

reset-db:
	@echo "🗑️  重置数据库..."
	@./scripts/db/prisma/setup.sh --reset --seed --force

fix-prisma:
	@echo "🔧 修复 Prisma 安装（解决 worktree 路径问题）..."
	@rm -rf node_modules/@prisma
	@rm -rf src/lib/prisma/generated
	@echo "🔨 重新安装 Prisma..."
	@bun install prisma @prisma/client --force
	@echo "✅ Prisma 修复完成！"

# ============================================
# PM2 部署命令
# ============================================

PM2_APP_NAME := nextjs-app

# 完整部署流程：构建 → 启动 PM2
deploy: build pm2-start
	@echo "✅ 部署完成 ($(ENV) 环境)"
	@pm2 status $(PM2_APP_NAME)

# 启动 PM2 进程（如果已存在则先删除再启动）
pm2-start:
	@echo "🚀 启动 PM2 ($(ENV) 环境)..."
	@pm2 delete $(PM2_APP_NAME) 2>/dev/null || true
	@pm2 start ecosystem.config.cjs --env $(ENV)

# 停止 PM2 进程（保留进程信息，可再次 start）
pm2-stop:
	@echo "⏹  停止 PM2 进程..."
	@pm2 stop $(PM2_APP_NAME)

# 硬重启（kill + 重新启动，有短暂不可用）
pm2-restart:
	@echo "🔄 重启 PM2 ($(ENV) 环境)..."
	@pm2 delete $(PM2_APP_NAME) 2>/dev/null || true
	@pm2 start ecosystem.config.cjs --env $(ENV)

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

# ============================================
# Caddy 反向代理命令
# ============================================
# 通过 ENV=production / ENV=development 选择不同的 Caddyfile
# Caddyfile 文件位置:
#   production  → deploy/Caddyfile
#   development → deploy/Caddyfile.development

CADDY_DIR := deploy
CADDYFILE := $(CADDY_DIR)/Caddyfile$(if $(filter development,$(ENV)),.development,)

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
