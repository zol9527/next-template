#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

cd "${PROJECT_ROOT}"

RESET_MODE=0
FORCE_MODE=0
RUN_SEED=0
GENERATE_ONLY=0
PRISMA_SCHEMA_PATH="./prisma/schema.prisma"

show_help() {
    cat << EOF
用法: ./scripts/db/prisma/setup.sh [选项]

Prisma 初始化/刷新脚本（MySQL）

选项:
  -r, --reset     重置模式：清空 MySQL 数据库后重新初始化（⚠️ 危险操作）
  -f, --force     强制模式：跳过确认提示，直接执行
  -s, --seed      完成后自动执行 seed 操作（npm run seed:development）
  -g, --generate-only  仅生成 Prisma Client，不执行数据库迁移
  -h, --help      显示此帮助信息
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -r|--reset)
                RESET_MODE=1
                shift
                ;;
            -f|--force)
                FORCE_MODE=1
                shift
                ;;
            -s|--seed)
                RUN_SEED=1
                shift
                ;;
            -g|--generate-only)
                GENERATE_ONLY=1
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                echo "❌ 未知参数: $1"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done
}

parse_args "$@"

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "❌ 缺少命令 '$1'"
        exit 1
    fi
}

mask_database_url() {
    local url="${1:-}"
    if [[ -z "${url}" ]]; then
        echo ""
        return
    fi

    echo "${url}" | sed -E 's#(://)[^@/]+@#\1***@#'
}

load_database_env() {
    local node_env="${NODE_ENV:-development}"
    local env_files=(
        "${PROJECT_ROOT}/.env.${node_env}.local"
        "${PROJECT_ROOT}/.env.local"
        "${PROJECT_ROOT}/.env.${node_env}"
        "${PROJECT_ROOT}/.env"
    )
    local env_file=""

    for candidate in "${env_files[@]}"; do
        if [[ -f "${candidate}" ]]; then
            env_file="${candidate}"
            break
        fi
    done

    if [[ -z "${env_file}" ]]; then
        return
    fi

    if [[ -z "${DATABASE_URL:-}" ]]; then
        local url
        url=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL[[:space:]]*=' "${env_file}" | head -1 \
            | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_URL[[:space:]]*=[[:space:]]*//' \
            | tr -d '"' | tr -d "'")
        if [[ -n "${url}" ]]; then
            DATABASE_URL="${url}"
        fi
    fi

    if [[ -z "${DATABASE_PROVIDER:-}" ]]; then
        local database_provider
        database_provider=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_PROVIDER[[:space:]]*=' "${env_file}" | head -1 \
            | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_PROVIDER[[:space:]]*=[[:space:]]*//' \
            | tr -d '"' | tr -d "'")
        if [[ -n "${database_provider}" ]]; then
            DATABASE_PROVIDER="${database_provider}"
        fi
    fi
}

merge_prisma_schema() {
    bun run prisma:merge
}

check_prisma_schema() {
    if [[ ! -f "${PRISMA_SCHEMA_PATH}" ]]; then
        echo "❌ Prisma schema 文件不存在: ${PRISMA_SCHEMA_PATH}"
        exit 1
    fi
}

ensure_mysql_prisma_mode() {
    if [[ "${DATABASE_PROVIDER:-}" == "supabase" ]]; then
        echo "❌ 当前 DATABASE_PROVIDER=supabase，不能执行 Prisma 初始化脚本"
        exit 1
    fi

    if [[ -z "${DATABASE_URL:-}" ]]; then
        echo "❌ 缺少 DATABASE_URL"
        exit 1
    fi

    case "${DATABASE_URL}" in
        mysql:*|mariadb:*)
            echo "   ✅ DATABASE_URL: $(mask_database_url "${DATABASE_URL}")"
            ;;
        *)
            echo "❌ 当前脚本仅支持 MySQL/MariaDB"
            echo "   当前 DATABASE_URL: $(mask_database_url "${DATABASE_URL}")"
            exit 1
            ;;
    esac
}

clean_prisma_client() {
    local prisma_client_dir="./src/lib/prisma/generated"
    if [[ -d "${prisma_client_dir}" ]]; then
        rm -rf "${prisma_client_dir}"
    fi
}

generate_prisma_client() {
    npx prisma generate --schema "${PRISMA_SCHEMA_PATH}"
}

deploy_migrations() {
    npx prisma migrate deploy --schema "${PRISMA_SCHEMA_PATH}"
}

reset_database() {
    npx prisma migrate reset --schema "${PRISMA_SCHEMA_PATH}" --force
}

confirm_if_needed() {
    if [[ "${FORCE_MODE}" == "1" || "${RESET_MODE}" == "0" ]]; then
        return
    fi

    read -r -p "⚠️  将清空数据库，是否继续？[y/N] " confirm
    confirm="${confirm:-N}"
    confirm="$(printf "%s" "${confirm}" | tr '[:upper:]' '[:lower:]')"
    if [[ "${confirm}" != "y" ]]; then
        echo "⛔ 已取消执行"
        exit 1
    fi
}

run_seed_if_needed() {
    if [[ "${RUN_SEED}" != "1" ]]; then
        return
    fi

    node scripts/seed/index.mjs --mode=development
}

main() {
    require_cmd bun
    require_cmd npx
    load_database_env
    merge_prisma_schema
    check_prisma_schema
    clean_prisma_client
    generate_prisma_client

    if [[ "${GENERATE_ONLY}" == "1" ]]; then
        echo "✅ Prisma Client 已生成（未执行数据库变更）"
        exit 0
    fi

    ensure_mysql_prisma_mode
    confirm_if_needed

    if [[ "${RESET_MODE}" == "1" ]]; then
        reset_database
    else
        deploy_migrations
    fi

    run_seed_if_needed
    echo "✅ Prisma 初始化完成"
}

main "$@"
