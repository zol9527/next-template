.PHONY: help dev install start stop restart clean \
  seed-minimal seed-development seed-full seed-help \
  setup-db reset-db reset-db-empty fix-prisma \
  release release-patch release-minor release-major release-version

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
