.PHONY: help install dev dev-backend dev-wechat \
  build build-backend build-wechat \
  compile-wechat watch-wechat open-wechat \
  lint test test-backend test-wechat \
  backend-shell wechat-shell

.DEFAULT_GOAL := help

BACKEND_DIR := apps/backend
WECHAT_MINIPROGRAM_DIR := apps/miniprograms/wechat

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
	@echo "  子项目原生命令:"
	@echo "    backend-shell        查看后端原 Makefile 帮助"
	@echo "    wechat-shell         查看微信小程序原 Makefile 帮助"

install:
	npm install

dev: dev-backend

dev-backend:
	npm run dev -w @repo/backend

dev-wechat:
	npm run dev -w @repo/miniprogram-wechat

build: build-backend

build-backend:
	npm run build -w @repo/backend

build-wechat:
	npm run build -w @repo/miniprogram-wechat

compile-wechat:
	npm run compile:mp-weixin -w @repo/miniprogram-wechat

watch-wechat:
	npm run watch:mp-weixin -w @repo/miniprogram-wechat

open-wechat:
	npm run open:mp-weixin -w @repo/miniprogram-wechat

lint:
	npm run lint -w @repo/backend

test: test-backend

test-backend:
	npm run test -w @repo/backend

test-wechat:
	npm run test -w @repo/miniprogram-wechat

backend-shell:
	$(MAKE) -C $(BACKEND_DIR) help

wechat-shell:
	$(MAKE) -C $(WECHAT_MINIPROGRAM_DIR) help
