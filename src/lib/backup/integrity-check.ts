/**
 * 备份完整性校验模块
 *
 * 提供 SHA256 哈希计算、ZIP manifest 解析、文件完整性校验、
 * Schema 兼容性检查和插件状态检查等功能。
 * 主要用于备份恢复前的预检，确保备份数据完整且与当前系统兼容。
 */

import { createHash, type Hash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Readable } from "node:stream";

// ─── 类型定义 ───────────────────────────────────────────

/**
 * 备份清单
 *
 * ZIP 备份文件中 manifest.json 的结构定义，包含备份的元数据和文件校验信息。
 */
export interface BackupManifest {
  version: string;
  createdAt: string;
  tables: string[];
  models: string[];
  plugins: string[];
  /** 文件名 → SHA256 哈希值 */
  files: Record<string, string>;
  [key: string]: unknown;
}

/**
 * 完整性校验报告
 *
 * 记录 ZIP 文件中所有文件的校验结果，包括不匹配和缺失的文件。
 */
export interface IntegrityReport {
  valid: boolean;
  checkedFiles: number;
  mismatchedFiles: string[];
  missingFiles: string[];
}

/**
 * Schema 兼容性报告
 *
 * 比对备份数据的 model 列表与当前系统，报告缺失和多余的 model。
 */
export interface SchemaCompatReport {
  compatible: boolean;
  missingModels: string[];
  extraModels: string[];
}

/**
 * 插件兼容性报告
 *
 * 比对备份中的插件列表与当前启用的插件，报告差异。
 */
export interface PluginCompatReport {
  compatible: boolean;
  missingPlugins: string[];
  extraPlugins: string[];
}

// ─── ZIP 内部结构常量（用于手动解析 ZIP 文件） ──────────

/** Local File Header 签名 */
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
/** Central Directory Header 签名 */
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
/** End of Central Directory Record 签名 */
const EOCD_SIGNATURE = 0x06054b50;

// ─── 哈希计算 ──────────────────────────────────────────

/**
 * Function: computeStreamHash
 *
 * Description: 从可读流中计算 SHA256 哈希值，以十六进制字符串形式返回。
 *
 * Parameters:
 *   stream(Readable): Node.js 可读流
 *
 * Returns:
 *   Promise<string>: SHA256 哈希值（十六进制）
 */
export async function computeStreamHash(stream: Readable): Promise<string> {
  const hash: Hash = createHash("sha256");
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/**
 * Function: computeFileSha256
 *
 * Description: 计算指定文件的 SHA256 哈希值，使用流式读取避免内存溢出。
 *
 * Parameters:
 *   filePath(string): 文件路径
 *
 * Returns:
 *   Promise<string>: SHA256 哈希值（十六进制）
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  const stream = createReadStream(filePath);
  return computeStreamHash(stream);
}

// ─── ZIP 手动解析 ──────────────────────────────────────

/**
 * 从 ZIP 文件中提取指定文件的内容
 *
 * 解析 ZIP 的 Local File Header 结构，定位目标文件并解压内容。
 * 支持 deflate 和 store（无压缩）两种压缩方式。
 *
 * @param zipPath - ZIP 文件路径
 * @param targetFileName - 要提取的文件名
 * @returns 文件内容的 Buffer
 * @throws 找不到目标文件或压缩方式不支持时抛错
 */
async function extractFileFromZip(zipPath: string, targetFileName: string): Promise<Buffer> {
  const data = readFileSync(zipPath);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  let offset = 0;

  while (offset < data.length - 4) {
    const signature = view.getUint32(offset, true);

    // 遇到 Central Directory 或 EOCD 说明 Local File Header 区域已结束
    if (signature === CENTRAL_DIR_SIGNATURE || signature === EOCD_SIGNATURE) {
      break;
    }

    if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
      offset++;
      continue;
    }

    // Local File Header 结构（30 字节固定头 + 变长部分）
    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraFieldLen = view.getUint16(offset + 28, true);

    const fileNameStart = offset + 30;
    const fileName = data.subarray(fileNameStart, fileNameStart + fileNameLen).toString("utf8");

    const dataStart = fileNameStart + fileNameLen + extraFieldLen;
    const compressedData = data.subarray(dataStart, dataStart + compressedSize);

    if (fileName === targetFileName) {
      // 0 = store（无压缩），8 = deflate
      if (compressionMethod === 0) {
        return Buffer.from(compressedData);
      }
      if (compressionMethod === 8) {
        return decompressDeflate(compressedData);
      }
      throw new Error(`不支持的压缩方式: ${compressionMethod}`);
    }

    offset = dataStart + compressedSize;
  }

  throw new Error(`ZIP 中未找到文件: ${targetFileName}`);
}

/**
 * 使用 Node.js 内置 zlib 解压 deflate 数据
 *
 * @param compressed - 压缩数据
 * @returns 解压后的 Buffer
 */
async function decompressDeflate(compressed: Uint8Array): Promise<Buffer> {
  const { inflateRawSync } = await import("node:zlib");
  return inflateRawSync(Buffer.from(compressed));
}

// ─── Manifest 解析 ─────────────────────────────────────

/**
 * Function: parseManifestFromZip
 *
 * Description: 从 ZIP 备份文件中提取并解析 manifest.json。
 *
 * Parameters:
 *   zipPath(string): ZIP 文件路径
 *
 * Returns:
 *   Promise<BackupManifest>: 解析后的备份清单对象
 */
export async function parseManifestFromZip(zipPath: string): Promise<BackupManifest> {
  const content = await extractFileFromZip(zipPath, "manifest.json");
  return JSON.parse(content.toString("utf8")) as BackupManifest;
}

// ─── ZIP 完整性校验 ────────────────────────────────────

/**
 * Function: verifyZipIntegrity
 *
 * Description: 校验 ZIP 备份文件中所有文件的 SHA256 完整性。
 * 逐文件提取内容并计算哈希，与 manifest 中的记录进行比对。
 *
 * Parameters:
 *   zipPath(string): ZIP 文件路径
 *   manifest(BackupManifest): 备份清单，包含各文件的预期哈希值
 *
 * Returns:
 *   Promise<IntegrityReport>: 校验报告，包含不匹配和缺失的文件列表
 */
export async function verifyZipIntegrity(
  zipPath: string,
  manifest: BackupManifest,
): Promise<IntegrityReport> {
  const mismatchedFiles: string[] = [];
  const missingFiles: string[] = [];
  let checkedFiles = 0;

  for (const [fileName, expectedHash] of Object.entries(manifest.files)) {
    try {
      const content = await extractFileFromZip(zipPath, fileName);
      const actualHash = createHash("sha256").update(content).digest("hex");
      checkedFiles++;

      if (actualHash !== expectedHash) {
        mismatchedFiles.push(fileName);
      }
    } catch {
      missingFiles.push(fileName);
    }
  }

  return {
    valid: mismatchedFiles.length === 0 && missingFiles.length === 0,
    checkedFiles,
    mismatchedFiles,
    missingFiles,
  };
}

/**
 * Function: verifyDirectoryIntegrity
 *
 * Description: 校验目录中所有文件的 SHA256 完整性（用于测试场景）。
 * 逐文件读取并计算哈希，与 manifest 中的记录进行比对。
 *
 * Parameters:
 *   dirPath(string): 目录路径
 *   manifest(BackupManifest): 备份清单
 *
 * Returns:
 *   Promise<IntegrityReport>: 校验报告
 */
export async function verifyDirectoryIntegrity(
  dirPath: string,
  manifest: BackupManifest,
): Promise<IntegrityReport> {
  const mismatchedFiles: string[] = [];
  const missingFiles: string[] = [];
  let checkedFiles = 0;

  for (const [fileName, expectedHash] of Object.entries(manifest.files)) {
    const fullPath = join(dirPath, fileName);

    if (!existsSync(fullPath)) {
      missingFiles.push(fileName);
      continue;
    }

    const actualHash = await computeFileSha256(fullPath);
    checkedFiles++;

    if (actualHash !== expectedHash) {
      mismatchedFiles.push(fileName);
    }
  }

  return {
    valid: mismatchedFiles.length === 0 && missingFiles.length === 0,
    checkedFiles,
    mismatchedFiles,
    missingFiles,
  };
}

// ─── Schema 兼容性检查 ─────────────────────────────────

/**
 * Function: checkSchemaCompatibility
 *
 * Description: 对比备份数据的 model 列表与当前系统的 model 列表。
 * 缺失的 model 表示当前系统没有但备份数据中存在的表；
 * 多余的 model 表示当前系统有但备份数据中不存在的表。
 *
 * Parameters:
 *   manifestModels(string[]): 备份中的 model 列表
 *   currentModels(string[]): 当前系统的 model 列表
 *
 * Returns:
 *   SchemaCompatReport: 兼容性报告
 */
export function checkSchemaCompatibility(
  manifestModels: string[],
  currentModels: string[],
): SchemaCompatReport {
  const currentSet = new Set(currentModels);
  const manifestSet = new Set(manifestModels);

  const missingModels = manifestModels.filter((m) => !currentSet.has(m));
  const extraModels = currentModels.filter((m) => !manifestSet.has(m));

  return {
    compatible: missingModels.length === 0 && extraModels.length === 0,
    missingModels,
    extraModels,
  };
}

// ─── 插件状态检查 ──────────────────────────────────────

/**
 * Function: checkPluginState
 *
 * Description: 对比备份中的插件列表与当前系统启用的插件列表。
 * 缺失的插件表示当前系统未启用但备份数据中存在的插件；
 * 多余的插件表示当前系统启用但备份数据中不存在的插件。
 *
 * Parameters:
 *   manifestPlugins(string[]): 备份中的插件列表
 *   enabledPlugins(string[]): 当前系统启用的插件列表
 *
 * Returns:
 *   PluginCompatReport: 兼容性报告
 */
export function checkPluginState(
  manifestPlugins: string[],
  enabledPlugins: string[],
): PluginCompatReport {
  const enabledSet = new Set(enabledPlugins);
  const manifestSet = new Set(manifestPlugins);

  const missingPlugins = manifestPlugins.filter((p) => !enabledSet.has(p));
  const extraPlugins = enabledPlugins.filter((p) => !manifestSet.has(p));

  return {
    compatible: missingPlugins.length === 0 && extraPlugins.length === 0,
    missingPlugins,
    extraPlugins,
  };
}

// ─── 测试辅助：创建 ZIP 文件 ────────────────────────────

/**
 * Function: createTestZip
 *
 * Description: 创建一个包含指定文件的 ZIP 文件（使用 store 压缩方式）。
 * 仅用于测试场景，不用于生产环境。
 *
 * Parameters:
 *   zipPath(string): 输出的 ZIP 文件路径
 *   files(Record<string, Buffer | string>): 文件名到内容的映射
 *
 * Returns:
 *   Promise<void>
 */
export async function createTestZip(
  zipPath: string,
  files: Record<string, Buffer | string>,
): Promise<void> {
  const parts: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let localHeaderOffset = 0;

  for (const [fileName, content] of Object.entries(files)) {
    const contentBuffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;
    const fileNameBuffer = Buffer.from(fileName, "utf8");

    // Local File Header (30 bytes fixed + variable)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE, 0); // 签名
    localHeader.writeUInt16LE(20, 4); // 解压所需版本
    localHeader.writeUInt16LE(0, 6); // 标志位
    localHeader.writeUInt16LE(0, 8); // 压缩方式：store（无压缩）
    localHeader.writeUInt16LE(0, 10); // 修改时间
    localHeader.writeUInt16LE(0, 12); // 修改日期
    localHeader.writeUInt32LE(crc32(contentBuffer), 14); // CRC-32
    localHeader.writeUInt32LE(contentBuffer.length, 18); // 压缩大小
    localHeader.writeUInt32LE(contentBuffer.length, 22); // 原始大小
    localHeader.writeUInt16LE(fileNameBuffer.length, 26); // 文件名长度
    localHeader.writeUInt16LE(0, 28); // 额外字段长度

    parts.push(localHeader, fileNameBuffer, contentBuffer);

    // Central Directory Header (46 bytes fixed + variable)
    const centralEntry = Buffer.alloc(46);
    centralEntry.writeUInt32LE(CENTRAL_DIR_SIGNATURE, 0);
    centralEntry.writeUInt16LE(20, 4); // 创建版本
    centralEntry.writeUInt16LE(20, 6); // 解压所需版本
    centralEntry.writeUInt16LE(0, 8); // 标志位
    centralEntry.writeUInt16LE(0, 10); // 压缩方式
    centralEntry.writeUInt16LE(0, 12); // 修改时间
    centralEntry.writeUInt16LE(0, 14); // 修改日期
    centralEntry.writeUInt32LE(crc32(contentBuffer), 16); // CRC-32
    centralEntry.writeUInt32LE(contentBuffer.length, 20); // 压缩大小
    centralEntry.writeUInt32LE(contentBuffer.length, 24); // 原始大小
    centralEntry.writeUInt16LE(fileNameBuffer.length, 28); // 文件名长度
    centralEntry.writeUInt16LE(0, 30); // 额外字段长度
    centralEntry.writeUInt16LE(0, 32); // 文件注释长度
    centralEntry.writeUInt16LE(0, 34); // 起始磁盘号
    centralEntry.writeUInt16LE(0, 36); // 内部文件属性
    centralEntry.writeUInt32LE(0, 38); // 外部文件属性
    centralEntry.writeUInt32LE(localHeaderOffset, 42); // Local Header 偏移量

    centralDirectory.push(centralEntry, fileNameBuffer);

    localHeaderOffset += localHeader.length + fileNameBuffer.length + contentBuffer.length;
  }

  const centralDirOffset = localHeaderOffset;
  const centralDirSize =
    centralDirectory.reduce((sum, buf) => sum + buf.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(0, 4); // 当前磁盘号
  eocd.writeUInt16LE(0, 6); // Central Directory 起始磁盘号
  eocd.writeUInt16LE(Object.keys(files).length, 8); // 当前磁盘上的记录数
  eocd.writeUInt16LE(Object.keys(files).length, 10); // 总记录数
  eocd.writeUInt32LE(centralDirSize, 12); // Central Directory 大小
  eocd.writeUInt32LE(centralDirOffset, 16); // Central Directory 偏移量
  eocd.writeUInt16LE(0, 20); // 注释长度

  const { writeFileSync } = await import("node:fs");
  writeFileSync(zipPath, Buffer.concat([...parts, ...centralDirectory, eocd]));
}

// ─── CRC-32 实现 ───────────────────────────────────────

/** CRC-32 查找表 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[i] = crc;
  }
  return table;
})();

/**
 * Function: crc32
 *
 * Description: 计算数据的 CRC-32 校验值。
 *
 * Parameters:
 *   data(Uint8Array): 输入数据
 *
 * Returns:
 *   number: CRC-32 值（无符号 32 位）
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
