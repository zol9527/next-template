#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

# Monorepo 适配：计算后端在 git 仓库中的相对路径
# git worktree list 返回 monorepo 根目录，而 .env.* 文件在 apps/backend/ 下
readonly GIT_ROOT="$(git rev-parse --show-toplevel)"
readonly BACKEND_REL_PATH="${PROJECT_ROOT#"${GIT_ROOT}/"}"

readonly ENV_LOCAL_PATH="${PROJECT_ROOT}/.env.local"
readonly ENV_EXAMPLE_LOCAL_PATH="${PROJECT_ROOT}/.env.example.local"
readonly ENV_DEVELOPMENT_PATH="${PROJECT_ROOT}/.env.development"

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "❌ 缺少命令 '$1'"
        exit 1
    fi
}

ensure_dependencies() {
    if [[ -d "${PROJECT_ROOT}/node_modules" ]]; then
        echo "✅ 已检测到 node_modules，跳过依赖安装"
        return
    fi

    echo "📦 当前 worktree 缺少 node_modules，执行 bun install"
    bun install
}

copy_env_file() {
    local source_path="$1"
    local source_desc="$2"

    cp "${source_path}" "${ENV_LOCAL_PATH}"
    echo "✅ 已生成 .env.local（来源: ${source_desc}）"
}

ensure_local_env() {
    if [[ -f "${ENV_LOCAL_PATH}" ]]; then
        echo "✅ 已检测到 .env.local，跳过环境文件生成"
        return
    fi

    if [[ -f "${ENV_DEVELOPMENT_PATH}" ]]; then
        copy_env_file "${ENV_DEVELOPMENT_PATH}" ".env.development"
        return
    fi

    if command -v git >/dev/null 2>&1; then
        local worktree_path=""
        while IFS= read -r worktree_path; do
            [[ -n "${worktree_path}" ]] || continue
            # 跳过当前 worktree（比较 monorepo 根目录级别）
            [[ "${worktree_path}" == "${GIT_ROOT}" ]] && continue

            # worktree_path 是 monorepo 根目录，需要拼接后端子路径
            local wt_backend_dir="${worktree_path}/${BACKEND_REL_PATH}"

            if [[ -f "${wt_backend_dir}/.env.local" ]]; then
                copy_env_file "${wt_backend_dir}/.env.local" "${wt_backend_dir}/.env.local"
                return
            fi

            if [[ -f "${wt_backend_dir}/.env.development" ]]; then
                copy_env_file "${wt_backend_dir}/.env.development" "${wt_backend_dir}/.env.development"
                return
            fi
        done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')
    fi

    if [[ -f "${ENV_EXAMPLE_LOCAL_PATH}" ]]; then
        copy_env_file "${ENV_EXAMPLE_LOCAL_PATH}" ".env.example.local"
        echo "⚠️  当前使用的是示例环境变量，请按需补齐真实配置"
        return
    fi

    echo "❌ 未找到可用于生成 .env.local 的来源文件"
    exit 1
}

ensure_prisma_assets() {
    if [[ ! -x "${PROJECT_ROOT}/scripts/db/prisma/setup.sh" ]]; then
        echo "❌ 缺少 Prisma 初始化脚本: scripts/db/prisma/setup.sh"
        exit 1
    fi

    echo "🔧 预生成 Prisma Schema 与 Client"
    "${PROJECT_ROOT}/scripts/db/prisma/setup.sh" --generate-only --force
}

main() {
    require_cmd bun
    require_cmd bash
    ensure_dependencies
    ensure_local_env
    ensure_prisma_assets
    echo "✅ 本地开发预处理完成"
}

main "$@"
