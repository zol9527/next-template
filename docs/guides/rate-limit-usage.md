# Rate Limit 使用指南

## 功能概述

Rate Limit（限流）系统用于保护 API 和敏感操作免受滥用和攻击。系统支持：

- **动态配置**：通过数据库存储配置，支持运行时调整
- **多种策略**：IP、IP+标识符、IP+用户三种限流策略
- **白名单**：支持将特定用户排除在限流之外
- **分布式支持**：使用数据库存储，支持多实例部署
- **降级机制**：数据库不可用时自动降级到内存存储

## 配置管理

### 环境变量

在 `.env` 中配置：

```bash
# 是否信任反向代理的 IP 头
RATE_LIMIT_TRUST_PROXY=false

# 是否允许内网 IP
RATE_LIMIT_ALLOW_PRIVATE_IP=false

# 是否要求必须有 IP
RATE_LIMIT_REQUIRE_IP=true
```

### 默认配置

系统内置了以下默认配置（首次使用时自动创建到数据库）：

| 配置键 | 名称 | 限制 | 窗口 | 策略 | 说明 |
|--------|------|------|------|------|------|
| `auth.login` | 登录限流 | 5 次/分钟 | 60s | ip-identifier | 防止暴力破解 |
| `auth.wechat` | 微信登录限流 | 5 次/分钟 | 60s | ip | 防止微信接口滥用 |
| `auth.register` | 注册限流 | 3 次/小时 | 3600s | ip | 防止批量注册 |
| `public.swagger` | Swagger 文档限流 | 20 次/分钟 | 60s | ip | 防止文档接口滥用 |
| `docs.download` | 文档下载限流 | 10 次/分钟 | 60s | ip-user | 限制下载频率 |

### 策略说明

- **`ip`**：仅按 IP 地址限流
- **`ip-identifier`**：按 IP + 标识符（如用户名、邮箱）限流
- **`ip-user`**：按 IP + 用户 ID 限流

## API 使用

### 1. 查询配置列表

```bash
GET /api/v1/admin/rate-limit/config?enabled=true
```

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "key": "auth.login",
        "name": "登录限流",
        "description": "防止暴力破解",
        "limit": 5,
        "windowMs": 60000,
        "strategy": "ip-identifier",
        "enabled": true,
        "whitelist": ["user-123"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

### 2. 创建配置

```bash
POST /api/v1/admin/rate-limit/config
Content-Type: application/json

{
  "key": "api.custom",
  "name": "自定义 API 限流",
  "description": "限制自定义 API 的调用频率",
  "limit": 100,
  "windowMs": 60000,
  "strategy": "ip",
  "enabled": true,
  "whitelist": ["user-123", "user-456"]
}
```

### 3. 更新配置

```bash
PUT /api/v1/admin/rate-limit/config/auth.login
Content-Type: application/json

{
  "limit": 10,
  "windowMs": 120000
}
```

### 4. 切换启用状态

```bash
PATCH /api/v1/admin/rate-limit/config/auth.login
Content-Type: application/json

{
  "enabled": false
}
```

### 5. 删除配置

```bash
DELETE /api/v1/admin/rate-limit/config/auth.login
```

### 6. 白名单管理

添加用户到白名单：
```bash
POST /api/v1/admin/rate-limit/config/auth.login/whitelist
Content-Type: application/json

{
  "userId": "user-123"
}
```

从白名单移除用户：
```bash
DELETE /api/v1/admin/rate-limit/config/auth.login/whitelist
Content-Type: application/json

{
  "userId": "user-123"
}
```

## 在代码中使用

### 基础用法

```typescript
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { createRequestLogger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req)

  // 检查限流
  const result = await checkRateLimit({
    key: 'auth.login',
    identifier: requestBody.username, // 可选标识符
    userId: session?.userId,           // 可选用户 ID
    ip: getClientIp(req),
    nowMs: Date.now(),
  }, logger)

  if (!result.allowed) {
    return json(
      { error: 'Too many requests', retryAfter: result.retryAfter },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
    )
  }

  // 处理业务逻辑...
}
```

### 使用默认配置

如果配置键不存在于数据库，系统会使用默认配置（如果有的话）。建议为所有重要的 API 端点创建配置。

## 最佳实践

### 1. 选择合适的策略

| 场景 | 推荐策略 | 原因 |
|------|----------|------|
| 登录、注册 | `ip-identifier` | 防止单个 IP 尝试多个账号 |
| API 调用 | `ip-user` | 已登录用户按用户限流 |
| 公开接口 | `ip` | 简单按 IP 限流 |

### 2. 设置合理的限制

- **登录**：5 次/分钟（防止暴力破解）
- **注册**：3 次/小时（防止批量注册）
- **普通 API**：60-100 次/分钟
- **重度 API**：根据业务需求调整

### 3. 使用白名单

- 将测试用户添加到白名单，避免测试时触发限流
- 将 VIP 用户添加到白名单，提供更好的服务体验
- 白名单应谨慎使用，避免滥用

### 4. 监控和调整

- 定期检查限流日志，了解限流触发情况
- 根据业务发展调整限流参数
- 监控数据库中计数器的增长，定期清理过期数据

### 5. 生产环境配置

```bash
# 信任反向代理（如果使用 Nginx/Cloudflare）
RATE_LIMIT_TRUST_PROXY=true

# 禁止内网 IP
RATE_LIMIT_ALLOW_PRIVATE_IP=false

# 要求必须有 IP
RATE_LIMIT_REQUIRE_IP=true
```

## 故障排查

### 问题：所有请求都被限流

**原因**：无法获取客户端 IP

**解决方案**：
1. 检查 `RATE_LIMIT_REQUIRE_IP=false` 是否设置（不推荐）
2. 检查反向代理配置，确保转发 IP 头
3. 如果使用 Cloudflare，设置 `RATE_LIMIT_TRUST_PROXY=true`

### 问题：数据库连接失败时无法限流

**原因**：数据库不可用

**解决方案**：
- 系统会自动降级到内存限流
- 重启应用后内存限流生效
- 修复数据库连接后，系统自动恢复数据库限流

### 问题：白名单用户仍被限流

**原因**：白名单配置错误

**解决方案**：
- 检查白名单中的用户 ID 是否正确
- 检查策略是否支持用户白名单（`ip-user` 和 `ip-identifier` 支持）
- 确认配置已启用（`enabled=true`）

## 技术细节

### 架构

```
Request → Route Handler → checkRateLimit()
                              ↓
                         Service (业务逻辑)
                              ↓
                         Repository (数据访问)
                              ↓
                    Database (PostgreSQL/MySQL)
                              ↓
                         Fallback → Memory (降级)
```

### 数据清理

#### 定时清理任务（推荐）

系统提供了定时清理 API，建议配置定时任务定期执行：

**1. Vercel Cron Jobs（推荐用于 Vercel 部署）**

```bash
# 1. 复制 cron 配置文件
cp cron.yml.example vercel.json
# 或者在 Vercel 项目设置中配置 Cron Jobs

# 2. 设置环境变量
CRON_SECRET=your-random-secret-key

# 3. 配置 cron.yml（示例见项目根目录）
```

**2. 自托管 / 其他平台**

使用 cron 定期调用清理 API：

```bash
# crontab -e
# 每小时清理一次
0 * * * * curl -X POST https://your-domain.com/api/v1/internal/rate-limit/cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

**3. 应用内调度（开发环境）**

在应用启动时自动调度（见 `/api/v1/internal/rate-limit/cleanup/route.ts`）：

```typescript
import { scheduleCleanup } from '@/lib/utils/rate-limit'
import { createRequestLogger } from '@/lib/logger'

if (process.env.NODE_ENV === 'production') {
  const logger = createRequestLogger({
    traceId: 'system',
    method: 'SYSTEM',
    pathname: '/rate-limit-cleanup',
    ip: '127.0.0.1',
  })

  // 每小时清理一次
  scheduleCleanup(logger, 60 * 60 * 1000)
}
```

#### 手动清理

如需手动清理过期计数器：

```typescript
import { cleanupExpiredCounters } from '@/lib/utils/rate-limit'
import { createRequestLogger } from '@/lib/logger'

const logger = createRequestLogger({
  traceId: 'manual',
  method: 'SYSTEM',
  pathname: '/manual-cleanup',
  ip: '127.0.0.1',
})

const deleted = await cleanupExpiredCounters(logger)
console.log(`已清理 ${deleted} 条过期计数器`)
```

### 性能优化

- 使用数据库索引（`bucket_key`, `reset_at`）加速查询
- 计数器使用乐观锁避免并发冲突
- 支持多实例部署，共享计数器状态
