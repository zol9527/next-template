/**
 * Integrity Check 模块测试
 *
 * 覆盖 SHA256 哈希计算、ZIP manifest 解析、文件完整性校验、
 * Schema 兼容性检查和插件状态检查。
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  type BackupManifest,
  type IntegrityReport,
  type PluginCompatReport,
  type SchemaCompatReport,
  checkPluginState,
  checkSchemaCompatibility,
  computeFileSha256,
  computeStreamHash,
  createTestZip,
  parseManifestFromZip,
  verifyDirectoryIntegrity,
  verifyZipIntegrity,
} from "./integrity-check";

// ─── 测试目录 ──────────────────────────────────────────

const TMP_DIR = join(process.cwd(), ".tmp", "integrity-check-test");

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

// ─── 辅助函数 ──────────────────────────────────────────

function makeManifest(overrides: Partial<BackupManifest> = {}): BackupManifest {
  return {
    version: "1.0",
    createdAt: new Date().toISOString(),
    tables: ["users", "roles"],
    models: ["User", "Role"],
    plugins: ["ecommerce"],
    files: {},
    ...overrides,
  };
}

// ─── computeStreamHash ─────────────────────────────────

describe("computeStreamHash", () => {
  it("应该正确计算已知内容的 SHA256", async () => {
    const content = "hello world";
    const stream = Readable.from([Buffer.from(content)]);
    const hash = await computeStreamHash(stream);

    // echo -n "hello world" | sha256sum
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("应该正确计算空内容的 SHA256", async () => {
    const stream = Readable.from([Buffer.from("")]);
    const hash = await computeStreamHash(stream);

    // SHA256 of empty string
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("应该正确计算二进制内容的 SHA256", async () => {
    const content = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
    const stream = Readable.from([content]);
    const hash = await computeStreamHash(stream);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("应该正确处理分块流", async () => {
    const chunks = ["chunk1", "chunk2", "chunk3"];
    const stream = Readable.from(chunks.map((c) => Buffer.from(c)));
    const hash = await computeStreamHash(stream);

    const expectedContent = "chunk1chunk2chunk3";
    const expectedStream = Readable.from([Buffer.from(expectedContent)]);
    const expectedHash = await computeStreamHash(expectedStream);

    expect(hash).toBe(expectedHash);
  });
});

// ─── computeFileSha256 ─────────────────────────────────

describe("computeFileSha256", () => {
  beforeEach(() => setupTmpDir());
  afterEach(() => cleanupTmpDir());

  it("应该正确计算文件的 SHA256", async () => {
    const filePath = join(TMP_DIR, "test.txt");
    writeFileSync(filePath, "file content");

    const hash = await computeFileSha256(filePath);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("应该与流式计算结果一致", async () => {
    const content = "consistent hash test";
    const filePath = join(TMP_DIR, "consistency.txt");
    writeFileSync(filePath, content);

    const fileHash = await computeFileSha256(filePath);
    const streamHash = await computeStreamHash(Readable.from([Buffer.from(content)]));

    expect(fileHash).toBe(streamHash);
  });
});

// ─── createTestZip + parseManifestFromZip ──────────────

describe("ZIP 解析", () => {
  beforeEach(() => setupTmpDir());
  afterEach(() => cleanupTmpDir());

  it("应该能创建 ZIP 并提取 manifest", async () => {
    const zipPath = join(TMP_DIR, "test.zip");
    const manifest = makeManifest();

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "users.jsonl": '{"id":1,"name":"admin"}\n',
    });

    const parsed = await parseManifestFromZip(zipPath);
    expect(parsed.version).toBe("1.0");
    expect(parsed.models).toEqual(["User", "Role"]);
    expect(parsed.plugins).toEqual(["ecommerce"]);
  });

  it("应该在 ZIP 中找不到 manifest 时抛错", async () => {
    const zipPath = join(TMP_DIR, "no-manifest.zip");
    await createTestZip(zipPath, {
      "other.txt": "no manifest here",
    });

    await expect(parseManifestFromZip(zipPath)).rejects.toThrow("ZIP 中未找到文件: manifest.json");
  });

  it("应该正确处理包含多个文件的 ZIP", async () => {
    const zipPath = join(TMP_DIR, "multi.zip");
    await createTestZip(zipPath, {
      "a.txt": "file a",
      "b.txt": "file b",
      "subdir/c.txt": "file c",
    });

    const manifest = makeManifest();
    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "a.txt": "file a",
      "b.txt": "file b",
    });

    const parsed = await parseManifestFromZip(zipPath);
    expect(parsed.version).toBe("1.0");
  });
});

// ─── verifyZipIntegrity ────────────────────────────────

describe("verifyZipIntegrity", () => {
  beforeEach(() => setupTmpDir());
  afterEach(() => cleanupTmpDir());

  it("应该在所有文件哈希匹配时返回有效结果", async () => {
    const zipPath = join(TMP_DIR, "valid.zip");
    const { createHash } = await import("node:crypto");

    const usersContent = '{"id":1}\n';
    const rolesContent = '{"id":1,"name":"admin"}\n';

    const usersHash = createHash("sha256").update(usersContent).digest("hex");
    const rolesHash = createHash("sha256").update(rolesContent).digest("hex");

    const manifest = makeManifest({
      files: {
        "users.jsonl": usersHash,
        "roles.jsonl": rolesHash,
      },
    });

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "users.jsonl": usersContent,
      "roles.jsonl": rolesContent,
    });

    const report = await verifyZipIntegrity(zipPath, manifest);
    expect(report.valid).toBe(true);
    expect(report.checkedFiles).toBe(2);
    expect(report.mismatchedFiles).toEqual([]);
    expect(report.missingFiles).toEqual([]);
  });

  it("应该检测到篡改的文件", async () => {
    const zipPath = join(TMP_DIR, "tampered.zip");
    const { createHash } = await import("node:crypto");

    const originalContent = "original content";
    const tamperedContent = "tampered content";
    const originalHash = createHash("sha256").update(originalContent).digest("hex");

    const manifest = makeManifest({
      files: {
        "data.txt": originalHash,
      },
    });

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "data.txt": tamperedContent,
    });

    const report = await verifyZipIntegrity(zipPath, manifest);
    expect(report.valid).toBe(false);
    expect(report.mismatchedFiles).toEqual(["data.txt"]);
    expect(report.missingFiles).toEqual([]);
  });

  it("应该报告 ZIP 中缺失的文件", async () => {
    const zipPath = join(TMP_DIR, "missing.zip");

    const manifest = makeManifest({
      files: {
        "exists.txt": "abc123",
        "missing.txt": "def456",
      },
    });

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "exists.txt": "exists",
    });

    const report = await verifyZipIntegrity(zipPath, manifest);
    expect(report.valid).toBe(false);
    expect(report.missingFiles).toEqual(["missing.txt"]);
    expect(report.checkedFiles).toBe(1);
  });

  it("应该正确处理空的 files 列表", async () => {
    const zipPath = join(TMP_DIR, "empty.zip");
    const manifest = makeManifest({ files: {} });

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
    });

    const report = await verifyZipIntegrity(zipPath, manifest);
    expect(report.valid).toBe(true);
    expect(report.checkedFiles).toBe(0);
  });
});

// ─── verifyDirectoryIntegrity ──────────────────────────

describe("verifyDirectoryIntegrity", () => {
  beforeEach(() => setupTmpDir());
  afterEach(() => cleanupTmpDir());

  it("应该在目录文件哈希匹配时返回有效结果", async () => {
    const { createHash } = await import("node:crypto");

    const content = "dir file content";
    const hash = createHash("sha256").update(content).digest("hex");

    writeFileSync(join(TMP_DIR, "file.txt"), content);

    const manifest = makeManifest({
      files: { "file.txt": hash },
    });

    const report = await verifyDirectoryIntegrity(TMP_DIR, manifest);
    expect(report.valid).toBe(true);
    expect(report.checkedFiles).toBe(1);
  });

  it("应该检测到目录中缺失的文件", async () => {
    const manifest = makeManifest({
      files: { "gone.txt": "somehash" },
    });

    const report = await verifyDirectoryIntegrity(TMP_DIR, manifest);
    expect(report.valid).toBe(false);
    expect(report.missingFiles).toEqual(["gone.txt"]);
  });
});

// ─── checkSchemaCompatibility ──────────────────────────

describe("checkSchemaCompatibility", () => {
  it("应该在两个列表完全匹配时返回兼容", () => {
    const report = checkSchemaCompatibility(
      ["User", "Role", "Post"],
      ["User", "Role", "Post"],
    );

    expect(report.compatible).toBe(true);
    expect(report.missingModels).toEqual([]);
    expect(report.extraModels).toEqual([]);
  });

  it("应该报告备份中有但当前系统没有的 model", () => {
    const report = checkSchemaCompatibility(
      ["User", "Role", "Order", "Payment"],
      ["User", "Role"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingModels).toEqual(["Order", "Payment"]);
    expect(report.extraModels).toEqual([]);
  });

  it("应该报告当前系统有但备份中没有的 model", () => {
    const report = checkSchemaCompatibility(
      ["User", "Role"],
      ["User", "Role", "Blog", "Media"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingModels).toEqual([]);
    expect(report.extraModels).toEqual(["Blog", "Media"]);
  });

  it("应该同时报告缺失和多余的 model", () => {
    const report = checkSchemaCompatibility(
      ["User", "Order"],
      ["User", "Blog"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingModels).toEqual(["Order"]);
    expect(report.extraModels).toEqual(["Blog"]);
  });

  it("应该处理空列表", () => {
    const report = checkSchemaCompatibility([], []);
    expect(report.compatible).toBe(true);
  });

  it("应该处理备份非空但当前为空的情况", () => {
    const report = checkSchemaCompatibility(["User"], []);
    expect(report.compatible).toBe(false);
    expect(report.missingModels).toEqual(["User"]);
  });
});

// ─── checkPluginState ─────────────────────────────────

describe("checkPluginState", () => {
  it("应该在插件列表完全匹配时返回兼容", () => {
    const report = checkPluginState(
      ["ecommerce", "wechat"],
      ["ecommerce", "wechat"],
    );

    expect(report.compatible).toBe(true);
    expect(report.missingPlugins).toEqual([]);
    expect(report.extraPlugins).toEqual([]);
  });

  it("应该报告备份中有但当前未启用的插件", () => {
    const report = checkPluginState(
      ["ecommerce", "promotion"],
      ["ecommerce"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingPlugins).toEqual(["promotion"]);
    expect(report.extraPlugins).toEqual([]);
  });

  it("应该报告当前启用但备份中没有的插件", () => {
    const report = checkPluginState(
      ["ecommerce"],
      ["ecommerce", "wechat"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingPlugins).toEqual([]);
    expect(report.extraPlugins).toEqual(["wechat"]);
  });

  it("应该同时报告缺失和多余的插件", () => {
    const report = checkPluginState(
      ["ecommerce", "promotion"],
      ["ecommerce", "wechat"],
    );

    expect(report.compatible).toBe(false);
    expect(report.missingPlugins).toEqual(["promotion"]);
    expect(report.extraPlugins).toEqual(["wechat"]);
  });

  it("应该处理两个空列表", () => {
    const report = checkPluginState([], []);
    expect(report.compatible).toBe(true);
  });
});

// ─── 端到端场景 ───────────────────────────────────────

describe("端到端：篡改检测", () => {
  beforeEach(() => setupTmpDir());
  afterEach(() => cleanupTmpDir());

  it("应该在篡改后正确报告具体的损坏文件", async () => {
    const { createHash } = await import("node:crypto");

    const zipPath = join(TMP_DIR, "e2e.zip");

    const fileA = "file A original content";
    const fileB = "file B original content";
    const fileC = "file C original content";

    const hashA = createHash("sha256").update(fileA).digest("hex");
    const hashB = createHash("sha256").update(fileB).digest("hex");
    const hashC = createHash("sha256").update(fileC).digest("hex");

    const tamperedB = "file B TAMPERED content";

    const manifest = makeManifest({
      files: {
        "a.txt": hashA,
        "b.txt": hashB,
        "c.txt": hashC,
      },
    });

    await createTestZip(zipPath, {
      "manifest.json": JSON.stringify(manifest),
      "a.txt": fileA,
      "b.txt": tamperedB,
      "c.txt": fileC,
    });

    const report = await verifyZipIntegrity(zipPath, manifest);

    expect(report.valid).toBe(false);
    expect(report.checkedFiles).toBe(3);
    expect(report.mismatchedFiles).toEqual(["b.txt"]);
    expect(report.missingFiles).toEqual([]);
  });
});

describe("端到端：Schema 不兼容报告", () => {
  it("应该精确报告缺失的 model", () => {
    const manifestModels = ["User", "Role", "Order", "Payment"];
    const currentModels = ["User", "Role"];

    const report = checkSchemaCompatibility(manifestModels, currentModels);

    expect(report.compatible).toBe(false);
    expect(report.missingModels).toEqual(["Order", "Payment"]);
    expect(report.extraModels).toEqual([]);
  });
});
