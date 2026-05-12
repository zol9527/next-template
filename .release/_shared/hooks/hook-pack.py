#!/usr/bin/env python3
"""next-template pack hook。

`packager.build.enabled: true` 时，release-cli pack 会先执行 build(ctx)，
再执行 pack(ctx) 中的内置压缩逻辑。这里按 release unit 分发构建命令，
避免把 backend、wechat 和 monorepo 的打包行为混在 YAML 中。
"""

from __future__ import annotations


def release_unit(ctx) -> str:
    """根据当前配置文件名推导发布单元名称。"""
    return ctx.config.config_path.stem


def before_all(ctx) -> None:
    """pack hook 开始前。"""
    pass


def before_step(ctx) -> None:
    """每个 pack 步骤执行前。"""
    pass


def build(ctx) -> None:
    """按 workspace 执行构建命令。"""
    unit = release_unit(ctx)
    if unit == "backend":
        ctx.run(["bun", "run", "build"])
        return

    if unit == "wechat":
        ctx.run(["bun", "run", "compile:mp-weixin"])
        return

    raise RuntimeError(f"未配置 {unit} 的 pack build 命令")


def pack(ctx) -> None:
    """执行 release-cli 内置压缩逻辑。"""
    ctx.builtin()


def after_step(ctx) -> None:
    """每个 pack 步骤执行后。"""
    pass


def after_all(ctx) -> None:
    """pack hook 结束后，成功和失败都会执行。"""
    pass


def on_success(ctx) -> None:
    """pack 成功后。"""
    pass


def on_failure(ctx) -> None:
    """pack 失败后。"""
    pass
