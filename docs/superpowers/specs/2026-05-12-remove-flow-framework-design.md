# 移除 Flow 框架 & 迁移到 release-cli 设计文档

> 日期: 2026-05-12
> 状态: 待审批

## 背景

`apps/backend/scripts/flow/` 是一个自建的 Python 流程编排框架（约 1200 行），与用户开发的 `release-cli` 工具功能严重重叠。

### 现状分析

**flow 框架包含两部分：**

1. **框架层**（~500 行，将被移除）：
   - `run.py` — 流程引擎（305 行）
   - `config.toml` — 默认配置
   - `manifests/` — 10 个 JSON 流程定义
   - `steps/` — 全是 16 行薄 wrapper
   - `hooks/` — 空（仅 `.gitkeep`，从未使用）

2. **业务层**（~650 行，需要迁移）：
   - `lib/step_helpers.py` — 所有实际业务逻辑

### release-cli 能力覆盖

| 能力         | flow                              | release-cli                                 | 状态   |
| ------------ | --------------------------------- | ------------------------------------------- | ------ |
| 版本管理     | step_helpers.py 自行计算 semver   | VersionManager，file/git-tag 双源           | ✅ 已覆盖 |
| Changelog    | 调用 release-cli version --write  | 内置，按提交类型分中文章节                  | ✅ 已覆盖 |
| 打包         | 调用 release-cli pack             | 内置 Packager，include/exclude 模板          | ✅ 已覆盖 |
| 发布流水线   | release.json + 4 个 step wrapper  | release-cli release，4 阶段                  | ✅ 已覆盖 |
| 步骤控制     | FLOW_FROM/TO/ONLY/SKIP            | --from-step/--to-step/--only/--skip          | ✅ 已覆盖 |
| 生命周期 hook | before-all/before-<step>/...      | 完全一致 + @step 装饰器                     | ✅ 已覆盖 |
| Dry run      | FLOW_DRY_RUN=1                    | --dry-run                                    | ✅ 已覆盖 |
| 分支保护     | _validate_release_branch()        | release.allowed_branches 配置                | ✅ 已覆盖 |
| PR 创建      | release_pr() 自行调用 gh          | 内置 --create-pr --push                      | ✅ 已覆盖 |
| Monorepo     | 不支持 tag 隔离                   | tag_prefix 原生支持                          | ✅ 更强   |
| 远程部署     | deploy() SSH 操作                  | ❌ 不覆盖                                    | CI/CD   |
| 远程运维     | check/status/logs/shell           | ❌ 不覆盖                                    | CI/CD   |

## 决策

1. **发布流程** → 完全交给 release-cli（当前 Makefile 已这样做了）
2. **远程部署/运维** → 交给 CI/CD（GitHub Actions），本地不再维护 SSH 部署脚本
3. **本地开发启动** → 简化为 Makefile 直接调用，不经过 flow
4. **数据库版本同步** → 保留为独立业务脚本，不属于发布工具

## 要删除的文件

### `scripts/flow/` 整个目录

```
scripts/flow/
├── config.toml
├── README.md
├── run.py
├── hooks/
│   ├── dev-deploy/.gitkeep
│   └── dev/.gitkeep
├── lib/
│   └── step_helpers.py
└── manifests/
    ├── check.json
    ├── dev-deploy.json
    ├── dev.json
    ├── logs.json
    ├── pack-if-needed.json
    ├── pack.json
    ├── release.json
    ├── seed-remote.json
    ├── shell.json
    └── status.json
```

**原因**：
- release action 未被 Makefile 使用（Makefile 委托给根 Makefile 的 release-cli）
- hooks 从未使用
- manifest/step wrapper 是纯框架开销
- step_helpers 中的远程运维逻辑交给 CI/CD

### `scripts/dev/bootstrap-worktree.sh`

**引用**：仅 `step_helpers.py:418` 一处引用

**原因**：这个脚本处理 git worktree 环境初始化（复制 .env、安装依赖、生成 Prisma），属于 flow 部署流程内部使用。随着 flow 移除，其调用者消失。

**注意**：如果 `make dev` 仍需要 worktree 初始化逻辑，可以将 `ensure_dependencies` + `ensure_local_env` + `ensure_prisma_assets` 内联到 Makefile 的 dev target 中。需要确认用户是否仍使用 git worktree 开发。

### `scripts/release/sync-version-releases.mjs`

**引用**：
- `Makefile:10` — `RELEASE_SYNC_SCRIPT := node scripts/release/sync-version-releases.mjs`
- `Makefile:153` — `release-sync` target
- `package.json:15` — `release:sync` script

**用户原话**："和 release-cli 无关，是业务功能：把 changelog 写入数据库供前端展示"

**这个文件不属于 flow 框架，不应在本次移除。**

如果用户确认前端不再需要从数据库读取版本记录（比如改为直接读 docs/changes/*.md），可以单独处理。

## 分阶段计划

### 阶段 1：简化本地开发入口

**目标**：`make dev` 不再经过 flow，直接执行。

**变更**：
- `Makefile` 的 `dev` target：从 `@$(FLOW_RUNNER) dev` 改为直接调用
- 如果需要 worktree 初始化，内联 bootstrap 逻辑或保留 `scripts/dev/bootstrap-worktree.sh` 作为独立脚本
- 如果不需要，删除 `scripts/dev/bootstrap-worktree.sh`

**验证**：
```bash
make dev  # 应直接启动本地开发，不经过 flow
```

### 阶段 2：移除远程运维 Makefile target

**目标**：移除 `check`、`dev-deploy`、`pack`、`pack-if-needed`、`seed-remote`、`status`、`logs`、`shell` target。

**理由**：这些全部是 SSH 远程操作，应交给 CI/CD pipeline（GitHub Actions）。

**变更**：
- 移除 Makefile 中上述 target 及其 help 文档
- 移除 `FLOW_RUNNER` 变量定义
- 移除 `FLOW_FROM/FLOW_TO/FLOW_ONLY/FLOW_SKIP/FLOW_DRY_RUN` 相关文档

**保留的 target**：
- `dev` — 本地开发（阶段 1 已简化）
- `clean` — 本地清理
- `seed-minimal/development/full/help` — 本地 seed
- `release/release-sync/release-patch/release-minor/release-major/release-version/release-commit` — 发布
- `setup-db/reset-db/reset-db-empty/fix-prisma` — 数据库管理

**验证**：
```bash
make help  # 应只显示保留的 target
```

### 阶段 3：删除 flow 目录

**目标**：彻底删除 flow 框架。

**变更**：
- 删除整个 `scripts/flow/` 目录
- 更新 `scripts/README.md`，移除所有 flow 相关内容
- 更新 `docs/RELEASE_GUIDE.md`，移除 flow 引用

**验证**：
```bash
grep -r "scripts/flow" apps/backend/  # 应无结果
make help
```

### 阶段 4：清理和全量验证

**验证**：
```bash
# 所有保留的 target
make help
make dev
make clean
make seed-minimal
make release TYPE=patch  # 走 release-cli，与 flow 无关

# 全文搜索无残留
grep -r "scripts/flow" apps/backend/
grep -r "FLOW_RUNNER\|FLOW_FROM\|FLOW_TO\|FLOW_ONLY\|FLOW_SKIP\|FLOW_DRY_RUN" apps/backend/
```

## 回滚策略

每个阶段独立 git commit。出问题时 `git revert <hash>` 即可。
flow 目录在阶段 3 才删除，之前可作为 fallback。

## 开放问题

1. **bootstrap-worktree.sh 是否保留？** — 用户是否仍使用 git worktree 开发？如果保留，需将其独立于 flow 之外。
2. **sync-version-releases.mjs 是否保留？** — 前端是否仍从数据库读取版本记录？如果是，保留；如果改为读 docs/changes/*.md，可以后续单独移除。
3. **CI/CD 迁移时机？** — 远程部署/运维操作需要在 GitHub Actions 中重新实现后，才能安全移除本地的对应 target。

## 文件变更清单

| 操作 | 文件 | 阶段 |
|------|------|------|
| 修改 | `apps/backend/Makefile` | 1, 2 |
| 删除 | `apps/backend/scripts/flow/` (整个目录) | 3 |
| 删除 | `apps/backend/scripts/dev/bootstrap-worktree.sh` | 1 (待确认) |
| 修改 | `apps/backend/scripts/README.md` | 3 |
| 修改 | `apps/backend/docs/RELEASE_GUIDE.md` | 3 |
