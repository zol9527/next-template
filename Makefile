.PHONY: help install dev dev-backend dev-miniprogram \
  build build-backend build-miniprogram \
  compile-miniprogram watch-miniprogram open-miniprogram \
  lint test test-backend test-miniprogram \
  backend-shell miniprogram-shell

.DEFAULT_GOAL := help

BACKEND_DIR := apps/backend
MINIPROGRAM_DIR := apps/miniprogram

help:
	@echo "📦 Monorepo 命令"
	@echo ""
	@echo "  依赖:"
	@echo "    install              安装所有 workspace 依赖"
	@echo ""
	@echo "  后端 Next.js:"
	@echo "    dev                  启动后端开发服务"
	@echo "    dev-backend          启动后端开发服务"
	@echo "    build-backend        构建后端"
	@echo "    lint                 执行后端 lint"
	@echo "    test                 执行后端测试"
	@echo ""
	@echo "  微信小程序:"
	@echo "    dev-miniprogram      监听编译并自动打开微信开发者工具"
	@echo "    compile-miniprogram  一次性编译 mp-weixin 后退出"
	@echo "    watch-miniprogram    只监听编译，不自动打开工具"
	@echo "    build-miniprogram    构建小程序并打开构建产物"
	@echo "    open-miniprogram     打开当前小程序开发产物"
	@echo ""
	@echo "  子项目原生命令:"
	@echo "    backend-shell        查看后端原 Makefile 帮助"
	@echo "    miniprogram-shell    查看小程序原 Makefile 帮助"

install:
	npm install

dev: dev-backend

dev-backend:
	npm run dev -w @shuoboda/backend

dev-miniprogram:
	npm run dev -w @shuoboda/miniprogram

build: build-backend

build-backend:
	npm run build -w @shuoboda/backend

build-miniprogram:
	npm run build -w @shuoboda/miniprogram

compile-miniprogram:
	npm run compile:mp-weixin -w @shuoboda/miniprogram

watch-miniprogram:
	npm run watch:mp-weixin -w @shuoboda/miniprogram

open-miniprogram:
	npm run open:mp-weixin -w @shuoboda/miniprogram

lint:
	npm run lint -w @shuoboda/backend

test: test-backend

test-backend:
	npm run test -w @shuoboda/backend

test-miniprogram:
	npm run test -w @shuoboda/miniprogram

backend-shell:
	$(MAKE) -C $(BACKEND_DIR) help

miniprogram-shell:
	$(MAKE) -C $(MINIPROGRAM_DIR) help
