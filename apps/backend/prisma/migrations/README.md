# Prisma Migrations

当前目录只保留一套可执行迁移：

- `20260316220000_mysql_baseline`：MySQL 初始迁移，已包含当前完整表结构与 `nickname` 字段

## 使用约定

- 当前项目尚未正式发布，因此历史 SQLite 迁移已被移除
- 后续如果继续使用 Prisma Migrate，请在此基线之上新增 MySQL 迁移
- 当前部署脚本以 `scripts/db/prisma/setup.sh` 为主
