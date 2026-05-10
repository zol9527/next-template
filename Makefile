.PHONY: help install dev dev-backend dev-wechat \
  build build-backend build-wechat \
  compile-wechat watch-wechat open-wechat \
  lint test test-backend test-wechat \
  release release-backend release-wechat release-monorepo release-commit release-pack \
  backend-shell wechat-shell

.DEFAULT_GOAL := help

BACKEND_DIR := apps/backend
WECHAT_MINIPROGRAM_DIR := apps/miniprograms/wechat
RELEASE ?= backend
TYPE ?= patch
VERSION ?=
RELEASE_FROM_STEP ?=
RELEASE_TO_STEP ?=
RELEASE_ONLY ?=
RELEASE_SKIP ?=
RELEASE_CONFIG := .release/$(RELEASE).yml
RELEASE_VALUE := $(if $(VERSION),$(VERSION),$(TYPE))
RELEASE_FLOW_ARGS := $(if $(RELEASE_FROM_STEP),--from-step $(RELEASE_FROM_STEP),) \
	$(if $(RELEASE_TO_STEP),--to-step $(RELEASE_TO_STEP),) \
	$(if $(RELEASE_ONLY),--only $(RELEASE_ONLY),) \
	$(if $(RELEASE_SKIP),--skip $(RELEASE_SKIP),)

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
	@echo "  发布管理 (release-cli):"
	@echo "    release-backend      发布后端单元，默认 patch"
	@echo "    release-wechat       发布微信小程序单元，默认 patch"
	@echo "    release-monorepo     发布 monorepo 模板单元，默认 patch"
	@echo "    release              通用发布入口，可传 RELEASE=wechat TYPE=minor"
	@echo "    release-prepare      只生成版本文件和 changelog"
	@echo "    release-commit       只执行发布提交和 tag 创建"
	@echo "    release-pack         按发布单元配置打包"
	@echo ""
	@echo "  子项目原生命令:"
	@echo "    backend-shell        查看后端原 Makefile 帮助"
	@echo "    wechat-shell         查看微信小程序原 Makefile 帮助"
	@echo ""
	@echo "  示例:"
	@echo "    make release-backend TYPE=minor"
	@echo "    make release-wechat VERSION=1.1.0"
	@echo "    make release-prepare RELEASE=backend"
	@echo "    make release-commit RELEASE=backend RELEASE_TO_STEP=commit"
	@echo "    make release-pack RELEASE=wechat"

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
	release-cli --config "$(RELEASE_CONFIG)" release "$(RELEASE_VALUE)" $(RELEASE_FLOW_ARGS)

release-backend:
	@$(MAKE) release RELEASE=backend TYPE=$(TYPE) VERSION=$(VERSION)

release-wechat:
	@$(MAKE) release RELEASE=wechat TYPE=$(TYPE) VERSION=$(VERSION)

release-monorepo:
	@$(MAKE) release RELEASE=monorepo TYPE=$(TYPE) VERSION=$(VERSION)

release-prepare:
	@$(MAKE) release RELEASE=$(RELEASE) TYPE=$(TYPE) VERSION=$(VERSION) RELEASE_TO_STEP=prepare

release-commit:
	@if [ ! -f "$(RELEASE_CONFIG)" ]; then echo "❌ 未找到发布配置: $(RELEASE_CONFIG)"; exit 1; fi
	release-cli --config "$(RELEASE_CONFIG)" release "$(RELEASE_VALUE)" --from-step commit $(RELEASE_FLOW_ARGS)

release-pack:
	@if [ ! -f "$(RELEASE_CONFIG)" ]; then echo "❌ 未找到发布配置: $(RELEASE_CONFIG)"; exit 1; fi
	release-cli --config "$(RELEASE_CONFIG)" pack

backend-shell:
	$(MAKE) -C $(BACKEND_DIR) help

wechat-shell:
	$(MAKE) -C $(WECHAT_MINIPROGRAM_DIR) help
