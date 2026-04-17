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
    config_file: Path
    version_file: Path
    git_tag: str


def load_context(payload_path: Path) -> HookContext:
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    return HookContext(
        version=payload["version"],
        previous_version=payload["previous_version"],
        version_source=payload["version_source"],
        project_root=Path(payload["project_root"]),
        config_file=Path(payload["config_file"]),
        version_file=Path(payload["version_file"]),
        git_tag=payload["git_tag"],
    )


def write_json_version(file_path: Path, version: str, key: str = "version") -> None:
    data = json.loads(file_path.read_text(encoding="utf-8"))
    data[key] = version
    file_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_text(file_path: Path, content: str) -> None:
    file_path.write_text(content, encoding="utf-8")


def apply_version_update(context: HookContext) -> None:
    write_text(context.version_file, f"v{context.version}\n")

    package_json = context.project_root / "package.json"
    if package_json.exists():
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
