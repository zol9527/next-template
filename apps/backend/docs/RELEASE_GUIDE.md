# 发布系统指南

> 最后更新: 2026-05-02
> 当前唯一推荐入口: `make release`

## 概述

当前发布系统采用“两阶段”模型：

1. 本地通过 `make release` 准备发布源文件。
2. `dev` 或 `hotfix/*` 合并到 `release` 后，由 GitHub Actions 完成正式发布和部署。

这套模型的目标是：

- 版本号有唯一真源。
- 发布说明可进入 PR 审查。
- 本地准备与线上正式发布职责分离。
- 文档、脚本、命令入口保持一致。

## 核心概念

### 版本真源

唯一真源是 `Git tag`。

- `package.json.version` 是镜像字段。
- 本地没有可用 tag 时，会临时回退到 `package.json.version` 作为计算基线。
- 不再使用 `VERSION` 文件。

### 发布源文件

本地发布只会准备两类源文件：

- `docs/changes/YYYY-MM-DD-vX.Y.Z.md`
- `package.json`

`CHANGELOG.md` 和 `RELEASE_NOTES.md` 属于 workflow 生成产物，不再作为本地发布输入。

### 职责边界

- `make release`
  - 校验分支、工作区、依赖
  - 计算目标版本
  - 生成 `docs/changes/*.md`
  - 同步 `package.json.version`
  - 生成发布提交
  - 可选 push 和创建 PR
- GitHub Actions
  - 基于合并后的发布源文件创建 tag、GitHub Release 和部署
- `make release-sync`
  - 把 `docs/changes` 中的版本记录同步到数据库

## 标准流程

### 日常开发

```bash
git checkout -b feature/example
git commit -m "✨ feat(core): 新增示例功能"
gh pr create --base dev --head feature/example --title "✨ feat(core): 新增示例功能"
```

### 准备发布

在 `dev` 或 `hotfix/*` 分支执行：

```bash
make release
```

常见变体：

```bash
make release TYPE=minor
make release TYPE=major
make release VERSION=1.2.3
make release RELEASE_TITLE="发布用户管理模块"
make release RELEASE_CREATE_PR=1 RELEASE_PUSH=1
```

执行成功后，你会得到：

- 新的 `docs/changes/*.md`
- 更新后的 `package.json.version`
- 一条本地发布提交

### 合并到 release

将发布提交推送并创建 PR：

```bash
git push origin dev
gh pr create --base release --head dev --title "🔧 chore(release): 准备 vX.Y.Z 发布"
```

PR 合并后，由 GitHub Actions 执行：

1. 等待 `production` environment 审批。
2. 校验发布文件。
3. 创建 Git tag。
4. 创建 GitHub Release。
5. 打包并部署。
6. 执行健康检查。

### 同步数据库版本记录

```bash
make release-sync
```

默认行为是安全的：

- 只做 upsert
- 不会删除数据库中的历史版本记录

只有在显式需要清理脏数据时，才执行：

```bash
node scripts/release/sync-version-releases.mjs --prune
```

## 命令说明

### `make release`

支持参数：

- `TYPE=patch|minor|major`
- `VERSION=1.2.3`
- `RELEASE_TITLE="发布标题"`
- `RELEASE_CREATE_PR=1`
- `RELEASE_PUSH=1`
- `RELEASE_BASE_BRANCH=release`
- `ALLOW_DIRTY=1` 仅用于调试，不建议日常使用

默认行为：

```bash
make release
```

等价于：

- 使用 `patch` 规则计算版本
- 生成 changelog 源文件
- 同步 `package.json.version`
- 自动创建本地发布提交
- 不自动 push
- 不自动创建 PR

### 兼容别名

保留了以下兼容命令：

```bash
make release-patch
make release-minor
make release-major
make release-version V=1.2.3
```

它们最终都会走 `make release` 的统一 flow。

### `make release-sync`

```bash
make release-sync
```

作用：

- 扫描 `docs/changes/*.md`
- 解析 frontmatter 和正文
- upsert 到 `VersionRelease` 表

## 实现组成

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

### release-cli 配置

相关文件：

- `.release.yml`
- `scripts/release-version-hook.py`

职责：

- 从最新 Git tag 计算版本基线
- 生成 `docs/changes` 发布说明
- 在 hook 中同步 `package.json.version`

## 使用前检查

执行 `make release` 前，应确认：

- 当前分支是 `dev` 或 `hotfix/*`
- 工作区干净
- 本地安装了 `release-cli`
- 如果要自动建 PR，本地安装了 `gh`
- 仓库已有正确的发布 tag；如果没有，确认 `package.json.version` 可作为初始化基线

## 故障排查

### 报错“detached HEAD”

原因：

- 当前不在真实分支上

解决：

```bash
git switch dev
```

### 报错“工作区存在未提交变更”

原因：

- 发布预检要求干净工作区，避免把无关修改带进发布提交

解决：

- 先提交或清理当前变更
- 仅调试时可用 `ALLOW_DIRTY=1`

### 报错“目标 Tag 已存在”

原因：

- 目标版本已经发布过

解决：

- 改用更高版本
- 或检查版本计算基线是否正确

### 报错“疑似已有待发布版本”

原因：

- `package.json.version` 已高于最新 tag
- 或 `docs/changes` 已存在当前待发布版本文件

解决：

- 先完成当前待发布版本
- 或显式指定 `VERSION=...`

### `make release-sync` 想删除旧记录

默认不会删除旧记录。确实需要清理时：

```bash
node scripts/release/sync-version-releases.mjs --prune
```

### 自动建 PR 失败

检查：

- 是否安装了 `gh`
- 是否已经登录 `gh auth login`
- `RELEASE_PUSH=1` 时是否有远程推送权限

## 验证建议

推荐每次改动发布系统后，至少验证：

```bash
make help
```

如果要做真实演练，建议在临时分支或临时 clone 中执行：

```bash
git switch dev
make release TYPE=patch
```

## 相关文件

- [Makefile](../Makefile)
- [README.md](../README.md)
- [scripts/README.md](../scripts/README.md)
