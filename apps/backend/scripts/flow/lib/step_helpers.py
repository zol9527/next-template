#!/usr/bin/env python3

from __future__ import annotations

import os
import json
import re
import shlex
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path


FLOW_ROOT_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT_DIR = FLOW_ROOT_DIR.parent.parent
SEMVER_TAG_PATTERN = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
SEMVER_VERSION_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


class StepError(RuntimeError):
    pass


@dataclass
class DeployConfig:
    user: str
    host: str
    port: str
    remote_dir: str
    node_version: str
    app_name: str
    seed_mode: str
    zip_path: Path
    remote_tmp_zip: str
    env_deps: list[str]
    db_force_keep: str
    db_reset: str

    @property
    def ssh_target(self) -> str:
        return f"{self.user}@{self.host}"


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _project_path(relative_path: str) -> Path:
    return (PROJECT_ROOT_DIR / relative_path).resolve()


def _run(command: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None, input_text: str | None = None) -> None:
    subprocess.run(
        command,
        check=True,
        cwd=cwd or PROJECT_ROOT_DIR,
        env=env or os.environ.copy(),
        text=True,
        input=input_text,
    )


def _run_output(command: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> str:
    result = subprocess.run(
        command,
        check=True,
        cwd=cwd or PROJECT_ROOT_DIR,
        env=env or os.environ.copy(),
        text=True,
        capture_output=True,
    )
    return result.stdout.strip()


def _command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def _normalize_yes_no(value: str) -> str:
    if value.lower() in {"1", "y", "yes", "true"}:
        return "y"
    return "n"


def _package_json_path() -> Path:
    return PROJECT_ROOT_DIR / "package.json"


def _read_package_version() -> str:
    package_path = _package_json_path()
    if not package_path.is_file():
        raise StepError(f"未找到 package.json: {package_path}")

    with package_path.open("r", encoding="utf-8") as file:
        package_data = json.load(file)

    version = str(package_data.get("version", "")).strip()
    if not SEMVER_VERSION_PATTERN.fullmatch(version):
        raise StepError(f"package.json 中的 version 非法: {version or '<empty>'}")
    return version


def _git_output(args: list[str]) -> str:
    return _run_output(["git", *args], cwd=PROJECT_ROOT_DIR)


def _git_tracked_path(path: str) -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", path],
        check=False,
        cwd=PROJECT_ROOT_DIR,
        text=True,
        capture_output=True,
    )
    return result.returncode == 0


def _git_branch_name() -> str:
    result = subprocess.run(
        ["git", "symbolic-ref", "--short", "-q", "HEAD"],
        check=False,
        cwd=PROJECT_ROOT_DIR,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def _git_status_short() -> list[str]:
    output = _git_output(["status", "--short"])
    if not output:
        return []
    return [line for line in output.splitlines() if line.strip()]


def _collect_semver_tags() -> list[tuple[int, int, int, str]]:
    tag_output = _git_output(["tag", "--list", "v*"])
    if not tag_output:
        return []

    versions: list[tuple[int, int, int, str]] = []
    for tag in tag_output.splitlines():
        match = SEMVER_TAG_PATTERN.fullmatch(tag.strip())
        if not match:
            continue
        major, minor, patch = (int(value) for value in match.groups())
        versions.append((major, minor, patch, tag.strip()))

    versions.sort(reverse=True)
    return versions


def _latest_semver_tag() -> str:
    tags = _collect_semver_tags()
    return tags[0][3] if tags else ""


def _parse_semver(version: str) -> tuple[int, int, int]:
    match = SEMVER_VERSION_PATTERN.fullmatch(version)
    if not match:
        raise StepError(f"版本号格式非法: {version}")
    return tuple(int(value) for value in match.groups())


def _bump_version(version: str, release_type: str) -> str:
    major, minor, patch = _parse_semver(version)
    if release_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    if release_type == "minor":
        return f"{major}.{minor + 1}.0"
    if release_type == "major":
        return f"{major + 1}.0.0"
    raise StepError(f"不支持的 RELEASE_TYPE: {release_type}")


def _resolve_release_target_version() -> str:
    explicit_version = _env("RELEASE_VERSION")
    if explicit_version:
        _parse_semver(explicit_version)
        return explicit_version

    release_type = _env("RELEASE_TYPE", "patch").lower()
    if release_type not in {"patch", "minor", "major"}:
        raise StepError("RELEASE_TYPE 仅支持 patch/minor/major")

    latest_tag = _latest_semver_tag()
    base_version = latest_tag[1:] if latest_tag else _read_package_version()
    return _bump_version(base_version, release_type)


def _resolve_release_from_ref() -> str:
    explicit_from_ref = _env("RELEASE_FROM")
    if explicit_from_ref:
        return explicit_from_ref
    return _latest_semver_tag()


def _validate_release_branch(branch_name: str) -> None:
    allowed_patterns = [pattern for pattern in _env("RELEASE_ALLOWED_BRANCHES", r"^dev$|^hotfix/.+$").split(",") if pattern.strip()]
    if any(re.fullmatch(pattern.strip(), branch_name) for pattern in allowed_patterns):
        return
    raise StepError(
        f"当前分支 {branch_name} 不允许执行发布，允许模式: {', '.join(pattern.strip() for pattern in allowed_patterns)}"
    )


def _release_commit_message(version: str) -> str:
    return (
        f"🔧 chore(release): 准备 v{version} 发布\n\n"
        f"1. 生成 v{version} 的发布说明。\n"
        f"2. 同步 package.json 版本号。\n"
        "3. 准备后续 release 分支发布。\n"
    )


def _has_change_file_for_version(version: str) -> bool:
    changes_dir = PROJECT_ROOT_DIR / "docs" / "changes"
    if not changes_dir.is_dir():
        return False
    return any(changes_dir.glob(f"*-v{version}.md"))


def release_preflight() -> None:
    required_commands = ["git", "release-cli"]
    missing = [command for command in required_commands if not _command_exists(command)]
    if missing:
        raise StepError(f"缺少必要命令: {' '.join(missing)}")

    if _env("RELEASE_CREATE_PR", "0") == "1" and not _command_exists("gh"):
        raise StepError("RELEASE_CREATE_PR=1 时必须安装 gh CLI")

    branch_name = _git_branch_name()
    if not branch_name:
        raise StepError("当前处于 detached HEAD，无法安全执行发布；请切到 dev 或 hotfix/* 分支")
    _validate_release_branch(branch_name)

    dirty_lines = _git_status_short()
    if dirty_lines and _env("ALLOW_DIRTY", "0") != "1":
        raise StepError("工作区存在未提交变更，请先清理，或显式传入 ALLOW_DIRTY=1")

    package_version = _read_package_version()
    latest_tag_value = _latest_semver_tag()
    if not _env("RELEASE_VERSION"):
        if latest_tag_value and _parse_semver(package_version) > _parse_semver(latest_tag_value[1:]):
            raise StepError(
                f"检测到 package.json.version({package_version}) 高于最新 Tag({latest_tag_value})，"
                "疑似已有待发布版本；请先完成该版本发布，或显式传入 RELEASE_VERSION"
            )
        if not latest_tag_value and _has_change_file_for_version(package_version):
            raise StepError(
                f"检测到 docs/changes 中已存在 v{package_version}，疑似已有待发布版本；"
                "请显式传入 RELEASE_VERSION，或先完成当前版本发布"
            )

    target_version = _resolve_release_target_version()
    latest_tag = latest_tag_value or "无"
    from_ref = _resolve_release_from_ref() or "仓库首个提交"
    print(f"📌 当前分支: {branch_name}")
    print(f"📦 当前最新 Tag: {latest_tag}")
    print(f"🎯 目标版本: v{target_version}")
    print(f"🧭 变更起点: {from_ref}")

    existing_tag = _git_output(["tag", "--list", f"v{target_version}"])
    if existing_tag:
        raise StepError(f"目标 Tag 已存在: v{target_version}")

    if from_ref:
        commit_count = _git_output(["rev-list", "--count", f"{from_ref}..HEAD"])
        if commit_count == "0":
            raise StepError(f"从 {from_ref} 到 HEAD 没有新的提交，无法生成发布")


def release_prepare() -> None:
    target_version = _resolve_release_target_version()
    release_title = _env("RELEASE_TITLE", "发布新版本")
    release_date = _env("RELEASE_DATE")
    from_ref = _resolve_release_from_ref()
    command = ["release-cli", "version", target_version, "--write", "--title", release_title]
    if from_ref:
        command.extend(["--from", from_ref])
    if release_date:
        command.extend(["--date", release_date])

    print(f"🛠️  生成发布文件: v{target_version}")
    _run(command, cwd=PROJECT_ROOT_DIR)

    version_file = PROJECT_ROOT_DIR / "VERSION"
    if version_file.exists() and not _git_tracked_path("VERSION"):
        version_file.unlink()
        print("🧹 已移除 release-cli 生成的临时 VERSION 文件")


def release_commit() -> None:
    if _env("RELEASE_NO_COMMIT", "0") == "1":
        print("⏭️  检测到 RELEASE_NO_COMMIT=1，跳过提交步骤")
        return

    version = _read_package_version()
    release_file = next(
        (line for line in _git_status_short() if "docs/changes/" in line or "package.json" in line),
        None,
    )
    if release_file is None and not _git_output(["diff", "--cached", "--name-only"]):
        raise StepError("未检测到待提交的发布文件，请先执行 prepare 步骤")

    _run(["git", "add", "package.json", "docs/changes"], cwd=PROJECT_ROOT_DIR)
    message = _release_commit_message(version)
    _run(["git", "commit", "-m", message], cwd=PROJECT_ROOT_DIR)
    print(f"✅ 已生成发布提交: v{version}")


def release_pr() -> None:
    if _env("RELEASE_CREATE_PR", "0") != "1":
        print("⏭️  默认不自动创建 PR；如需创建，请传入 RELEASE_CREATE_PR=1")
        return

    branch_name = _git_branch_name()
    if not branch_name:
        raise StepError("创建 PR 前必须位于可识别分支上")

    base_branch = _env("RELEASE_BASE_BRANCH", "release")
    version = _read_package_version()
    title = f"🔧 chore(release): 准备 v{version} 发布"
    body = (
        "## 发布信息\n"
        f"- 目标版本: v{version}\n"
        f"- 来源分支: {branch_name}\n\n"
        "## 说明\n"
        "- 该 PR 由 `make release` 自动创建。\n"
        "- 请在合并前确认 docs/changes 与版本号是否正确。\n"
    )

    if _env("RELEASE_PUSH", "0") == "1":
        _run(["git", "push", "origin", branch_name], cwd=PROJECT_ROOT_DIR)

    _run(
        [
            "gh",
            "pr",
            "create",
            "--base",
            base_branch,
            "--head",
            branch_name,
            "--title",
            title,
            "--body",
            body,
        ],
        cwd=PROJECT_ROOT_DIR,
    )
    print(f"✅ 已创建到 {base_branch} 的发布 PR")


def _require_deploy_config() -> DeployConfig:
    user = _env("DEPLOY_USER")
    host = _env("DEPLOY_HOST")
    remote_dir = _env("DEPLOY_REMOTE_DIR")
    if not user:
        raise StepError("DEPLOY_USER is required")
    if not host:
        raise StepError("DEPLOY_HOST is required")
    if not remote_dir:
        raise StepError("DEPLOY_REMOTE_DIR is required")

    zip_path_raw = _env("ZIP_PATH", _env("DEPLOY_ZIP", "deploy-prepare/deploy.zip"))
    zip_path = Path(zip_path_raw)
    if not zip_path.is_absolute():
        zip_path = (PROJECT_ROOT_DIR / zip_path).resolve()

    return DeployConfig(
        user=user,
        host=host,
        port=_env("DEPLOY_PORT", "22"),
        remote_dir=remote_dir,
        node_version=_env("DEPLOY_NODE_VERSION", "25"),
        app_name=_env("PM2_APP_NAME", "edu-app"),
        seed_mode=_env("SEED_MODE", "minimal"),
        zip_path=zip_path,
        remote_tmp_zip=_env("REMOTE_TMP_ZIP", "/tmp/deploy.zip"),
        env_deps=[item for item in _env("ENV_DEPS", "bun caddy pm2").split() if item],
        db_force_keep=_env("DB_FORCE_KEEP", "0"),
        db_reset=_env("DB_RESET", "0"),
    )


def _ssh_command(config: DeployConfig, remote_command: str) -> list[str]:
    return ["ssh", "-p", config.port, config.ssh_target, remote_command]


def _ssh_script(config: DeployConfig, script: str) -> None:
    _run(["ssh", "-p", config.port, config.ssh_target, "bash", "-s"], input_text=script)


def _ensure_remote_runtime(config: DeployConfig, command: str, *, set_pm2_home: bool = False) -> str:
    parts = [
        'export PATH="$HOME/.bun/bin:$PATH"',
    ]
    if set_pm2_home:
        parts.append('export PM2_HOME="$HOME/.pm2"')
    parts.extend(
        [
            'if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; '
            f'nvm use {shlex.quote(config.node_version)} >/dev/null 2>&1 || '
            f'{{ nvm install {shlex.quote(config.node_version)} >/dev/null; nvm use {shlex.quote(config.node_version)} >/dev/null; }}; fi',
            command,
        ]
    )
    return "; ".join(parts)


def start_dev() -> None:
    bootstrap_script = _project_path(_env("DEV_BOOTSTRAP_SCRIPT", "scripts/dev/bootstrap-worktree.sh"))
    _run([str(bootstrap_script)])
    _run(["bun", "run", "dev"])


def check_remote() -> None:
    config = _require_deploy_config()
    missing: list[str] = []

    print("-------------服务器环境检查-------------")
    print(f"  目标: {config.user}@{config.host}:{config.port}")
    print("")

    for dep in config.env_deps:
        remote_command = (
            "export LANG=C.UTF-8 LC_ALL=C.UTF-8; "
            "export PATH=\"$HOME/.bun/bin:$PATH\"; "
            "if [ -s \"$HOME/.nvm/nvm.sh\" ]; then . \"$HOME/.nvm/nvm.sh\" >/dev/null 2>&1 || true; fi; "
            f"command -v {shlex.quote(dep)} >/dev/null 2>&1"
        )
        result = subprocess.run(_ssh_command(config, remote_command), check=False)
        if result.returncode == 0:
            print(f"  ✅ {dep}")
        else:
            print(f"  ❌ {dep} 未安装")
            missing.append(dep)

    print("----------------------------------------")
    if missing:
        raise StepError(f"服务器缺少依赖: {' '.join(missing)}")

    print("✅ 服务器环境就绪")


def pack() -> None:
    prisma_setup_script = _project_path(_env("PRISMA_SETUP_SCRIPT", "scripts/db/prisma/setup.sh"))
    deploy_prepare_dir = _project_path(_env("DEPLOY_PREPARE_DIR", "deploy-prepare"))
    deploy_zip = _env("DEPLOY_ZIP", f"{deploy_prepare_dir.name}/deploy.zip")

    print("📦 生产构建并打包")
    _run(["rm", "-rf", ".next"], cwd=PROJECT_ROOT_DIR)

    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    _run([str(prisma_setup_script), "--generate-only", "--force"], env=env)
    _run(["bun", "run", "build"])

    if not _command_exists("release-cli"):
        raise StepError("未找到 release-cli，请先安装 release-cli，或确保当前 CI job 已执行对应安装步骤")

    _run(["rm", "-rf", str(deploy_prepare_dir)], cwd=PROJECT_ROOT_DIR)
    _run(["release-cli", "pack"])
    print(f"✅ 压缩完成: {deploy_zip}")


def pack_if_needed() -> None:
    deploy_prepare_dir = _env("DEPLOY_PREPARE_DIR", "deploy-prepare")
    deploy_zip_raw = _env("DEPLOY_ZIP", f"{deploy_prepare_dir}/deploy.zip")
    deploy_zip = Path(deploy_zip_raw)
    if not deploy_zip.is_absolute():
        deploy_zip = (PROJECT_ROOT_DIR / deploy_zip).resolve()

    if _env("REPACK", "0") == "1":
        print("📦 检测到 REPACK=1，重新打包部署文件")
        pack()
        return

    if not deploy_zip.is_file():
        print("📦 未找到部署包，开始执行打包")
        pack()
        return

    print(f"📦 使用现有压缩包: {deploy_zip_raw}")


def deploy() -> None:
    config = _require_deploy_config()
    if not config.zip_path.is_file():
        raise StepError(f"未找到压缩包: {config.zip_path}")

    db_reset_flag = "n" if _normalize_yes_no(config.db_force_keep) == "y" else _normalize_yes_no(config.db_reset)
    if _normalize_yes_no(config.db_force_keep) == "y":
        print("🔒 检测到 DB_FORCE_KEEP=1，部署时将强制保留数据库")

    print("🚀 部署到开发环境")
    _run(["scp", "-P", config.port, str(config.zip_path), f"{config.ssh_target}:{config.remote_tmp_zip}"])

    remote_script = f"""set -euo pipefail
DEPLOY_REMOTE_DIR={shlex.quote(config.remote_dir)}
DEPLOY_TMP_ZIP={shlex.quote(config.remote_tmp_zip)}
DEPLOY_NODE_VERSION={shlex.quote(config.node_version)}
PM2_APP_NAME={shlex.quote(config.app_name)}
DEPLOY_DB_RESET={shlex.quote(db_reset_flag)}

if [[ -z "${{DEPLOY_REMOTE_DIR}}" || "${{DEPLOY_REMOTE_DIR}}" == "/" ]]; then
    echo "❌ DEPLOY_REMOTE_DIR 非法"
    exit 2
fi

export PATH="$HOME/.bun/bin:$PATH"
export PM2_HOME="$HOME/.pm2"
export APP_CWD="${{DEPLOY_REMOTE_DIR}}"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    . "$HOME/.nvm/nvm.sh"
    nvm use "${{DEPLOY_NODE_VERSION}}" >/dev/null 2>&1 || {{
        nvm install "${{DEPLOY_NODE_VERSION}}" >/dev/null
        nvm use "${{DEPLOY_NODE_VERSION}}" >/dev/null
    }}
fi

command -v bun >/dev/null 2>&1 || {{
    echo "❌ 远端缺少 bun"
    exit 127
}}

command -v unzip >/dev/null 2>&1 || {{
    echo "❌ 远端缺少 unzip"
    exit 127
}}

mkdir -p "${{DEPLOY_REMOTE_DIR}}"
cd "${{DEPLOY_REMOTE_DIR}}"

find "${{DEPLOY_REMOTE_DIR}}" -mindepth 1 -maxdepth 1 \\
    ! -name '.env' \\
    ! -name 'logs' \\
    ! -name 'uploads' \\
    ! -name 'prisma' \\
    -exec rm -rf {{}} + 2>/dev/null || true

if [[ -d "${{DEPLOY_REMOTE_DIR}}/prisma" ]]; then
    find "${{DEPLOY_REMOTE_DIR}}/prisma" -mindepth 1 -maxdepth 1 \\
        -exec rm -rf {{}} + 2>/dev/null || true
fi

unzip -qo "${{DEPLOY_TMP_ZIP}}" -d "${{DEPLOY_REMOTE_DIR}}"
rm -f "${{DEPLOY_TMP_ZIP}}"

if [[ -d "${{DEPLOY_REMOTE_DIR}}/raw" ]]; then
    find "${{DEPLOY_REMOTE_DIR}}/raw" -mindepth 1 -maxdepth 1 -exec mv {{}} "${{DEPLOY_REMOTE_DIR}}"/ \\; 2>/dev/null || true
    rm -rf "${{DEPLOY_REMOTE_DIR}}/raw"
fi

mkdir -p "${{DEPLOY_REMOTE_DIR}}/logs" "${{DEPLOY_REMOTE_DIR}}/prisma"
touch "${{DEPLOY_REMOTE_DIR}}/logs/out.log" "${{DEPLOY_REMOTE_DIR}}/logs/error.log"

test -f package.json || {{
    echo "❌ 远端目录缺少 package.json"
    exit 1
}}

test -f .env || {{
    echo "❌ 远端目录缺少 .env"
    exit 1
}}

test -f scripts/db/prisma/setup.sh || {{
    echo "❌ 远端目录缺少 scripts/db/prisma/setup.sh"
    exit 1
}}

test -f ecosystem.config.cjs || {{
    echo "❌ 远端目录缺少 ecosystem.config.cjs"
    exit 1
}}

command -v pm2 >/dev/null 2>&1 || {{
    echo "⚙️  pm2 未安装，开始全局安装"
    npm install -g pm2
}}

bun install --frozen-lockfile --production

test -f .next/BUILD_ID || {{
    echo "❌ 缺少 .next/BUILD_ID：当前目录没有可复用构建产物"
    exit 1
}}

if [[ "${{DEPLOY_DB_RESET}}" == "y" ]]; then
    ./scripts/db/prisma/setup.sh --reset --force
    node scripts/seed/index.mjs --mode=minimal
else
    ./scripts/db/prisma/setup.sh --force
fi

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 describe "${{PM2_APP_NAME}}" >/dev/null 2>&1 || {{
    echo "❌ PM2 进程 ${{PM2_APP_NAME}} 未启动"
    pm2 list
    exit 1
}}

pm2 save >/dev/null
pm2 list
"""
    _ssh_script(config, remote_script)


def seed_remote() -> None:
    config = _require_deploy_config()
    print(f"🌱 在远程服务器执行 seed ({config.seed_mode})")
    remote_command = _ensure_remote_runtime(
        config,
        f"set -e; cd {shlex.quote(config.remote_dir)}; node scripts/seed/index.mjs --mode={shlex.quote(config.seed_mode)}",
    )
    _run(_ssh_command(config, remote_command))


def status_remote() -> None:
    config = _require_deploy_config()
    print("📊 获取 PM2 状态")
    remote_command = _ensure_remote_runtime(config, "pm2 status", set_pm2_home=True)
    _run(_ssh_command(config, remote_command))


def logs_remote() -> None:
    config = _require_deploy_config()
    print("📜 获取 PM2 日志")
    remote_command = _ensure_remote_runtime(config, "pm2 logs --lines 50", set_pm2_home=True)
    _run(_ssh_command(config, remote_command))


def shell_remote() -> None:
    config = _require_deploy_config()
    print("🔌 连接服务器")
    _run(["ssh", "-p", config.port, config.ssh_target], cwd=PROJECT_ROOT_DIR)


def run_step_main(handler: Callable[[], None]) -> int:
    try:
        handler()
        return 0
    except StepError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1
