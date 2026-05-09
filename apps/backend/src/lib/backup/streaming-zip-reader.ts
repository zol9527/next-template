/**
 * 流式 ZIP 读取器
 *
 * 基于 yauzl 库的封装类，提供流式 ZIP 读取能力。
 * 相比 integrity-check.ts 中 extractFileFromZip 的全量 Buffer 模式，
 * StreamingZipReader 支持逐 entry 流式读取，内存峰值仅取决于单次处理的 entry 大小。
 *
 * 设计要点：
 *   - open() 时使用 lazyEntries 模式遍历所有 entry，仅收集元数据（不读内容）
 *   - streamEntry() 通过 openReadStream 获取指定 entry 的 Readable 流
 *   - 支持 autoClose: false 以支持多次 streamEntry 调用
 *   - 手动 close() 释放资源
 */

import type { Readable } from "node:stream";

import * as yauzl from "yauzl";

// ─── 类型定义 ───────────────────────────────────────────

/** ZIP 文件中的条目元数据 */
export interface ZipEntryMeta {
  /** 文件名（含路径，如 "tables/users.jsonl"） */
  fileName: string;
  /** 压缩后大小（字节） */
  compressedSize: number;
  /** 解压后大小（字节） */
  uncompressedSize: number;
  /** 是否为目录（文件名以 / 结尾） */
  isDirectory: boolean;
}

// ─── 工具函数 ───────────────────────────────────────────

/**
 * 将 yauzl 的回调式 API 包装为 Promise
 *
 * @param fn - 接受回调的函数
 * @returns Promise 化的结果
 */
function promisifyCallback<T>(fn: (cb: (err: Error | null, result: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// ─── StreamingZipReader ────────────────────────────────

/**
 * 流式 ZIP 读取器
 *
 * 用法：
 * ```typescript
 * const reader = await StreamingZipReader.open('/path/to/backup.zip');
 * try {
 *   // 检查 entry 是否存在
 *   if (reader.hasEntry('manifest.json')) {
 *     const manifest = await reader.readEntryToBuffer('manifest.json');
 *   }
 *   // 流式读取大文件
 *   if (reader.hasEntry('tables/users.jsonl')) {
 *     const stream = await reader.streamEntry('tables/users.jsonl');
 *     // pipe 到目标...
 *   }
 * } finally {
 *   reader.close();
 * }
 * ```
 */
export class StreamingZipReader {
  private zipfile: yauzl.ZipFile;
  private entries: Map<string, yauzl.Entry>;

  private constructor(zipfile: yauzl.ZipFile, entries: Map<string, yauzl.Entry>) {
    this.zipfile = zipfile;
    this.entries = entries;
  }

  // ─── 静态工厂方法 ───────────────────────────────────

  /**
   * 打开 ZIP 文件并收集所有 entry 元数据
   *
   * 使用 lazyEntries 模式遍历 entry，仅收集名称和元信息，不读取文件内容。
   * 内部使用 autoClose: false 以支持后续多次 streamEntry 调用。
   *
   * @param zipPath - ZIP 文件的绝对路径
   * @returns StreamingZipReader 实例
   * @throws ZIP 文件不存在或格式错误时抛错
   */
  static async open(zipPath: string): Promise<StreamingZipReader> {
    const zipfile = await promisifyCallback<yauzl.ZipFile>((cb) => {
      yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, cb);
    });

    const entries = new Map<string, yauzl.Entry>();

    // 遍历所有 entry，收集元数据（不读取内容）
    await new Promise<void>((resolve, reject) => {
      zipfile.on("entry", (entry: yauzl.Entry) => {
        // 跳过目录 entry（以 / 结尾）
        if (!/\/$/.test(entry.fileName)) {
          entries.set(entry.fileName, entry);
        }
        // 继续读取下一个 entry
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        resolve();
      });

      zipfile.on("error", (err: Error) => {
        reject(err);
      });

      // 启动 lazyEntries 读取
      zipfile.readEntry();
    });

    return new StreamingZipReader(zipfile, entries);
  }

  // ─── 查询方法 ───────────────────────────────────────

  /**
   * 获取所有 entry 名称列表
   *
   * @returns 文件名数组（不含目录 entry）
   */
  listEntries(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * 判断指定名称的 entry 是否存在
   *
   * @param name - entry 文件名（含路径，如 "tables/users.jsonl"）
   */
  hasEntry(name: string): boolean {
    return this.entries.has(name);
  }

  /**
   * 获取指定 entry 的元数据
   *
   * @param name - entry 文件名
   * @returns 元数据，不存在时返回 undefined
   */
  getEntryMeta(name: string): ZipEntryMeta | undefined {
    const entry = this.entries.get(name);
    if (!entry) return undefined;

    return {
      fileName: entry.fileName,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      isDirectory: /\/$/.test(entry.fileName),
    };
  }

  // ─── 读取方法 ───────────────────────────────────────

  /**
   * 流式读取指定 entry，返回 Readable 流
   *
   * 适用于大文件场景（如 JSONL 表数据），可配合 pipeline 直接写入目标，
   * 内存峰值仅取决于流缓冲区大小（默认 ~64KB）。
   *
   * @param name - entry 文件名
   * @returns Node.js Readable 流
   * @throws entry 不存在时抛错
   */
  async streamEntry(name: string): Promise<Readable> {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`ZIP entry not found: ${name}`);
    }

    return promisifyCallback<Readable>((cb) => {
      this.zipfile.openReadStream(entry, cb);
    });
  }

  /**
   * 读取小文件到 Buffer（适用于 manifest、mapping 等小文件）
   *
   * 内部仍使用流式读取（通过 yauzl.openReadStream），但将结果收集为 Buffer。
   * 对于大文件应优先使用 streamEntry() 直接 pipe，避免内存峰值过高。
   *
   * @param name - entry 文件名
   * @returns 文件内容的 Buffer
   * @throws entry 不存在时抛错
   */
  async readEntryToBuffer(name: string): Promise<Buffer> {
    const stream = await this.streamEntry(name);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on("error", reject);
    });
  }

  // ─── 生命周期 ───────────────────────────────────────

  /**
   * 关闭 ZIP 文件，释放资源
   *
   * 必须在所有读取操作完成后调用。建议在 try/finally 中使用。
   */
  close(): void {
    try {
      this.zipfile.close();
    } catch {
      // 忽略关闭错误（ZIP 可能已损坏或已关闭）
    }
  }
}
