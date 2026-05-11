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
