# 流式管道优化：Export / Import / Backup 内存治理

> 日期: 2026-05-08
> 状态: 已完成
> 范围: data-export, backup upload, db-restore, file-restore

---

## 背景与问题

当前系统中 4 个核心操作全部采用「**先整体加载到 Buffer 再处理**」的模式：

| 操作              | 文件                         | 内存峰值       | 风险场景             |
| ----------------- | ---------------------------- | -------------- | -------------------- |
| Export CSV        | `data-export.service.ts:412`  | CSV 全文大小   | 10 万行+ 导出        |
| Backup 上传       | `backup.service.ts:420`       | ZIP 文件大小   | 大数据库备份         |
| Restore DB        | `db-restore-engine.ts:111`    | 最大表 JSONL   | 含大表的备份恢复     |
| Restore Files     | `file-restore-engine.ts:110`  | 最大文件大小   | 含大文件的备份恢复   |

备份引擎本身（DB backup）已使用流式写入，但**导出、上传、恢复三个环节仍是全量 Buffer**。

## 目标

将所有操作改为 **Stream Pipeline** 模式：

```
之前: Source → Buffer(全量) → Destination
之后: Source → ReadableStream → Transform → WritableStream (零缓冲)
```

仅在存储后端为**本地文件系统**的场景下优化（当前项目只用 local storage）。

## 设计方案

### 1. Export CSV：流式写文件

**现状**：`streamPaginatedCsvToBuffer()` 用 `Buffer.concat(chunks)` 拼接全量 CSV，再整体 `uploadFile(Buffer)`。

**改造**：

新增 `streamPaginatedCsvToFile(writer, fetchPage, filePath)` 方法：

```
分页查询 → CSV 字符串 chunk → pipeline(Readable, createWriteStream(filePath))
```

- 替换 `streamPaginatedCsvToBuffer` 的调用处
- CSV chunk 直接 pipe 到 `fs.createWriteStream`
- 内存峰值 = 单页数据量（约 1000 行），不随总数据量增长
- `uploadFile` 步骤在本地存储下用 `copyFile` 或直接写目标路径

**涉及文件**：
- `src/services/core/data-export.service.ts` — 新增 `streamPaginatedCsvToFile`
- `src/services/core/data-export.service.ts` — 替换所有 `streamPaginatedCsvToBuffer` 调用

### 2. Backup 上传：已完成

本地存储已改为 `fs.copyFile(zipPath, destPath)`（上一轮修复完成）。

云存储分支仍保留 `fs.readFile` + `uploadFile(Buffer)`，待后续支持云存储时再优化为分片上传。

### 3. Restore DB：流式解压 JSONL + 逐行 INSERT

**现状**：`extractAndParseJsonl()` 将整表 JSONL 解压到 Buffer，`toString().split('\n')` 全量 parse 后批量 INSERT。

**改造**：

引入 `yauzl` 库进行流式 ZIP 读取：

```
yauzl.open(zipPath, { lazyEntries: true })
  → 逐 entry 获取 ReadableStream
  → entry.pipe(new JsonlLineReader())
  → 每 500 行批量 INSERT
  → 处理完毕 → zipfile.readEntry() 继续下一个
```

关键组件：
- **`StreamingZipReader`**：基于 `yauzl` 的封装类，提供 `open()` / `getEntry(name)` / `streamEntries()` 等异步 API
- **复用 `JsonlReader`**：现有的 `src/lib/backup/serializer.ts` 中 `JsonlReader.readRows()` 已支持 `AsyncIterable<string>` 流式读取

**涉及文件**：
- `src/lib/backup/streaming-zip-reader.ts` — **新增**，基于 yauzl 的流式 ZIP 读取器
- `src/lib/backup/db-restore-engine.ts` — `extractAndParseJsonl` 改为流式逐行处理
- `package.json` — 新增 `yauzl` 依赖

### 4. Restore Files：流式解压 + pipeline 写文件

**现状**：`extractFileFromZip()` 解压单个文件到 Buffer，`provider.uploadFile(Buffer)` 写入。

**改造**：

```
yauzl.openReadStream(entry)
  → pipeline(readStream, fs.createWriteStream(destPath))
```

- 本地存储：直接 pipe 到目标路径，零缓冲
- 保留 `extractFileFromZip` 用于小文件场景（如 manifest.json 读取）

**涉及文件**：
- `src/lib/backup/file-restore-engine.ts` — 改为流式写入

### 5. StreamingZipReader 设计

```typescript
// src/lib/backup/streaming-zip-reader.ts

export class StreamingZipReader {
  /** 打开 ZIP 文件 */
  static open(zipPath: string): Promise<StreamingZipReader>

  /** 获取所有 entry 名称列表 */
  listEntries(): string[]

  /** 判断 entry 是否存在 */
  hasEntry(name: string): boolean

  /** 流式读取指定 entry，返回 Readable */
  streamEntry(name: string): Promise<Readable>

  /** 读取小文件到 Buffer（manifest 等） */
  readEntryToBuffer(name: string): Promise<Buffer>

  /** 关闭 ZIP */
  close(): void
}
```

基于 `yauzl` 的 `{ lazyEntries: true }` 模式：
1. `open()` 时遍历所有 entry 收集名称列表（不读内容）
2. `streamEntry()` 通过 `openReadStream()` 获取指定 entry 的 Readable 流
3. 支持多次 `streamEntry()` 调用（yauzl 原生支持）

### 6. 内存保护策略

改造后的预期内存峰值：

| 操作         | 改造前          | 改造后            | 降幅        |
| ------------ | --------------- | ----------------- | ----------- |
| Export CSV   | CSV 全文        | ~1MB（单页）      | **99%+**    |
| Backup 上传  | ZIP 全文        | ~0（copyFile）    | **100%**    |
| Restore DB   | 最大表 JSONL    | ~50KB（500 行）   | **99%+**    |
| Restore Files| 最大文件        | ~64KB（流缓冲）   | **99%+**    |

保留 `checkMemoryLimit()`/`checkMemoryUsage()` 作为安全兜底，但阈值可配置（默认 1536MB）。

## 依赖变更

```bash
npm install yauzl
npm install -D @types/yauzl
```

`yauzl` 仅有 2 个运行时依赖（`buffer-crc32`, `pend`），周下载量 3400 万+，活跃维护。

## 改造清单

| #  | 任务                                         | 文件                                  | 复杂度 |
| -- | -------------------------------------------- | ------------------------------------- | ------ |
| 1  | 安装 yauzl + @types/yauzl                    | `package.json`                          | 低     |
| 2  | 新增 StreamingZipReader                      | `src/lib/backup/streaming-zip-reader.ts` | 中     |
| 3  | Export: 新增 streamPaginatedCsvToFile        | `data-export.service.ts`                | 中     |
| 4  | Export: 替换 streamPaginatedCsvToBuffer 调用 | `data-export.service.ts`                | 低     |
| 5  | Restore DB: 流式 JSONL + 逐批 INSERT        | `db-restore-engine.ts`                  | 高     |
| 6  | Restore Files: 流式解压 + pipeline 写入      | `file-restore-engine.ts`                | 中     |
| 7  | 单元测试更新                                 | `*.test.ts`                             | 中     |
| 8  | 浏览器端到端验证                             | —                                       | 低     |

## 风险与注意事项

1. **yauzl 回调风格**：yauzl 使用回调 API，需用 `util.promisify` 或手动包装为 Promise
2. **ZIP 格式兼容性**：yauzl 支持 zip64（>4GB 文件），但 STORE 方法需确认。当前备份引擎使用 STORE（无压缩），已确认 yauzl 兼容
3. **错误恢复**：流式处理中途失败时，需要确保已写入的部分数据被清理（临时文件）
4. **向后兼容**：保留 `extractFileFromZip` 用于小文件场景，不破坏现有接口
