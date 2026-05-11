# 移除 Flow 框架实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 `scripts/flow/` 框架及关联文件，发布流程完全交给 release-cli，远程运维交给 CI/CD。

**Architecture:** 纯删除 + Makefile 清理。无新增文件。Makefile 从 FLOW_RUNNER 编排模式退化为直接命令调用或移除 target。

**Tech Stack:** Makefile, Python (仅删除), Node.js (仅删除)

**Spec:** `docs/superpowers/specs/2026-05-12-remove-flow-framework-design.md`

---

## 文件变更清单

| 操作 | 文件 | 任务 |
|------|------|------|
| 修改 | `apps/backend/Makefile` | Task 1, 2 |
| 删除 | `apps/backend/scripts/dev/bootstrap-worktree.sh` | Task 3 |
| 删除 | `apps/backend/scripts/release/sync-version-releases.mjs` | Task 3 |
| 删除 | `apps/backend/scripts/flow/` (整个目录) | Task 3 |
| 修改 | `apps/backend/scripts/README.md` | Task 4 |
| 修改 | `apps/backend/docs/RELEASE_GUIDE.md` | Task 4 |
| 修改 | `apps/backend/package.json` | Task 2 |

---

### Task 1: 简化 Makefile dev target，脱耦 flow

**Files:**
- Modify: `apps/backend/Makefile`

当前 `dev` target 通过 FLOW_RUNNER 调用 `step_helpers.start_dev()`，后者执行两步：
1. `scripts/dev/bootstrap-worktree.sh` — worktree 环境初始化
2. `bun run dev` — 启动开发服务

由于 bootstrap-worktree.sh 也将被删除，dev target 简化为直接调用 `bun run dev`。

- [ ] **Step 1: 修改 dev target**

将 `apps/backend/Makefile` 中的：

```makefile
FLOW_RUNNER := python3 ./scripts/flow/run.py
```

整行删除。

将 `dev` target 从：

```makefile
dev:
	@$(FLOW_RUNNER) dev
```

改为：

```makefile
dev:
	@bun run dev
```

将 `.PHONY` 第一行中的 `dev` 保留（它仍是一个有效的 target）。

- [ ] **Step 2: 验证 `make dev` 仍可启动**

Run: `cd apps/backend && make dev`
Expected: 应直接执行 `bun run dev`，启动 Next.js 开发服务。（Ctrl+C 停止即可）

- [ ] **Step 3: Commit**

```bash
git add apps/backend/Makefile
git commit -m "refactor(backend): 简化 dev target，脱耦 flow 框架"
```

---

### Task 2: 移除远程运维 target 和 release-sync

**Files:**
- Modify: `apps/backend/Makefile`
- Modify: `apps/backend/package.json`

移除所有依赖 FLOW_RUNNER 的 target 以及 release-sync（sync-version-releases.mjs 将被删除）。

- [ ] **Step 1: 重写 Makefile**

将 `apps/backend/Makefile` 替换为以下内容（只保留不依赖 flow 的 target）：

```makefile
.PHONY: help dev clean \
  seed-minimal seed-development seed-full seed-help \
  setup-db reset-db reset-db-empty fix-prisma \
  release release-sync release-patch release-minor release-major release-version release-commit

.DEFAULT_GOAL := help
.EXPORT_ALL_VARIABLES:

SEED_SCRIPT := node scripts/seed/index.mjs
MONOREPO_ROOT := ../..

# ============================================
# 帮助
# ============================================

help:
	@echo "🚀 开发命令"
	@echo ""
	@echo "  dev      启动本地开发服务"
	@echo "  clean    清理本地构建产物"
	@echo ""
	@echo "  版本发布 (release-cli):"
	@echo "    release          统一发布入口 (默认 patch，可传 TYPE=minor)"
	@echo "    release-patch    兼容别名，等价于 make release TYPE=patch"
	@echo "    release-minor    兼容别名，等价于 make release TYPE=minor"
	@echo "    release-major    兼容别名，等价于 make release TYPE=major"
	@echo "    release-version  兼容别名，自定义版本号 (make release-version V=1.2.3)"
	@echo ""
	@echo "  Seed 数据:"
	@echo "    seed-minimal       执行核心 seed (admin + permission)"
	@echo "    seed-development   执行开发环境 seed"
	@echo "    seed-full          执行完整 seed"
	@echo "    seed-help          查看 seed 帮助"
	@echo ""
	@echo "  数据库管理:"
	@echo "    setup-db           数据库初始化/刷新"
	@echo "    reset-db           重置数据库 (⚠️ 危险操作)"
	@echo "    reset-db-empty     重置数据库但不执行 seed (⚠️ 危险操作)"
	@echo ""
	@echo "  自定义参数:"
	@echo "    make release TYPE=minor"
	@echo "    make release VERSION=1.2.3 RELEASE_TITLE='发布新版本'"
	@echo "    make release RELEASE_CREATE_PR=1 RELEASE_PUSH=1"

# ============================================
# 本地开发
# ============================================

dev:
	@bun run dev

# ============================================
# 清理
# ============================================

clean:
	@echo "🧹 清理本地构建产物..."
	@echo "  - 删除 .next/..."
	@rm -rf .next/
	@echo "  - 删除部署打包产物..."
	@rm -rf deploy-prepare
	@rm -f deploy-prepare/deploy.zip
	@rm -f /tmp/deploy*/
	@echo "  - 清理 node_modules/.cache..."
	@rm -rf node_modules/.cache 2>/dev/null || true
	@echo "  - 清理 Prisma 生成的 client..."
	@rm -rf src/lib/prisma/generated 2>/dev/null || true
	@echo "✅ 本地清理完成!"

# ============================================
# Seed 数据
# ============================================

seed-minimal:
	@echo "🌱 执行 minimal seed（核心数据）..."
	@$(SEED_SCRIPT) --mode=minimal

seed-development:
	@echo "🌱 执行 development seed..."
	@$(SEED_SCRIPT) --mode=development

seed-full:
	@echo "🌱 执行 full seed..."
	@$(SEED_SCRIPT) --mode=full

seed-help:
	@$(SEED_SCRIPT) --help

# ============================================
# 版本发布 (使用 release-cli)
# ============================================

TYPE ?= patch
V ?=

release:
	@$(MAKE) -C $(MONOREPO_ROOT) release-backend TYPE=$(TYPE) VERSION=$(VERSION)

release-patch:
	@$(MAKE) release TYPE=patch

release-version:
	@if [ -z "$(V)" ]; then echo "❌ 请传入 V=1.2.3"; exit 1; fi
	@$(MAKE) -C $(MONOREPO_ROOT) release-backend VERSION=$(V)

release-minor:
	@$(MAKE) release TYPE=minor

release-major:
	@$(MAKE) release TYPE=major

release-commit:
	@$(MAKE) -C $(MONOREPO_ROOT) release-commit RELEASE=backend

# ============================================
# 数据库初始化/重置
# ============================================

setup-db:
	@echo "🔧 数据库初始化/刷新..."
	@./scripts/db/prisma/setup.sh --force

reset-db-empty:
	@echo "🗑️  重置数据库但不执行 seed..."
	@./scripts/db/prisma/setup.sh --reset --force

reset-db:
	@echo "🗑️  重置数据库..."
	@./scripts/db/prisma/setup.sh --reset --seed --force

fix-prisma:
	@echo "🔧 修复 Prisma 安装（解决 worktree 路径问题）..."
	@rm -rf node_modules/@prisma
	@rm -rf src/lib/prisma/generated
	@echo "🔨 重新安装 Prisma..."
	@bun install prisma @prisma/client --force
	@echo "✅ Prisma 修复完成！"
```

- [ ] **Step 2: 移除 package.json 中的 release:sync script**

在 `apps/backend/package.json` 中，找到并删除：

```json
"release:sync": "node scripts/release/sync-version-releases.mjs",
```

- [ ] **Step 3: 验证 `make help` 输出正常**

Run: `cd apps/backend && make help`
Expected: 应只显示 dev、clean、release、seed、db 相关 target，不再有 check/pack/dev-deploy/status/logs/shell/seed-remote。

- [ ] **Step 4: Commit**

```bash
git add apps/backend/Makefile apps/backend/package.json
git commit -m "refactor(backend): 移除远程运维 target 和 release-sync，简化 Makefile"
```

---

### Task 3: 删除 flow 目录及关联文件

**Files:**
- Delete: `apps/backend/scripts/flow/` (整个目录)
- Delete: `apps/backend/scripts/dev/bootstrap-worktree.sh`
- Delete: `apps/backend/scripts/release/sync-version-releases.mjs`

- [ ] **Step 1: 删除 scripts/flow/ 目录**

```bash
rm -rf apps/backend/scripts/flow/
```

- [ ] **Step 2: 删除 scripts/dev/ 目录**

```bash
rm -rf apps/backend/scripts/dev/
```

- [ ] **Step 3: 删除 scripts/release/ 目录**

```bash
rm -rf apps/backend/scripts/release/
```

- [ ] **Step 4: 验证文件已删除**

Run: `ls apps/backend/scripts/`
Expected: 应只剩 `db/`、`ops/`、`security/`、`seed/` 和 `release-version-hook.py`，不再有 `flow/`、`dev/`、`release/` 目录。

- [ ] **Step 5: Commit**

```bash
git add -A apps/backend/scripts/
git commit -m "refactor(backend): 删除 flow 框架、bootstrap-worktree 和 sync-version-releases"
```

---

### Task 4: 清理文档

**Files:**
- Modify: `apps/backend/scripts/README.md`
- Modify: `apps/backend/docs/RELEASE_GUIDE.md`

- [ ] **Step 1: 重写 scripts/README.md**

将 `apps/backend/scripts/README.md` 替换为：

```markdown
# Scripts 目录说明

当前 `scripts/` 按职责拆分为以下目录：

- `scripts/db/`: 数据库初始化、迁移、重置相关脚本
- `scripts/ops/`: 一次性运维脚本与排查工具
- `scripts/security/`: 安全相关的辅助脚本
- `scripts/seed/`: Seed 系统

维护策略：

- 根目录只保留少量稳定入口，避免再次堆积"一次性脚本"
- `scripts/release-version-hook.py` 按 release-cli 配置保留在根目录
- `Makefile` 与 `package.json` 优先调用分层目录中的脚本
- 新增脚本请放入对应子目录，不再直接堆到 `scripts/` 根目录
- 发布流程统一通过 `make release` 调度，`release-cli` 作为发布工具
- 远程部署/运维操作交给 CI/CD (GitHub Actions)
```

- [ ] **Step 2: 更新 RELEASE_GUIDE.md**

在 `apps/backend/docs/RELEASE_GUIDE.md` 中，找到"实现组成"章节下的"本地 release flow"部分（约第 178-186 行），将：

```markdown
### 本地 release flow

相关文件：

- `scripts/flow/manifests/release.json`
- `scripts/flow/steps/release/preflight.py`
- `scripts/flow/steps/release/prepare.py`
- `scripts/flow/steps/release/commit.py`
- `scripts/flow/steps/release/pr.py`

步骤说明：

1. `preflight`
   - 检查是否位于 `dev` 或 `hotfix/*`
   - 检查工作区是否干净
   - 检查 `git`、`release-cli`，以及可选的 `gh`
   - 检查目标 tag 是否已存在
   - 检查是否疑似存在未完成的待发布版本
2. `prepare`
   - 调用 `release-cli version ... --write`
   - 生成 `docs/changes/*.md`
   - 触发 hook，同步 `package.json.version`
3. `commit`
   - 提交 `package.json` 和 `docs/changes`
4. `pr`
   - 按需 push 并创建到 `release` 分支的 PR
```

替换为：

```markdown
### 本地 release flow

由 `release-cli release` 驱动，配置在 `.release/backend.yml`。

步骤说明：

1. `preflight`
   - 检查是否位于 `dev` 或 `hotfix/*`
   - 检查工作区是否干净
   - 检查目标 tag 是否已存在
2. `prepare`
   - 调用 `release-cli version ... --write`
   - 生成 `docs/changes/*.md`
   - 触发 version hook，同步 `package.json.version`
3. `commit`
   - 自动暂存发布文件，创建提交和 tag
4. `pr`
   - 可选创建到 `release` 分支的 PR（默认关闭）
```

然后在"验证建议"部分（约第 305-313 行），将：

```markdown
```bash
make help
FLOW_DRY_RUN=1 make release TYPE=minor
make release-sync
```
```

替换为：

```markdown
```bash
make help
make release TYPE=patch --dry-run
```
```

删除"相关文件"部分（末尾）中的 `scripts/README.md` 引用（如果有的话），保留其他引用。

- [ ] **Step 3: 验证文档无残留引用**

Run: `grep -r "scripts/flow" apps/backend/`
Expected: 无结果

Run: `grep -r "FLOW_RUNNER\|FLOW_FROM\|FLOW_TO\|FLOW_ONLY\|FLOW_SKIP\|FLOW_DRY_RUN\|sync-version-releases\|bootstrap-worktree" apps/backend/`
Expected: 无结果

- [ ] **Step 4: Commit**

```bash
git add apps/backend/scripts/README.md apps/backend/docs/RELEASE_GUIDE.md
git commit -m "docs(backend): 清理 flow 框架和已删除脚本的文档引用"
```

---

### Task 5: 全量验证

- [ ] **Step 1: 验证 `make help` 输出**

Run: `cd apps/backend && make help`
Expected: 只显示 dev、clean、release、seed、db 相关 target。

- [ ] **Step 2: 验证发布流程不受影响**

Run: `cd /Users/loyd/dev/project/nextjs/next-template && make release-backend --dry-run TYPE=patch`
Expected: 应调用 `release-cli --config ".release/backend.yml" release "patch"`，无任何 flow 相关调用。

注意：如果 release-cli 不支持 `--dry-run` 在 Makefile 层面，可改为验证命令内容：
Run: `grep -n "release-cli" Makefile`
Expected: 应看到 `release-cli --config` 调用，无 flow/run.py 引用。

- [ ] **Step 3: 确认无残留引用**

Run: `grep -rn "scripts/flow\|FLOW_RUNNER\|step_helpers\|bootstrap-worktree\|sync-version-releases" apps/backend/`
Expected: 无结果（除了 docs/superpowers/ 下的设计文档）。

- [ ] **Step 4: 确认 scripts 目录结构正确**

Run: `find apps/backend/scripts -type f | sort`
Expected:
```
apps/backend/scripts/db/...
apps/backend/scripts/ops/...
apps/backend/scripts/release-version-hook.py
apps/backend/scripts/security/...
apps/backend/scripts/seed/...
```

不应出现 `flow/`、`dev/`、`release/` 目录。

- [ ] **Step 5: Final commit (if any fixups needed)**

如果前述验证发现任何遗漏，修复后提交。否则跳过。
