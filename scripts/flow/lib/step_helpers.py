#!/usr/bin/env python3

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path


FLOW_ROOT_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT_DIR = FLOW_ROOT_DIR.parent.parent


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


def _command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def _normalize_yes_no(value: str) -> str:
    if value.lower() in {"1", "y", "yes", "true"}:
        return "y"
    return "n"


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
