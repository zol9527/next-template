.PHONY: help dev check dev-deploy clean status logs shell pack pack-if-needed \
  seed-minimal seed-development seed-full seed-remote seed-help \
  setup-db reset-db reset-db-empty fix-prisma \
  release release-sync release-patch release-minor release-major release-version release-commit

.DEFAULT_GOAL := help
.EXPORT_ALL_VARIABLES:

SEED_SCRIPT := node scripts/seed/index.mjs
RELEASE_SYNC_SCRIPT := node scripts/release/sync-version-releases.mjs
FLOW_RUNNER := python3 ./scripts/flow/run.py

# ============================================
# 帮助
# ============================================

help:
	@echo "🚀 部署命令"
	@echo ""
	@echo "  开发环境:"
	@echo "    dev      自动预处理后启动本地开发"
	@echo "    check    检查服务器依赖"
	@echo "    dev-deploy      上传并部署（使用已存在的 deploy.zip）"
	@echo "    pack     生产构建后使用 release-cli 打包"
	@echo "    clean    清理本地构建产物"
	@echo "    status   查看 PM2 状态"
	@echo "    logs     查看 PM2 日志"
	@echo "    shell    SSH 登录服务器"
	@echo ""
	@echo "  版本发布 (release-cli):"
	@echo "    release          统一发布入口 (默认 patch，可传 TYPE=minor)"
	@echo "    release-sync     同步 docs/changes 到数据库"
	@echo "    release-patch    兼容别名，等价于 make release TYPE=patch"
	@echo "    release-minor    兼容别名，等价于 make release TYPE=minor"
	@echo "    release-major    兼容别名，等价于 make release TYPE=major"
	@echo "    release-version  兼容别名，自定义版本号 (make release-version V=1.2.3)"
	@echo ""
	@echo "  Seed 数据:"
	@echo "    seed-minimal       执行核心 seed (admin + permission)"
	@echo "    seed-development   执行开发环境 seed"
	@echo "    seed-full          执行完整 seed"
	@echo "    seed-remote        在远程服务器执行 seed"
	@echo ""
	@echo "  数据库管理:"
	@echo "    setup-db           数据库初始化/刷新"
	@echo "    reset-db           重置数据库 (⚠️ 危险操作)"
	@echo "    reset-db-empty       重置数据库但不执行 seed (⚠️ 危险操作)"
	@echo ""
	@echo "  自定义参数:"
	@echo "    DEPLOY_HOST=192.168.1.100 make dev-deploy"
	@echo "    SEED_MODE=development make seed-remote"
	@echo "    REPACK=1 DB_RESET=1 make dev-deploy"
	@echo "    make dev-deploy FLOW_FROM=pack-if-needed FLOW_TO=deploy"
	@echo "    make dev-deploy FLOW_ONLY=deploy"
	@echo "    make dev-deploy FLOW_SKIP=check"
	@echo "    make dev-deploy FLOW_DRY_RUN=1"
	@echo "    make release TYPE=minor"
	@echo "    make release VERSION=1.2.3 RELEASE_TITLE='发布新版本'"
	@echo "    make release RELEASE_CREATE_PR=1 RELEASE_PUSH=1"

# ============================================
# 本地开发
# ============================================

dev:
	@$(FLOW_RUNNER) dev

# ============================================
# 服务器环境检查
# ============================================

check:
	@$(FLOW_RUNNER) check

# ============================================
# 部署
# ============================================

pack:
	@$(FLOW_RUNNER) pack

pack-if-needed:
	@$(FLOW_RUNNER) pack-if-needed

dev-deploy:
	@$(FLOW_RUNNER) dev-deploy

# ============================================
# 清理和停止
# ============================================

clean:
	@echo "🧹 清理本地构建产物..."
	@echo "  - 删除 .next/..."
	@rm -rf .next/
	@echo "  - 删除部署打包产物..."
	@rm -rf deploy-prepare
	@rm -f deploy-prepare/deploy.zip
	@rm -f /tmp/deploy*/
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

seed-remote:
	@$(FLOW_RUNNER) seed-remote

seed-help:
	@$(SEED_SCRIPT) --help

# ============================================
# 工具
# ============================================

status:
	@$(FLOW_RUNNER) status

logs:
	@$(FLOW_RUNNER) logs

shell:
	@$(FLOW_RUNNER) shell

# ============================================
# 版本发布 (使用 release-cli)
# ============================================

TYPE ?= patch
V ?=

release:
	@RELEASE_TYPE=$(TYPE) $(FLOW_RUNNER) release

release-sync:
	@$(RELEASE_SYNC_SCRIPT)

release-patch:
	@$(MAKE) release TYPE=patch

release-version:
	@if [ -z "$(V)" ]; then echo "❌ 请传入 V=1.2.3"; exit 1; fi
	@RELEASE_VERSION=$(V) $(FLOW_RUNNER) release

release-minor:
	@$(MAKE) release TYPE=minor

release-major:
	@$(MAKE) release TYPE=major

release-commit:
	@echo "⚠️ release-commit 已废弃，请直接使用 make release"
	@exit 1

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
