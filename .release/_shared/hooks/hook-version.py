#!/usr/bin/env python3
"""next-template version hook。

触发时机:
    `release-cli version <value> --write` 写入版本文件之后自动执行。

默认行为:
    同步 release-cli 自己的版本状态文件，并按 release unit 同步少量项目
    版本声明文件。

如何扩展:
    在 `sync_project_files()` 中补充当前 workspace 需要同步的版本逻辑。
    业务文件同步按 `release_unit(ctx)` 分支处理，避免不同 workspace 的
    独立版本线互相污染。
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class HookContext:
    """release-cli 传入的 version hook 上下文。"""

    version: str
    previous_version: str
    version_source: str
    project_root: Path
    config_file: Path | None
    version_file: Path | None
    git_tag: str


def load_context(payload_path: Path) -> HookContext:
    """从 release-cli 生成的 payload.json 读取上下文。"""
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    return HookContext(
        version=payload["version"],
        previous_version=payload.get("previous_version", ""),
        version_source=payload.get("version_source", ""),
        project_root=Path(payload["project_root"]),
        config_file=Path(payload["config_file"]) if payload.get("config_file") else None,
        version_file=Path(payload["version_file"]) if payload.get("version_file") else None,
        git_tag=payload.get("git_tag", ""),
    )


def write_text(file_path: Path, content: str) -> None:
    """写入纯文本文件，并确保父目录存在。"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")


def write_json_version(file_path: Path, version: str, key: str = "version") -> None:
    """把 JSON 文件中的版本字段更新为指定版本。"""
    data = json.loads(file_path.read_text(encoding="utf-8"))
    data[key] = version
    file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_wechat_version_module(file_path: Path, version: str) -> None:
    """写入小程序运行时可直接 import 的版本模块。"""
    write_text(
        file_path,
        "\n".join(
            [
                "/**",
                " * 小程序版本信息。",
                " *",
                " * 该文件由 `.release/_shared/hooks/hook-version.py` 在 `wechat` 发布单元",
                " * 执行 `version --write` 时同步更新。页面展示版本号时统一读取这里，",
                " * 避免 UI 中出现和 release 系统脱节的硬编码版本。",
                " */",
                f"export const APP_VERSION = '{version}'",
                "",
            ]
        ),
    )


def release_unit(ctx: HookContext) -> str:
    """返回当前发布单元名称。

    这里会从 `.release/backend.yml`、`.release/wechat.yml` 这样的配置文件名
    推导出 `backend`、`wechat`、`monorepo`。这样多个 workspace 可以共用
    一个 hook，并在 `sync_project_files()` 里按发布单元分支处理。
    """
    if ctx.config_file is None:
        return "release"
    return ctx.config_file.stem


def before_all(ctx: HookContext) -> None:
    """全部版本同步开始前。

    适合放置轻量校验，例如确认项目根目录、检查必需文件是否存在。
    """
    pass


def sync_version_file(ctx: HookContext) -> None:
    """同步 release-cli 自己的版本状态文件。

    通常不需要修改。`ctx.version_file` 来自 `.release/*.yml` 的
    `version.file` 字段。
    """
    if ctx.version_file is None:
        return
    write_text(ctx.version_file, f"v{ctx.version}\n")
    print(f"✅ 已同步 VERSION: {ctx.version_file}")


def sync_project_files(ctx: HookContext) -> None:
    """按需同步当前发布单元的项目文件。

    这是业务逻辑的主要扩展入口。`ctx.project_root` 来自 release-cli 的
    `packager.root_dir`，因此在 monorepo release unit 中已经是当前
    workspace 根目录，而不是仓库根目录。
    示例场景:
    - 同步当前 workspace 的 package.json
    - 前端 version.ts
    - 后端 release-info.json
    - 构建元数据文件
    - 其他 workspace 内部的版本声明文件

    多个 workspace 共用这个 hook 时，可以用 `release_unit(ctx)` 判断当前
    发布单元，然后分别处理:

        unit = release_unit(ctx)
        if unit == "backend":
            ...
        elif unit == "wechat":
            ...
    """
    unit = release_unit(ctx)
    package_json = ctx.project_root / "package.json"
    if package_json.exists():
        write_json_version(package_json, ctx.version)
        print(f"✅ 已同步 package.json: {package_json}")

    if unit == "wechat":
        version_module = ctx.project_root / "src" / "config" / "version.ts"
        write_wechat_version_module(version_module, ctx.version)
        print(f"✅ 已同步小程序版本模块: {version_module}")


def after_all(ctx: HookContext) -> None:
    """全部版本同步完成后，成功和失败都会执行。"""
    pass


def on_success(ctx: HookContext) -> None:
    """版本同步成功后执行。"""
    pass


def on_failure(ctx: HookContext) -> None:
    """版本同步失败后执行。"""
    pass


def run(ctx: HookContext) -> None:
    """按固定顺序执行 version hook。"""
    before_all(ctx)
    try:
        sync_version_file(ctx)
        sync_project_files(ctx)
    except Exception:
        after_all(ctx)
        on_failure(ctx)
        raise
    else:
        after_all(ctx)
        on_success(ctx)


def main() -> None:
    """读取 payload 并执行 version hook。"""
    if len(sys.argv) != 2:
        raise SystemExit("usage: hook-version.py <payload.json>")

    payload_path = Path(sys.argv[1]).resolve()
    context = load_context(payload_path)
    run(context)
    print(f"hook-version completed for {context.git_tag or context.version}")


if __name__ == "__main__":
    main()
