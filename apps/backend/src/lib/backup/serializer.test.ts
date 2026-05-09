/**
 * 备份序列化模块测试
 *
 * 覆盖所有 Prisma 标量类型的往返序列化测试，
 * 以及 JSONL 流式读写测试。
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync, createWriteStream as fsCreateWriteStream, createReadStream as fsCreateReadStream } from "node:fs";
import { Readable, Writable } from "node:stream";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
	serializeRow,
	deserializeRow,
	JsonlWriter,
	JsonlReader,
	TYPE_BIGINT,
	TYPE_DECIMAL,
} from "./serializer";

describe("serializeRow", () => {
	it("应正确序列化 BigInt 值", () => {
		const input = { id: BigInt("9007199254740993"), count: 1 };
		const result = serializeRow(input);

		expect(result.id).toEqual({ [TYPE_BIGINT]: "9007199254740993" });
		expect(result.count).toBe(1);
	});

	it("应正确序列化 Decimal-like 对象", () => {
		const decimal = {
			toFixed: (digits: number) => "99999999.999999",
			d: [99999999, 999999],
		};
		const input = { price: decimal };
		const result = serializeRow(input);

		expect(result.price).toEqual({ [TYPE_DECIMAL]: "99999999.999999" });
	});

	it("应正确序列化 Date 对象", () => {
		const date = new Date("2025-01-15T10:30:00.000Z");
		const input = { createdAt: date };
		const result = serializeRow(input);

		expect(result.createdAt).toBe("2025-01-15T10:30:00.000Z");
	});

	it("应正确序列化 Buffer", () => {
		const buffer = Buffer.from([72, 101, 108, 108, 111]);
		const input = { data: buffer };
		const result = serializeRow(input);

		expect(result.data).toBe("SGVsbG8=");
	});

	it("应正确处理 null 值", () => {
		const input = { name: null, age: 25 };
		const result = serializeRow(input);

		expect(result.name).toBeNull();
		expect(result.age).toBe(25);
	});

	it("应递归序列化嵌套对象", () => {
		const input = {
				user: {
					profile: {
						name: "张三",
						big: BigInt("1234567890123456789"),
					},
				},
			};
		const result = serializeRow(input);

		const user = result.user as Record<string, unknown>;
		const profile = user.profile as Record<string, unknown>;
		expect(profile.name).toBe("张三");
		expect(profile.big).toEqual({ [TYPE_BIGINT]: "1234567890123456789" });
	});

	it("应正确透传 String/Number/Boolean", () => {
		const input = {
				name: "李四",
				age: 30,
				active: true,
			};
		const result = serializeRow(input);

		expect(result.name).toBe("李四");
		expect(result.age).toBe(30);
		expect(result.active).toBe(true);
	});
});

describe("deserializeRow", () => {
	it("应正确反序列化 BigInt", () => {
		const input = { [TYPE_BIGINT]: "9007199254740993" };
		const result = deserializeRow({ id: input });

		expect(result.id).toBe(BigInt("9007199254740993"));
	});

	it("应正确反序列化 Decimal 字符串", () => {
		const input = { [TYPE_DECIMAL]: "99999999.999999" };
		const result = deserializeRow({ price: input });

		expect(result.price).toBe("99999999.999999");
	});

	it("应正确反序列化 ISO 日期字符串", () => {
		const input = "2025-01-15T10:30:00.000Z";
		const result = deserializeRow({ createdAt: input });

		expect(result.createdAt).toBeInstanceOf(Date);
		expect((result.createdAt as Date).toISOString()).toBe("2025-01-15T10:30:00.000Z");
	});

	it("应递归反序列化嵌套对象", () => {
		const input = {
				user: {
					name: "王五",
					big: { [TYPE_BIGINT]: "9876543210987654321" },
				},
			};
		const result = deserializeRow(input);

		const user = result.user as Record<string, unknown>;
		expect(user.name).toBe("王五");
		expect(user.big).toBe(BigInt("9876543210987654321"));
	});

	it("应正确处理 null 值", () => {
		const input = { name: null };
		const result = deserializeRow(input);

		expect(result.name).toBeNull();
	});
});

describe("Roundtrip", () => {
	it("应正确往返 BigInt('9007199254740993')", () => {
		const original = { id: BigInt("9007199254740993"), value: 1 };
		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.id).toBe(BigInt("9007199254740993"));
		expect(deserialized.value).toBe(1);
	});

	it("应正确往返 BigInt('0')", () => {
		const original = { zero: BigInt("0") };
		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.zero).toBe(BigInt("0"));
	});

	it("应正确往返 BigInt('-9007199254740993')", () => {
		const original = { negative: BigInt("-9007199254740993") };
		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.negative).toBe(BigInt("-9007199254740993"));
	});

	it("应正确往返 Decimal '99999999.999999'", () => {
		const original = { price: { toFixed: () => "99999999.999999", d: [99999999, 999999] } };
		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.price).toBe("99999999.999999");
	});

	it("应正确往返 Decimal '0.01'", () => {
		const original = { amount: { toFixed: () => "0.01", d: [0, 1] } };
		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.amount).toBe("0.01");
	});

	it("应正确往返包含混合类型的完整行", () => {
		const original = {
				id: BigInt("1234567890123456789"),
				name: "测试用户",
				age: 28,
				active: true,
				balance: { toFixed: () => "999.99", d: [999, 99] },
				createdAt: new Date("2025-02-20T15:30:00.000Z"),
				buffer: Buffer.from([1, 2, 3, 4, 5]),
				nested: {
					big: BigInt("111"),
					text: "嵌套文本",
				},
			};

		const serialized = serializeRow(original);
		const deserialized = deserializeRow(serialized as Record<string, unknown>);

		expect(deserialized.id).toBe(BigInt("1234567890123456789"));
		expect(deserialized.name).toBe("测试用户");
		expect(deserialized.age).toBe(28);
		expect(deserialized.active).toBe(true);
		expect(deserialized.balance).toBe("999.99");
		expect(deserialized.createdAt).toBeInstanceOf(Date);
		expect((deserialized.createdAt as Date).toISOString()).toBe("2025-02-20T15:30:00.000Z");
		expect(deserialized.buffer).toBe("AQIDBAU="); // Buffer.from([1,2,3,4,5]).toString('base64')
		const nested = deserialized.nested as Record<string, unknown>;
		expect(nested.big).toBe(BigInt("111"));
		expect(nested.text).toBe("嵌套文本");
	});
});

describe("JsonlWriter + JsonlReader", () => {
	const tempFiles: string[] = [];

	afterEach(() => {
		for (const file of tempFiles) {
			if (existsSync(file)) {
				unlinkSync(file);
			}
		}
		tempFiles.length = 0;
	});

	it("应写入并读取 100 行混合类型数据", async () => {
		const filePath = join(tmpdir(), `serializer-test-${Date.now()}.jsonl`);
		tempFiles.push(filePath);

		const rows = [];
		for (let i = 0; i < 100; i++) {
			rows.push({
				id: BigInt(i),
				index: i,
				name: `用户${i}`,
				score: i * 0.5,
				active: i % 2 === 0,
				balance: { toFixed: () => `${i}.00`, d: [i, 0], toString: () => `${i}.00` },
				created: new Date(2025, 0, 1, 0, 0, i),
			});
		}

		const writeStream = fsCreateWriteStream(filePath);
		const writer = new JsonlWriter(writeStream);

		for (const row of rows) {
			writer.writeRow(row);
		}

		await writer.end();

		const readStream = fsCreateReadStream(filePath);
		const reader = new JsonlReader(Readable.from(readStream));

		const readRows: Record<string, unknown>[] = [];
		for await (const row of reader.readRows()) {
			readRows.push(row);
		}

		expect(readRows).toHaveLength(100);

		for (let i = 0; i < 100; i++) {
			expect(readRows[i].id).toBe(BigInt(i));
			expect(readRows[i].index).toBe(i);
			expect(readRows[i].name).toBe(`用户${i}`);
			expect(readRows[i].score).toBe(i * 0.5);
			expect(readRows[i].active).toBe(i % 2 === 0);
			expect(readRows[i].balance).toBe(`${i}.00`);
			expect(readRows[i].created).toBeInstanceOf(Date);
		}
	});

	it("应跳过空行", async () => {
		const filePath = join(tmpdir(), `serializer-empty-test-${Date.now()}.jsonl`);
		tempFiles.push(filePath);

		writeFileSync(filePath, '{"id": 1}\n\n{"id": 2}\n\n{"id": 3}\n');

		const readStream = fsCreateReadStream(filePath);
		const reader = new JsonlReader(Readable.from(readStream));

		const readRows: Record<string, unknown>[] = [];
		for await (const row of reader.readRows()) {
			readRows.push(row);
		}

		expect(readRows).toHaveLength(3);
		expect(readRows[0].id).toBe(1);
		expect(readRows[1].id).toBe(2);
		expect(readRows[2].id).toBe(3);
	});
});