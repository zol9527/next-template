.PHONY: help install dev compile watch build open-weixin

help:
	@echo "可用命令:"
	@echo "  make install      安装依赖"
	@echo "  make dev          监听编译并自动打开微信开发者工具"
	@echo "  make compile      一次性编译后退出，不自动打开微信开发者工具"
	@echo "  make watch        只监听编译，不自动打开微信开发者工具"
	@echo "  make build        构建并自动打开微信开发者工具"
	@echo "  make open-weixin  打开当前开发产物"

install:
	bun install

dev:
	bun run dev

compile:
	bun run compile:mp-weixin

watch:
	bun run watch:mp-weixin

build:
	bun run build

open-weixin:
	bun run open:mp-weixin
