/**
 * 备份序列化模块
 *
 * 提供 BigInt、Decimal、DateTime 等类型的双向序列化能力，以及 JSONL 格式的流式读写。
 * 主要用于数据库备份时的类型处理，确保精度和格式在序列化/反序列化过程中不丢失。
 */

import { Writable } from "node:stream";

/**
 * BigInt 值的哨兵标签
 */
export const TYPE_BIGINT = "__bigint";

/**
 * Decimal 值的哨兵标签
 */
export const TYPE_DECIMAL = "__decimal";

/**
 * 判断值是否为类似 Decimal 的对象
 *
 * 检查条件：
 * - 类型为 object
 * - 不为 null
 * - 包含 toFixed 方法（Decimal 特有）
 * - 包含 d 属性（Prisma Decimal 内部表示）
 *
 * @param val - 待检查的值
 * @returns 是否为 Decimal 对象
 */
function decimalToString(val: { toFixed: (digits: number) => string; d: number[] }): string {
	// 优先用 toString()（Prisma Decimal 支持），降级到 toFixed 去尾零
	const str = (val as unknown as { toString: () => string }).toString();
	if (str !== "[object Object]") return str;
	return val.toFixed(20).replace(/\.?0+$/, "");
}

function isDecimal(val: unknown): val is { toFixed: (digits: number) => string; d: number[] } {
	return (
		typeof val === "object" &&
		val !== null &&
		"toFixed" in val &&
		"d" in val
	);
}

/**
 * 判断字符串是否符合 ISO 8601 日期格式
 *
 * 检测模式：YYYY-MM-DDTHH:mm:ss.sssZ 或类似变体
 *
 * @param val - 待检查的字符串
 * @returns 是否像日期字符串
 */
function isIsoDateString(val: string): boolean {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);
}

/**
 * 递归序列化行数据
 *
 * 处理规则：
 * - null → null
 * - BigInt → { __bigint: string_value }
 * - Decimal → { __decimal: string_value }
 * - Date → ISO 8601 字符串
 * - Buffer → Base64 字符串
 * - 普通对象 → 递归处理每个属性
 * - 其他 → 原样返回
 *
 * @param row - 待序列化的行数据
 * @returns 序列化后的行数据
 */
export function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const key of Object.keys(row)) {
		const val = row[key];

		if (val === null) {
			result[key] = null;
		} else if (typeof val === "bigint") {
			result[key] = { [TYPE_BIGINT]: val.toString() };
		} else if (isDecimal(val)) {
			result[key] = { [TYPE_DECIMAL]: decimalToString(val) };
		} else if (val instanceof Date) {
			result[key] = val.toISOString();
		} else if (Buffer.isBuffer(val)) {
			result[key] = val.toString("base64");
		} else if (typeof val === "object") {
			result[key] = serializeRow(val as Record<string, unknown>);
		} else {
			result[key] = val;
		}
	}

	return result;
}

/**
 * 递归反序列化行数据
 *
 * 处理规则：
 * - null → null
 * - ISO 日期格式字符串 → new Date()
 * - { __bigint: string } → BigInt
 * - { __decimal: string } → string（保持精度）
 * - 普通对象 → 递归处理
 * - 其他 → 原样返回
 *
 * @param row - 待反序列化的行数据
 * @returns 反序列化后的行数据
 */
export function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const key of Object.keys(row)) {
		const val = row[key];

		if (val === null) {
			result[key] = null;
		} else if (typeof val === "string" && isIsoDateString(val)) {
			result[key] = new Date(val);
		} else if (typeof val === "object" && val !== null) {
			const obj = val as Record<string, unknown>;
			if (TYPE_BIGINT in obj) {
				result[key] = BigInt(obj[TYPE_BIGINT] as string);
			} else if (TYPE_DECIMAL in obj) {
				result[key] = obj[TYPE_DECIMAL];
			} else {
				result[key] = deserializeRow(obj);
			}
		} else {
			result[key] = val;
		}
	}

	return result;
}

/**
 * JSONL 流式写入器
 *
 * 将序列化的行数据以 JSON Lines 格式写入流中，
 * 每行一个 JSON 对象，以换行符分隔。
 */
export class JsonlWriter {
	private writer: Writable;

	/**
	 * @param stream - Node.js 可写流
	 */
	constructor(stream: Writable) {
		this.writer = stream;
	}

	/**
	 * 写入一行序列化后的数据
	 *
	 * @param row - 行数据（会被自动序列化）
	 */
	writeRow(row: Record<string, unknown>): void {
		const serialized = serializeRow(row);
		const line = JSON.stringify(serialized) + "\n";
		this.writer.write(line);
	}

	/**
	 * 结束写入流
	 *
	 * @returns 写入完成的 Promise
	 */
	async end(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.writer.end(() => resolve());
			this.writer.on("error", reject);
		});
	}
}

/**
 * JSONL 流式读取器
 *
 * 从流中逐行读取 JSON Lines 格式的数据，
 * 并将其反序列化回行对象。
 */
export class JsonlReader {
	private reader: AsyncIterable<string>;

	/**
	 * @param stream - 可读流（支持 AsyncIterable）
	 */
	constructor(stream: AsyncIterable<string>) {
		this.reader = stream;
	}

	/**
	 * 异步生成器：逐行读取并反序列化数据
	 *
	 * 跳过空行和非 JSON 行
	 *
	 * @yields 反序列化后的行数据
	 */
	async *readRows(): AsyncGenerator<Record<string, unknown>> {
		let buffer = "";

		for await (const chunk of this.reader) {
			buffer += String(chunk);
			const lines = buffer.split("\n");

			for (let i = 0; i < lines.length - 1; i++) {
				const line = lines[i].trim();
				if (line) {
					try {
						const parsed = JSON.parse(line);
						yield deserializeRow(parsed);
					} catch {
						// 跳过无效行
					}
				}
			}

			buffer = lines[lines.length - 1];
		}

		// 处理最后一行
		if (buffer.trim()) {
			try {
				const parsed = JSON.parse(buffer);
				yield deserializeRow(parsed);
			} catch {
				// 跳过无效行
			}
		}
	}
}