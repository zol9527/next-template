#!/usr/bin/env python3
"""release-cli 版本 Hook 脚本。"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class HookContext:
    version: str
    previous_version: str
    version_source: str
    project_root: Path
    config_file: Path | None
    version_file: Path | None
    git_tag: str


def load_context(payload_path: Path) -> HookContext:
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


def write_json_version(file_path: Path, version: str, key: str = "version") -> None:
    data = json.loads(file_path.read_text(encoding="utf-8"))
    data[key] = version
    file_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def apply_version_update(context: HookContext) -> None:
    package_json = context.project_root / "package.json"
    if not package_json.exists():
        raise SystemExit(f"package.json 不存在: {package_json}")

    write_json_version(package_json, context.version)
    print(f"✅ 已同步 package.json 版本号: {context.version}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: release-version-hook.py <payload.json>")

    payload_path = Path(sys.argv[1]).resolve()
    context = load_context(payload_path)
    apply_version_update(context)
    print(f"hook completed for {context.version}")


if __name__ == "__main__":
    main()
