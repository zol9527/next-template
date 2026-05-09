# 安全相关脚本（Security Scripts）

本目录用于集中管理与安全相关的开发/测试脚本（如密码工具、MFA 测试与 E2E 用户准备）。

建议从项目根目录执行，例如：

- `node scripts/security/password/generate-password-hash.mjs`
- `node scripts/security/mfa/test-mfa-api.mjs`

说明：旧的 `scripts/*.mjs` 入口已移除，请统一使用本目录下的新路径。
