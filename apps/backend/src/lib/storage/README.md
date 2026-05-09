# 存储模块

本模块提供对象存储服务的接口定义及多种实现，支持将文件存储在不同的对象存储服务商（如阿里云 OSS、腾讯云 COS）或本地文件系统中。

## 依赖

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `zod` | ^3.x | Schema 校验与类型推导 |
| `@asteasolutions/zod-to-openapi` | ^2.x | OpenAPI 文档生成 |
| `ali-oss` | ^6.x | 阿里云 OSS 官方 SDK |
| `@aws-sdk/client-s3` | ^3.x | AWS S3 客户端（腾讯云 COS 兼容 S3 协议） |
| `@aws-sdk/s3-request-presigner` | ^3.x | S3 预签名 URL 生成 |

### 安装命令

```bash
# 安装所有存储模块依赖
npm install zod @asteasolutions/zod-to-openapi ali-oss @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 或使用 pnpm
pnpm add zod @asteasolutions/zod-to-openapi ali-oss @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 或使用 yarn
yarn add zod @asteasolutions/zod-to-openapi ali-oss @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 按提供者安装

如果你只需要特定的存储提供者：

```bash
# 仅阿里云 OSS
npm install zod @asteasolutions/zod-to-openapi ali-oss

# 仅腾讯云 COS
npm install zod @asteasolutions/zod-to-openapi @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 仅本地存储（无需额外依赖，仅需 Node.js 内置模块）
npm install zod @asteasolutions/zod-to-openapi
```

## 功能特性

- **统一接口**：提供 `ObjectStorageProvider` 接口，支持多种存储后端无缝切换
- **上传策略**：支持生成预签名上传 URL（前端直传）
- **服务端上传**：支持服务端直接上传文件
- **文件管理**：支持文件删除、列出、搜索等操作
- **签名 URL**：支持生成带过期时间的访问链接

## 支持的存储提供者

| 提供者 | 标识符 | 说明 |
|--------|--------|------|
| 阿里云 OSS | `aliyun_oss` | 阿里云对象存储服务 |
| 腾讯云 COS | `tencent_cos` | 腾讯云对象存储服务（兼容 S3 协议） |
| 本地存储 | `local` | 本地文件系统存储 |

## 使用示例

```typescript
import { createStorage } from '@/lib/storage'

// 创建存储实例（根据环境变量自动选择提供者）
const storage = createStorage()

// 获取上传策略（前端直传）
const policy = await storage.issueUploadPolicy({
  contentType: 'image/jpeg',
  sizeBytes: 1024 * 1024,
  purpose: 'avatar'
})

// 服务端上传
const result = await storage.uploadFile({
  file: buffer,
  key: 'uploads/test.jpg',
  contentType: 'image/jpeg'
})

// 删除文件
await storage.deleteFile('uploads/test.jpg')
```
