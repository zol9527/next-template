/**
 * StreamingZipReader 模块测试
 *
 * 覆盖 ZIP 文件打开、entry 查询、流式读取、Buffer 读取和资源释放等功能。
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestZip } from "./integrity-check";
import { StreamingZipReader } from "./streaming-zip-reader";

// ─── 测试目录 ──────────────────────────────────────────

const TMP_DIR = join(process.cwd(), ".tmp", "streaming-zip-reader-test");

function setupTmpDir(): void {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });
}

function cleanupTmpDir(): void {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true });
  }
}

// ─── 测试用例 ──────────────────────────────────────────

describe("StreamingZipReader", () => {
  beforeEach(() => {
    setupTmpDir();
  });

  afterEach(() => {
    cleanupTmpDir();
  });

  // ─── open() ─────────────────────────────────────────

  describe("open()", () => {
    it("应该成功打开有效的 ZIP 文件", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, {
        "hello.txt": "Hello, World!",
      });

      const reader = await StreamingZipReader.open(zipPath);
      expect(reader).toBeInstanceOf(StreamingZipReader);
      reader.close();
    });

    it("应该在文件不存在时抛错", async () => {
      const zipPath = join(TMP_DIR, "not-exist.zip");

      await expect(StreamingZipReader.open(zipPath)).rejects.toThrow();
    });

    it("应该收集所有文件 entry（跳过目录）", async () => {
      const zipPath = join(TMP_DIR, "multi.zip");
      await createTestZip(zipPath, {
        "file1.txt": "content1",
        "file2.txt": "content2",
        "nested/data.json": '{"key": "value"}',
      });

      const reader = await StreamingZipReader.open(zipPath);
      const entries = reader.listEntries();

      // createTestZip 不创建目录 entry，所以所有文件都应被收集
      expect(entries).toContain("file1.txt");
      expect(entries).toContain("file2.txt");
      expect(entries).toContain("nested/data.json");
      expect(entries).toHaveLength(3);

      reader.close();
    });
  });

  // ─── hasEntry() ─────────────────────────────────────

  describe("hasEntry()", () => {
    it("应该正确判断 entry 是否存在", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, {
        "manifest.json": '{"version": "1.0"}',
        "tables/users.jsonl": '{"id": 1}\n{"id": 2}',
      });

      const reader = await StreamingZipReader.open(zipPath);

      expect(reader.hasEntry("manifest.json")).toBe(true);
      expect(reader.hasEntry("tables/users.jsonl")).toBe(true);
      expect(reader.hasEntry("non-existent.txt")).toBe(false);

      reader.close();
    });
  });

  // ─── listEntries() ──────────────────────────────────

  describe("listEntries()", () => {
    it("应该返回所有 entry 名称", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, {
        "a.txt": "a",
        "b.txt": "b",
        "c.txt": "c",
      });

      const reader = await StreamingZipReader.open(zipPath);
      const entries = reader.listEntries();

      expect(entries).toHaveLength(3);
      expect(entries.sort()).toEqual(["a.txt", "b.txt", "c.txt"]);

      reader.close();
    });

    it("空 ZIP 应返回空数组", async () => {
      const zipPath = join(TMP_DIR, "empty.zip");
      await createTestZip(zipPath, {});

      const reader = await StreamingZipReader.open(zipPath);
      const entries = reader.listEntries();

      expect(entries).toHaveLength(0);

      reader.close();
    });
  });

  // ─── getEntryMeta() ─────────────────────────────────

  describe("getEntryMeta()", () => {
    it("应该返回正确的 entry 元数据", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      const content = "Hello, World!";
      await createTestZip(zipPath, {
        "hello.txt": content,
      });

      const reader = await StreamingZipReader.open(zipPath);
      const meta = reader.getEntryMeta("hello.txt");

      expect(meta).toBeDefined();
      expect(meta!.fileName).toBe("hello.txt");
      expect(meta!.uncompressedSize).toBe(Buffer.byteLength(content));
      expect(meta!.isDirectory).toBe(false);

      reader.close();
    });

    it("不存在的 entry 应返回 undefined", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, { "a.txt": "a" });

      const reader = await StreamingZipReader.open(zipPath);
      expect(reader.getEntryMeta("no.txt")).toBeUndefined();

      reader.close();
    });
  });

  // ─── readEntryToBuffer() ────────────────────────────

  describe("readEntryToBuffer()", () => {
    it("应该正确读取小文件到 Buffer", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      const content = '{"version": "1.0", "tables": []}';
      await createTestZip(zipPath, {
        "manifest.json": content,
      });

      const reader = await StreamingZipReader.open(zipPath);
      const buffer = await reader.readEntryToBuffer("manifest.json");

      expect(buffer.toString("utf8")).toBe(content);

      reader.close();
    });

    it("应该正确读取二进制内容", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      await createTestZip(zipPath, {
        "image.png": binaryContent,
      });

      const reader = await StreamingZipReader.open(zipPath);
      const buffer = await reader.readEntryToBuffer("image.png");

      expect(buffer).toEqual(binaryContent);

      reader.close();
    });

    it("不存在的 entry 应抛错", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, { "a.txt": "a" });

      const reader = await StreamingZipReader.open(zipPath);

      await expect(reader.readEntryToBuffer("no.txt")).rejects.toThrow(
        "ZIP entry not found: no.txt",
      );

      reader.close();
    });
  });

  // ─── streamEntry() ──────────────────────────────────

  describe("streamEntry()", () => {
    it("应该返回可读流并正确传输数据", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      const content = "line1\nline2\nline3\n";
      await createTestZip(zipPath, {
        "data.jsonl": content,
      });

      const reader = await StreamingZipReader.open(zipPath);
      const stream = await reader.streamEntry("data.jsonl");

      // 收集流数据
      const chunks: Buffer[] = [];
      await pipeline(
        stream,
        new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(chunk);
            callback();
          },
        }),
      );

      const result = Buffer.concat(chunks).toString("utf8");
      expect(result).toBe(content);

      reader.close();
    });

    it("不存在的 entry 应抛错", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, { "a.txt": "a" });

      const reader = await StreamingZipReader.open(zipPath);

      await expect(reader.streamEntry("no.txt")).rejects.toThrow(
        "ZIP entry not found: no.txt",
      );

      reader.close();
    });
  });

  // ─── 多次读取 ───────────────────────────────────────

  describe("多次读取同一 ZIP", () => {
    it("应该支持对同一 ZIP 多次调用 streamEntry", async () => {
      const zipPath = join(TMP_DIR, "multi-read.zip");
      await createTestZip(zipPath, {
        "file1.txt": "content1",
        "file2.txt": "content2",
        "file3.txt": "content3",
      });

      const reader = await StreamingZipReader.open(zipPath);

      // 依次读取三个文件
      const buf1 = await reader.readEntryToBuffer("file1.txt");
      expect(buf1.toString()).toBe("content1");

      const buf2 = await reader.readEntryToBuffer("file2.txt");
      expect(buf2.toString()).toBe("content2");

      const buf3 = await reader.readEntryToBuffer("file3.txt");
      expect(buf3.toString()).toBe("content3");

      reader.close();
    });

    it("应该支持混合使用 streamEntry 和 readEntryToBuffer", async () => {
      const zipPath = join(TMP_DIR, "mixed.zip");
      await createTestZip(zipPath, {
        "small.txt": "small content",
        "large.jsonl": "line1\nline2\nline3\n",
      });

      const reader = await StreamingZipReader.open(zipPath);

      // 先用 readEntryToBuffer 读小文件
      const buf = await reader.readEntryToBuffer("small.txt");
      expect(buf.toString()).toBe("small content");

      // 再用 streamEntry 读另一个文件
      const stream = await reader.streamEntry("large.jsonl");
      const chunks: Buffer[] = [];
      await pipeline(
        stream,
        new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(chunk);
            callback();
          },
        }),
      );
      expect(Buffer.concat(chunks).toString()).toBe("line1\nline2\nline3\n");

      reader.close();
    });
  });

  // ─── close() ────────────────────────────────────────

  describe("close()", () => {
    it("应该能安全地多次调用 close", async () => {
      const zipPath = join(TMP_DIR, "test.zip");
      await createTestZip(zipPath, { "a.txt": "a" });

      const reader = await StreamingZipReader.open(zipPath);
      reader.close();
      // 二次 close 不应抛错
      reader.close();
    });
  });
});
