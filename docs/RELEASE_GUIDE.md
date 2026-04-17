# 🚀 发布系统完整指南

> **文档说明**: 本文档整合了所有发布相关文档，涵盖配置、使用、原理和故障排查。
>
> **最后更新**: 2026-03-08
> **维护者**: @loyd

---

## 📑 目录

- [概述](#概述)
- [核心概念](#核心概念)
- [新旧流程对比](#新旧流程对比)
- [使用方法](#使用方法)
- [首次启用配置清单](#首次启用配置清单)
- [标准发布流程](#标准发布流程)
- [版本号控制](#版本号控制)
- [模块原理](#模块原理)
- [本地调试与演练](#本地调试与演练)
- [故障排查](#故障排查)
- [常见问题](#常见问题)

---

## 概述

### 模块目标

发布系统已从本地 Makefile/手动脚本切换为 **GitHub Actions 驱动** 的自动化流程，统一以下能力：

1. ✅ 自动计算版本号
2. ✅ 自动生成 changelog 文件
3. ✅ 自动更新 package.json 版本镜像
4. ✅ 自动创建 Git tag
5. ✅ 自动创建 GitHub Release
6. ✅ 保留将 docs/changes 同步到数据库的能力
7. ✅ 通过 GitHub Environment 提供发布审批闸门
8. ✅ 自动上传构建产物并部署到生产服务器

### 发布触发路径

标准路径只有一条：

```
feature/* -> dev -> release
```

其中真正触发发版的动作，是 **dev 或 hotfix/\* 合并进 release**。

---

## 核心概念

### 版本真源

当前实现中，**版本真源是 Git tag**。

- `package.json` 里的 `version` 是镜像，不再是独立真源
- 原来的 `VERSION` 文件已经被移除

### 数据流

```
PR 元数据和提交记录
  → version.mjs / prepare.mjs
  → docs/changes、package.json
  → 提交到 dev 分支
  → PR 合并到 release 分支
  → changelog.mjs 即时生成 CHANGELOG.md / RELEASE_NOTES.md
  → deploy job 构建部署包
  → 上传到生产服务器
  → sync-version.mjs 将 docs/changes 写入数据库
```

---

## 新旧流程对比

### ❌ 旧流程（已废弃）

```
1. dev 分支创建 PR → release
2. PR 合并
3. Actions 在 release 分支生成文件并 commit ❌
   - docs/changes/*.md
   - CHANGELOG.md
   - RELEASE_NOTES.md
   - package.json
4. dev 分支没有这些文件 ❌
5. ❌ 分支不一致！
```

**问题**: GitHub Actions 在 release 分支自动生成发布文件并 commit，导致 dev 和 release 分支不一致。

### ✅ 新流程（当前实现）

```
1. 在 dev 分支只生成可合并的发布源文件 ✅
   - 计算/指定版本号
   - 生成 docs/changes/*.md
   - 更新 package.json 版本号
   - 提交到 dev 分支
2. 推送 dev 分支到远程 ✅
3. 创建 PR: dev → release（只包含 docs/changes 与 package.json）✅
4. 等待 CI 检查和 Environment 审批 ✅
5. 合并 PR ✅
6. Actions 基于 docs/changes 即时生成 CHANGELOG.md 和 RELEASE_NOTES.md，随后创建 tag 和 GitHub Release ✅
7. 自动部署到生产环境 ✅
8. 部署成功后独立同步版本记录到数据库 ✅
9. ✅ dev 和 release 分支保持一致！
```

### 新流程优势

#### 1. 分支一致性
- ✅ dev 和 release 分支内容完全一致
- ✅ 不再因为 CHANGELOG.md / RELEASE_NOTES.md 发生同文件冲突
- ✅ 回滚或同步更容易

#### 2. 可审查性
- ✅ 发布文件在 PR 中可见
- ✅ 可以在 PR 界面直接审查 CHANGELOG 和 RELEASE_NOTES
- ✅ 发现错误可以在合并前修改

#### 3. 透明度
- ✅ 版本号在 dev 分支确定
- ✅ 不依赖 GitHub Actions 自动计算
- ✅ 发布时间点更清晰

#### 4. 灵活性
- ✅ 可以手动调整发布文件
- ✅ 可以多次执行 `release:prepare` 而不影响 release 分支
- ✅ 支持手动指定版本号

---

## 使用方法

### 方法 1：使用 `/release` 命令（推荐）

```bash
# 在 Claude Code 中执行
/release

# 带参数
/release --type minor
/release --version 1.2.0
/release --title "feat: 发布用户管理模块 v2.0"
```

命令会自动：
1. 计算下一个版本号
2. 生成所有发布文件
3. 提交到 dev 分支
4. 创建 PR 到 release 分支

### 方法 2：使用 `bun run release:prepare` 脚本

```bash
# 自动计算 patch 版本
bun run release:prepare

# 指定 minor 版本
bun run release:prepare -- --type minor

# 指定 major 版本
bun run release:prepare -- --type major

# 精确指定版本号
bun run release:prepare -- --version 1.2.0

# 自定义标题
bun run release:prepare -- --title "feat: 发布用户管理模块 v2.0"
```

**该命令会自动执行**：
1. ✅ 计算版本号（基于最新 tag）
2. ✅ 获取变更清单（从上次 tag 到当前，自动过滤 docs）
3. ✅ 生成 `docs/changes/YYYY-MM-DD-vX.Y.Z.md`
4. ✅ 更新 `package.json` 版本号
5. ✅ Git commit 源文件到 dev 分支
6. ✅ 在 release workflow 中即时生成 `CHANGELOG.md` 与 `RELEASE_NOTES.md`

**执行后下一步**：
```bash
# 推送到远程
git push origin dev

# 创建 PR 到 release 分支
gh pr create --base release --head dev \
  --title "🔧 chore: 准备 vX.Y.Z 发布" \
  --body "## 📝 版本信息
- 版本号: X.Y.Z

## 📦 本次更新内容
[自动生成的变更清单]
"
```

---

## 首次启用配置清单

> **重要**: 以下配置是这套发布流程的前置条件，不是建议项。

### 快速检查清单

```
□ [GitHub] 创建 release 分支
□ [GitHub] 配置 release 分支保护规则
□ [GitHub] 创建 production Environment
□ [GitHub] 设置变量 RELEASE_ENVIRONMENT
□ [GitHub] 配置 Actions 写权限
□ [GitHub] 配置部署 Secrets (7个)
□ [GitHub] 配置 workflow 回写权限
□ [服务器] 安装运行时依赖 (bun/unzip/node/pm2)
□ [服务器] 创建部署目录
□ [服务器] 配置 .env 环境变量
□ [服务器] 配置 SSH 访问权限
□ [本地] 准备 SSH 密钥对
□ [本地] 验证 act 演练通过
```

### 一、GitHub 仓库配置

#### 1.1 创建 `release` 分支

```bash
git checkout dev
git pull --ff-only origin dev
git checkout -b release
git push origin release
```

#### 1.2 配置 `release` 分支保护规则

**路径**: `Settings → Branches → Add branch ruleset`

| 配置项 | 值 |
|--------|-----|
| 目标分支模式 | `release` |
| 禁止直接 push | ✅ 启用 |
| 必须通过 PR 合并 | ✅ 启用 |
| 等待状态检查通过 | ✅ 启用 |
| 状态检查 | 添加 `CI / validate` |

#### 1.3 创建 `production` Environment

**路径**: `Settings → Environments → New environment`

| 配置项 | 值 |
|--------|-----|
| 名称 | `production` |
| Required reviewers | 添加审批人 GitHub 用户名 |
| Prevent self-review | 可选，避免自审 |
| Wait timer | 可选，延时发布 |
| Deployment branches | 可选，限制只有 `release` 分支可部署 |

#### 1.4 配置仓库变量

**路径**: `Settings → Secrets and variables → Actions → Variables`

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `RELEASE_ENVIRONMENT` | `production` | Environment 名称 |
| `DEPLOY_NODE_VERSION` | `20` (可选) | 服务器 Node 版本 |

#### 1.5 配置 Actions 权限

**路径**: `Settings → Actions → General → Workflow permissions`

选择：`Read and write permissions`

> **原因**: workflow 需要创建 tag、release 和推送生成文件。

#### 1.6 配置 workflow 回写权限

发布流程会自动提交以下生成文件到 `release` 分支：
- `package.json`
- `CHANGELOG.md`
- `RELEASE_NOTES.md`
- `docs/changes/*.md`

**方案一（推荐）**: 分支规则允许 `github-actions[bot]` 写回 `release`

**方案二**: 配置 `RELEASE_BOT_TOKEN` secret（需要 `contents: write` 权限）

#### 1.7 配置部署 Secrets

**路径**: `Settings → Secrets and variables → Actions → Secrets`

| Secret | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `SERVER_HOST` | ✅ | 生产服务器地址 | `192.168.1.100` 或 `api.example.com` |
| `SERVER_USER` | ✅ | SSH 用户名 | `ubuntu` 或 `deploy` |
| `SERVER_PORT` | ✅ | SSH 端口 | `22` |
| `SERVER_PATH` | ✅ | 应用部署目录 | `/var/www/edu-mini-app` |
| `SSH_PRIVATE_KEY` | ✅ | SSH 私钥（用于 GitHub Actions 登录） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_KNOWN_HOSTS` | ✅ | 服务器指纹 | `ssh-keyscan -H your-host` 的输出 |
| `APP_URL` | ✅ | 线上访问地址（用于健康检查） | `https://your-domain.com` |

**生成 SSH 密钥对**:

```bash
# 生成专用部署密钥（推荐 ED25519）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/edu-mini-app-deploy

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/edu-mini-app-deploy.pub user@your-server

# 将私钥内容复制到 GitHub Secret
cat ~/.ssh/edu-mini-app-deploy
# 复制输出内容到 SSH_PRIVATE_KEY

# 生成 known_hosts
ssh-keyscan -H your-server-host
# 复制输出内容到 SSH_KNOWN_HOSTS
```

### 二、服务器配置

#### 2.1 安装运行时依赖

```bash
# Node.js (版本需与项目要求一致)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Bun (必需)
curl -fsSL https://bun.sh/install | bash

# PM2 (进程管理，必需)
sudo npm install -g pm2

# unzip (解压部署包，必需)
sudo apt-get install -y unzip
```

#### 2.2 创建部署目录

```bash
# 创建目录
sudo mkdir -p /var/www/edu-mini-app

# 授权给部署用户
sudo chown $USER:$USER /var/www/edu-mini-app
```

#### 2.3 配置环境变量

在服务器上创建 `.env` 文件：

```bash
# 路径: /var/www/edu-mini-app/.env
```

**必须包含的配置**:

```env
# 数据库
DATABASE_PROVIDER=prisma
DATABASE_URL="mysql://user:password@localhost:3306/edu_mini_app"

# JWT
JWT_SECRET="your-jwt-secret-at-least-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-at-least-32-chars"

# OSS (二选一)
OSS_PROVIDER="aliyun"  # 或 "tencent"
ALIYUN_OSS_ACCESS_KEY_ID="your-key-id"
ALIYUN_OSS_ACCESS_KEY_SECRET="your-key-secret"
ALIYUN_OSS_BUCKET="your-bucket"
ALIYUN_OSS_REGION="oss-cn-hangzhou"

# 微信小程序
WECHAT_APPID="your-appid"
WECHAT_SECRET="your-secret"

# 其他业务配置...
```

> **重要**: `.env` 文件不会被部署流程覆盖，需要手动维护。

#### 2.4 服务器目录结构

部署后的目录结构：

```
/var/www/edu-mini-app/
├── .env                    # 环境变量（不会被覆盖）
├── logs/                   # 日志目录（不会被覆盖）
├── uploads/                # 上传文件（不会被覆盖）
├── deploy.zip              # 部署包（临时）
├── package.json
├── ecosystem.config.cjs    # PM2 配置
└── ...其他应用文件
```

---

## 标准发布流程

### 1. 日常开发合入 dev

```bash
git checkout -b feature/example
git commit -m "feat: 新增示例功能"
gh pr create --base dev --head feature/example --title "feat: 新增示例功能"
```

### 2. 发起发布 PR

#### 方式 A: 使用 `/release` 命令（推荐）

```bash
/release
```

#### 方式 B: 手动执行

```bash
# 1. 生成发布文件
bun run release:prepare  # 或指定版本: -- --type minor/major

# 2. 推送 dev 分支
git push origin dev

# 3. 创建 PR
gh pr create --base release --head dev \
  --title "🔧 chore: 准备 vX.Y.Z 发布" \
  --body "## 📝 版本信息
- 版本号: X.Y.Z

## 📦 本次更新内容
[查看自动生成的变更清单]
"
```

#### Hotfix 流程

```bash
# 从 release 开 hotfix 分支
git checkout release
git checkout -b hotfix/fix-critical-bug

# 修复后提交 PR 到 release
gh pr create --base release --head hotfix/fix-critical-bug --title "fix: 发布热修复"
```

### 3. PR Body 格式要求

**⚠️ 重要**：PR Body 必须包含版本号，格式如下：

```markdown
## 📝 版本信息
- 版本号: X.Y.Z

## 📦 本次更新内容
[变更内容]

## 📋 变更清单
[提交记录]

## ✅ 测试计划
- [ ] CI 检查通过
- [ ] 代码审查完成
```

**格式要求**：
- ✅ 正确：`- 版本号: 1.2.0`
- ✅ 正确：`- 版本号：1.2.0`（中文冒号）
- ✅ 正确：`- version: 1.2.0`
- ❌ 错误：`**版本号**: 1.2.0`（Markdown 加粗语法会导致识别失败）

### 4. 合并 PR 后自动执行

workflow 会按以下顺序执行：

1. 进入 `production` environment，等待审批
2. 审批通过后验证发布文件存在
3. 创建或更新 Git tag
4. 创建或更新 GitHub Release
5. 构建部署包并上传到服务器
6. 远端执行依赖安装、Prisma 同步、版本同步和 PM2 重载
7. 对 `APP_URL/api/health` 发起健康检查

---

## 版本号控制

默认采用自动计算，同时保留精确控制能力。

### 优先级（从高到低）

1. **手动指定**：`--version 1.2.0`（最高优先级）
2. **PR Body 中的版本号**：`- 版本号: 1.2.0`
3. **PR labels**：`version:major` / `version:minor` / `version:patch`
4. **提交记录分析**：`feat` 触发 minor，`fix` 触发 patch，破坏性变更触发 major
5. **默认 patch**

### 示例

```bash
# 当前版本: 0.1.0

bun run release:prepare                    # → 0.1.1 (patch)
bun run release:prepare -- --type minor    # → 0.2.0 (minor)
bun run release:prepare -- --type major    # → 1.0.0 (major)
bun run release:prepare -- --version 2.5.0 # → 2.5.0 (指定)
```

### PR Body 精确指定版本号

```markdown
## 发布说明
- 版本号: 1.4.0
```

### Label 强制版本类型

```bash
gh pr edit --add-label "version:minor"
```

---

## 模块原理

### 当前实现组成

#### 1. CI 校验工作流

**文件**: `.github/workflows/ci.yml`

**职责**:
- 在 PR 指向 dev 或 release 时运行
- 执行 bun install、lint、单元测试、build
- 这是发布前的质量门禁

#### 2. 发布工作流

**文件**: `.github/workflows/release.yml`

**职责**:
- 只在 PR 合并到 release 时触发
- 只接受 dev 或 hotfix/* 作为源分支
- 先进入 production environment 等待审批
- 审批通过后验证文件、创建 tag 和 GitHub Release
- 构建部署包并上传到生产服务器
- 执行健康检查

#### 3. 版本计算脚本

**文件**: `scripts/release/version.mjs`

**职责**:
- 读取 package.json 当前版本或最近的 Git tag 作为基线
- 按优先级解析 PR Body、label 和提交记录
- 输出最终版本号、上一个 tag、版本来源等信息

#### 4. Changelog 生成脚本

**文件**: `scripts/release/changelog.mjs`

**职责**:
- 读取本次发布涉及的提交记录
- 将提交归类为新增功能、问题修复、优化改进、破坏性变更
- 生成 `docs/changes/YYYY-MM-DD-vX.Y.Z.md`
- 生成或更新 `CHANGELOG.md`
- 生成 `RELEASE_NOTES.md`
- 更新 `package.json` 的 version 字段

#### 5. 发布准备脚本

**文件**: `scripts/release/prepare.mjs`

**职责**:
- 在 dev 分支生成所有发布文件
- 计算版本号
- 获取变更清单（从上次 tag 到当前，自动过滤 docs）
- Git commit 所有变更

**关键优化**:
- ✅ 只获取从上次 tag 到当前的提交（CHANGELOG 不会无限增长）
- ✅ 自动过滤 docs 相关的提交（文档更新不应该出现在 release notes 中）

#### 6. 数据库同步脚本

**文件**: `scripts/release/sync-version.mjs`

**职责**:
- 扫描 docs/changes 下的 changelog 文件
- 跳过 `_template.md`
- 解析 frontmatter 和正文
- 使用 upsert 将版本写入 VersionRelease 表

### 生成的文件

#### `docs/changes/YYYY-MM-DD-vX.Y.Z.md`

```markdown
---
version: "0.1.2"
title: "发布新版本"
releasedAt: "2026-03-08T12:00:00.000Z"
pr: 139
prUrl: https://github.com/...
---

## 新增功能
- ✨ feat: 新功能 1
- ✨ feat: 新功能 2

## 问题修复
- 🐛 fix: 修复 bug 1
```

#### `CHANGELOG.md`（workflow 生成产物，不进入 git）

```markdown
# Changelog

## [0.1.2] - 2026-03-08

### 发布新版本

详见: [docs/changes/2026-03-08-v0.1.2.md](./docs/changes/2026-03-08-v0.1.2.md)

---

## [0.1.1] - 2026-03-07
...
```

#### `RELEASE_NOTES.md`（workflow 生成产物，不进入 git）

```markdown
# Release v0.1.2

**发布日期**: 2026年3月8日

**版本标题**: 发布新版本

**Pull Request**: [#139](https://github.com/...)

---

## ✨ 新增功能
[变更列表]

## 🐛 问题修复
[变更列表]
```

---

## 本地调试与演练

### 本地调试脚本

这些脚本主要供 workflow 调用，也可以本地单独验证：

```bash
# 预览版本计算
bun run release:version -- --labels-json '["version:minor"]'

# 基于 docs/changes 重新生成聚合发布文件
bun run release:changelog -- --version 0.2.0 --pr-title "feat: 新增示例功能"

# 将 docs/changes 同步到数据库
bun run release:sync
```

### 使用 act 做无副作用演练

如果你的目标是先验证 release workflow 的 Git 逻辑、构建产物与 artifact 上传，而不是立刻真实发布，推荐使用 `workflow_dispatch + dry_run`。

这种模式有两个特点：
1. 会真实使用 `docs/changes/*.md` 生成 `CHANGELOG.md`、`RELEASE_NOTES.md`
2. 不会执行 push、tag、GitHub Release，也不会执行真实 SSH 部署

#### 1. 安装 act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

#### 2. 准备本地 event 文件

仓库已提供示例文件：`.github/act/release-dry-run.event.json`

你可以直接按需修改其中的标题、版本说明和分支参数。

#### 3. 运行 release 演练

```bash
act workflow_dispatch \
  -W .github/workflows/release.yml \
  -e .github/act/release-dry-run.event.json \
  -j release \
  --artifact-server-path .act-artifacts
```

这个 job 会验证：
1. 版本号计算
2. changelog 生成
3. 将要提交的 Git 变更预览
4. release notes artifact 上传

#### 4. 运行部署包演练

```bash
act workflow_dispatch \
  -W .github/workflows/release.yml \
  -e .github/act/release-dry-run.event.json \
  -j deploy-package \
  --artifact-server-path .act-artifacts
```

这个 job 会验证：
1. 安装依赖
2. `prisma generate`
3. `make pack`
4. `deploy.zip` artifact 上传
5. 压缩包内容预览

#### 5. 查看 act 上传结果

```bash
ls -R .act-artifacts
```

---

## 故障排查

### Workflow 无法推送 release 生成文件

**原因**:
1. release 分支保护阻止 GitHub Actions 推送
2. 未配置 `RELEASE_BOT_TOKEN`
3. Actions 权限不允许 `contents: write`

**解决方案**:
1. 检查 release 分支保护规则
2. 允许 `github-actions[bot]` 或配置 `RELEASE_BOT_TOKEN`
3. 确认 Actions 权限设置为 `Read and write permissions`

### Workflow 一直停在 approval

**原因**:
1. 未创建名为 `production` 的 environment
2. 未配置变量 `RELEASE_ENVIRONMENT=production`
3. environment 未配置 `Required reviewers`
4. 审批人未在 GitHub 页面点击批准

**解决方案**:
1. 检查是否已创建 production environment
2. 检查 environment 配置的 Required reviewers
3. 通知审批人在 GitHub 页面完成批准

### 版本号不符合预期

**原因**:
1. PR Body 意外指定了版本号
2. PR labels 包含 `version:*`
3. 提交记录包含 `feat:`、`fix:`、`feat!:` 或 `BREAKING CHANGE`
4. 意外遗漏了控制版本的 label

**解决方案**:
1. 检查 PR Body 是否显式指定了版本号
2. 检查 PR labels
3. 检查提交记录是否包含版本关键字

### Tag 创建失败

**原因**: tag 已存在

**解决方案**:
```bash
# 查看现有 tag
git tag -l

# 如需删除远程 tag（谨慎操作）
git push --delete origin v0.1.2
```

### 自动部署失败

**原因**:
1. Secrets 配置错误
2. SSH 密钥不匹配
3. 服务器缺少依赖
4. `.env` 文件不存在

**解决方案**:
1. 检查 `SERVER_HOST`、`SERVER_USER`、`SERVER_PORT`、`SERVER_PATH` 是否配置正确
2. 检查 `SSH_PRIVATE_KEY` 和 `SSH_KNOWN_HOSTS` 是否与目标服务器匹配
3. 确认服务器已安装 bun、unzip、pm2
4. 确认服务器上存在 `.env` 文件

### 数据库未更新版本记录

**原因**:
1. deploy job 未执行到 `Deploy to production server`
2. 服务器上的 `.env` 无法连接业务数据库
3. `VersionRelease` 表不存在

**解决方案**:
1. 检查 deploy job 执行状态
2. 检查服务器 `.env` 中的 `DATABASE_URL`
3. 确认 `docs/changes/` 中存在对应版本文件

### Act 本地演练时不希望污染 Git

**解决方案**:

优先使用 `workflow_dispatch` 的 dry-run 模式。

如果还想进一步隔离当前工作区，可以在临时 worktree 中运行：

```bash
git worktree add ../edu-mini-app-release-preview release
cd ../edu-mini-app-release-preview
act workflow_dispatch \
  -W .github/workflows/release.yml \
  -e .github/act/release-dry-run.event.json \
  -j release \
  --artifact-server-path .act-artifacts
```

---

## 常见问题

### Q1: 如果多次执行 `release:prepare` 会怎样？

**答**：每次执行都会重新生成发布文件。由于是基于最新 tag 计算版本号，不会重复。

```bash
# 第一次执行（生成 v0.1.1）
bun run release:prepare

# 发现需要再添加一个 commit
git commit --amend

# 再次执行（仍然是 v0.1.1，但内容更新了）
bun run release:prepare
```

### Q2: 如何回退到旧流程？

**答**：不建议回退，但如果确实需要：

1. 恢复 `.github/workflows/release.yml` 到之前的版本
2. 移除 `scripts/release/prepare.mjs`
3. 删除 `package.json` 中的 `release:prepare` 脚本

### Q3: docs 相关的提交会出现在 CHANGELOG 吗？

**答**：不会。脚本会自动过滤掉 `docs:`、`documentation`、`readme` 等文档相关的提交，只保留功能性变更。

### Q4: 如果忘记在 PR Body 中指定版本号怎么办？

**答**：GitHub Actions 会从 `package.json` 读取版本号，所以不受影响。但建议仍然在 PR Body 中包含版本号，便于人工审查。

### Q5: 发布文件是否可以手动修改？

**答**：可以。在执行 `bun run release:prepare` 后，可以手动调整生成的文件，然后再 commit。

---

## 相关文档

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南
- [architecture/](./architecture/) - 架构文档
- [plans/](./plans/) - 设计与讨论记录

---

## 参考资料

- [版本控制最佳实践](https://semver.org/lang/zh-CN/)
- [Git Flow 工作流程](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [GitHub Actions 文档](https://docs.github.com/zh/actions)

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-08
**维护者**: @loyd
