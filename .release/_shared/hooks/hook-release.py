#!/usr/bin/env python3
"""next-template monorepo release workflow。

默认复用 release-cli 内置发布阶段。需要为某个 workspace 增加特殊检查时，
可以在对应阶段里通过 ctx.project_root 判断当前发布单元。
"""

from __future__ import annotations


def step(func):
    """标记一个函数为 workflow 阶段。

    这个文件是项目内自包含模板，不依赖 release_cli 包导入。
    release-cli 运行时只读取这个标记并传入 ctx。
    """
    setattr(func, "__release_cli_step__", True)
    return func


def before_all(ctx):
    """整个 release workflow 开始前。"""
    pass


def before_step(ctx):
    """每个已定义阶段执行前。"""
    pass


def after_step(ctx):
    """每个已定义阶段执行后。"""
    pass


@step
def preflight(ctx):
    """发布前检查。"""
    # 示例:
    # if ctx.project_root.name == "wechat":
    #     ctx.run(["bun", "run", "test"])
    ctx.builtin()


def before_prepare(ctx):
    """prepare 阶段执行前。"""
    pass


@step
def prepare(ctx):
    """生成版本文件和 changelog。"""
    ctx.builtin()


def after_prepare(ctx):
    """prepare 阶段执行后。"""
    pass


@step
def commit(ctx):
    """提交发布文件并创建命名空间 tag。"""
    ctx.builtin()


@step
def pr(ctx):
    """创建发布 PR。默认配置下会跳过。"""
    ctx.builtin()


def after_all(ctx):
    """整个 release workflow 结束后，成功和失败都会执行。"""
    pass


def on_success(ctx):
    """全部已定义阶段成功后执行。"""
    pass


def on_failure(ctx):
    """任意阶段失败后执行。"""
    pass
