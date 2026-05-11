#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import subprocess
import sys
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


FLOW_ROOT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT_DIR = FLOW_ROOT_DIR.parent.parent
FLOW_CONFIG_PATH = FLOW_ROOT_DIR / "config.toml"
FLOW_LOCAL_CONFIG_PATH = FLOW_ROOT_DIR / "config.local.toml"


class FlowError(RuntimeError):
    pass


@dataclass
class FlowManifest:
    action: str
    name: str
    steps: list[str]


@dataclass
class FlowRuntimeConfig:
    flow_from: str = ""
    flow_to: str = ""
    flow_only: list[str] = field(default_factory=list)
    flow_skip: list[str] = field(default_factory=list)
    dry_run: bool = False


def _trim_csv_env(name: str) -> list[str]:
    raw_value = os.environ.get(name, "").strip()
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _runtime_config() -> FlowRuntimeConfig:
    return FlowRuntimeConfig(
        flow_from=os.environ.get("FLOW_FROM", "").strip(),
        flow_to=os.environ.get("FLOW_TO", "").strip(),
        flow_only=_trim_csv_env("FLOW_ONLY"),
        flow_skip=_trim_csv_env("FLOW_SKIP"),
        dry_run=os.environ.get("FLOW_DRY_RUN", "0").strip() == "1",
    )


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise FlowError(f"Manifest 必须是 JSON 对象: {path}")
    return data


def _load_toml(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    with path.open("rb") as file:
        data = tomllib.load(file)
    if not isinstance(data, dict):
        raise FlowError(f"Config 必须是 TOML 对象: {path}")
    return data


def _merge_manifest(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    merged.update(override)
    return merged


def _merge_dict(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def _manifest_path(action: str) -> Path:
    return FLOW_ROOT_DIR / "manifests" / f"{action}.json"


def _local_manifest_path(action: str) -> Path:
    return FLOW_ROOT_DIR / "manifests" / f"{action}.local.json"


def _load_flow_config() -> dict[str, Any]:
    return _merge_dict(_load_toml(FLOW_CONFIG_PATH), _load_toml(FLOW_LOCAL_CONFIG_PATH))


def _bool_to_env(value: Any) -> str:
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, str):
        return "1" if value.strip().lower() in {"1", "y", "yes", "true"} else "0"
    return "1" if value else "0"


def _inject_config_env(env: dict[str, str], config: dict[str, Any]) -> dict[str, str]:
    deploy = config.get("deploy", {})
    pack = config.get("pack", {})
    seed = config.get("seed", {})
    database = config.get("database", {})

    defaults = {
        "DEPLOY_USER": str(deploy.get("user", "")).strip(),
        "DEPLOY_HOST": str(deploy.get("host", "")).strip(),
        "DEPLOY_PORT": str(deploy.get("port", "22")).strip(),
        "DEPLOY_NODE_VERSION": str(deploy.get("node_version", "25")).strip(),
        "DEPLOY_REMOTE_DIR": str(deploy.get("remote_dir", "")).strip(),
        "PM2_APP_NAME": str(deploy.get("app_name", "nextjs-app")).strip(),
        "REMOTE_TMP_ZIP": str(deploy.get("remote_tmp_zip", "/tmp/deploy.zip")).strip(),
        "ENV_DEPS": " ".join([str(item).strip() for item in deploy.get("env_deps", ["bun", "caddy", "pm2"]) if str(item).strip()]),
        "DEPLOY_PREPARE_DIR": str(pack.get("prepare_dir", "deploy-prepare")).strip(),
        "DEPLOY_ZIP": str(pack.get("zip_path", "deploy-prepare/deploy.zip")).strip(),
        "PRISMA_SETUP_SCRIPT": str(pack.get("prisma_setup_script", "scripts/db/prisma/setup.sh")).strip(),
        "REPACK": _bool_to_env(pack.get("repack", False)),
        "SEED_MODE": str(seed.get("mode", "minimal")).strip(),
        "DB_RESET": _bool_to_env(database.get("reset", False)),
        "DB_FORCE_KEEP": _bool_to_env(database.get("force_keep", False)),
    }

    for key, value in defaults.items():
        env.setdefault(key, value)

    return env


def load_manifest(action: str) -> FlowManifest:
    manifest_path = _manifest_path(action)
    if not manifest_path.is_file():
        raise FlowError(f"未找到 flow manifest: {manifest_path}")

    manifest_data = _load_json(manifest_path)
    local_manifest_path = _local_manifest_path(action)
    if local_manifest_path.is_file():
        manifest_data = _merge_manifest(manifest_data, _load_json(local_manifest_path))

    name = str(manifest_data.get("name", "")).strip()
    steps = manifest_data.get("steps", [])
    if not name:
        raise FlowError(f"Manifest 缺少 name: {manifest_path}")
    if not isinstance(steps, list) or not all(isinstance(item, str) and item.strip() for item in steps):
        raise FlowError(f"Manifest steps 非法: {manifest_path}")

    return FlowManifest(
        action=action,
        name=name,
        steps=[item.strip() for item in steps],
    )


def _validate_step_exists(manifest: FlowManifest, step: str) -> None:
    if step not in manifest.steps:
        raise FlowError(f"Flow {manifest.action} 中不存在步骤: {step}")


def validate_runtime_config(manifest: FlowManifest, config: FlowRuntimeConfig) -> None:
    if config.flow_from:
        _validate_step_exists(manifest, config.flow_from)
    if config.flow_to:
        _validate_step_exists(manifest, config.flow_to)
    for step in config.flow_only:
        _validate_step_exists(manifest, step)


def _resolve_script(directory: Path, name: str) -> Path | None:
    candidate = directory / f"{name}.py"
    return candidate if candidate.is_file() else None


def _step_script(action: str, step: str) -> Path:
    script_path = _resolve_script(FLOW_ROOT_DIR / "steps" / action, step)
    if script_path is None:
        raise FlowError(f"未找到步骤脚本: {action}/{step}")
    return script_path


def _hook_script(action: str, hook: str) -> Path | None:
    return _resolve_script(FLOW_ROOT_DIR / "hooks" / action, hook)


def _script_command(script_path: Path) -> list[str]:
    return [sys.executable, str(script_path)]


def _run_script(action: str, label: str, script_path: Path, runtime: FlowRuntimeConfig, config_env: dict[str, str], extra_env: dict[str, str] | None = None) -> None:
    print(f"▶️  [{action}] {label}")
    if runtime.dry_run:
        print(f"🧪 [{action}] DRY RUN，未实际执行: {script_path}")
        return

    env = dict(config_env)
    env.update(
        {
            "FLOW_ROOT_DIR": str(FLOW_ROOT_DIR),
            "PROJECT_ROOT_DIR": str(PROJECT_ROOT_DIR),
            "FLOW_ACTION": action,
        }
    )
    if extra_env:
        env.update(extra_env)

    subprocess.run(
        _script_command(script_path),
        check=True,
        cwd=PROJECT_ROOT_DIR,
        env=env,
    )
    print(f"✅ [{action}] 完成: {label}")


def _run_optional_hook(action: str, hook_name: str, runtime: FlowRuntimeConfig, config_env: dict[str, str], extra_env: dict[str, str] | None = None) -> None:
    hook_path = _hook_script(action, hook_name)
    if hook_path is not None:
        _run_script(action, f"Hook {hook_name}", hook_path, runtime, config_env, extra_env)


def _should_run_step(step: str, runtime: FlowRuntimeConfig) -> bool:
    if runtime.flow_only:
        return step in runtime.flow_only
    if runtime.flow_skip and step in runtime.flow_skip:
        return False
    return True


def run_flow(manifest: FlowManifest, runtime: FlowRuntimeConfig) -> int:
    print(f"🚀 Flow: {manifest.name}")

    config_env = _inject_config_env(dict(os.environ), _load_flow_config())

    _run_optional_hook(manifest.action, "before-all", runtime, config_env)

    started = False
    step_index = 0
    status_code = 0

    try:
        for step in manifest.steps:
            if runtime.flow_from and not started and step != runtime.flow_from:
                continue

            started = True
            step_index += 1
            extra_env = {"FLOW_STEP": step, "FLOW_STEP_INDEX": str(step_index)}

            print("")
            if not _should_run_step(step, runtime):
                print(f"⏭️  [{manifest.action}] 跳过步骤: {step}")
            else:
                _run_optional_hook(manifest.action, "before-step", runtime, config_env, extra_env)
                _run_optional_hook(manifest.action, f"before-{step}", runtime, config_env, extra_env)
                _run_script(manifest.action, f"步骤 {step}", _step_script(manifest.action, step), runtime, config_env, extra_env)
                _run_optional_hook(manifest.action, f"after-{step}", runtime, config_env, extra_env)
                _run_optional_hook(manifest.action, "after-step", runtime, config_env, extra_env)

            if runtime.flow_to and step == runtime.flow_to:
                break
    except subprocess.CalledProcessError as error:
        status_code = error.returncode or 1
    finally:
        _run_optional_hook(manifest.action, "after-all", runtime, config_env)
        print("")

    if status_code == 0:
        _run_optional_hook(manifest.action, "on-success", runtime, config_env)
        print(f"🏁 Flow 完成: {manifest.name}")
        return 0

    _run_optional_hook(manifest.action, "on-failure", runtime, config_env)
    print(f"❌ Flow 失败: {manifest.name}")
    return status_code


def main(argv: list[str]) -> int:
    action = argv[1].strip() if len(argv) > 1 else ""
    if not action:
        print("用法: python3 scripts/flow/run.py <action>", file=sys.stderr)
        return 1

    try:
        manifest = load_manifest(action)
        runtime = _runtime_config()
        validate_runtime_config(manifest, runtime)
        return run_flow(manifest, runtime)
    except FlowError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
