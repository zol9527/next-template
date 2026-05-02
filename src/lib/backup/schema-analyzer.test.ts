/**
 * Schema Analyzer 模块测试
 *
 * 覆盖：跳过列表、拓扑排序（线性链/自引用/循环/空图/跳过过滤）、
 * FK 图构建、表名映射。
 */

import { describe, it, expect, vi } from "vitest";
import {
	getSkipList,
	topologicalSort,
	getForeignKeyGraph,
	getTableNameMapping,
} from "./schema-analyzer";
import type { ForeignKeyGraph, ForeignKeyRelation } from "./schema-analyzer";

/**
 * Function: buildGraph
 * Description: 从关系列表快速构建 FK 图的辅助函数
 */
function buildGraph(relations: ForeignKeyRelation[]): ForeignKeyGraph {
	const graph: ForeignKeyGraph = new Map();
	for (const rel of relations) {
		if (!graph.has(rel.fromTable)) {
			graph.set(rel.fromTable, []);
		}
		graph.get(rel.fromTable)!.push(rel);
	}
	return graph;
}

describe("getSkipList", () => {
	it("应返回包含所有需跳过表的数组", () => {
		const skipList = getSkipList();

		expect(skipList).toContain("backup_jobs");
		expect(skipList).toContain("prisma_migrations");
		expect(skipList).toContain("rate_limit_counters");
		expect(skipList).toContain("sessions");
		expect(skipList).toContain("idempotency_requests");
		expect(skipList).toContain("mfa_action_tokens");
		expect(skipList).toContain("_prisma_migrations");
	});

	it("应恰好返回 7 个表名", () => {
		expect(getSkipList()).toHaveLength(7);
	});

	it("每次调用应返回新数组（不可变副本）", () => {
		const first = getSkipList();
		const second = getSkipList();
		expect(first).not.toBe(second);
		expect(first).toEqual(second);
	});
});

describe("topologicalSort", () => {
	it("应正确排序线性链 A→B→C（依赖序：无入度的先输出）", () => {
		const graph = buildGraph([
			{ fromTable: "A", fromColumn: "b_id", toTable: "B", toColumn: "id" },
			{ fromTable: "B", fromColumn: "c_id", toTable: "C", toColumn: "id" },
		]);

		const result = topologicalSort(graph, ["A", "B", "C"]);

		// Kahn 算法：入度为 0 的先出队，A 无入度先输出，B 次之，C 最后
		const indexOfA = result.orderedTables.indexOf("A");
		const indexOfB = result.orderedTables.indexOf("B");
		const indexOfC = result.orderedTables.indexOf("C");

		expect(indexOfA).toBeLessThan(indexOfB);
		expect(indexOfB).toBeLessThan(indexOfC);
		expect(result.selfReferencing).toHaveLength(0);
		expect(result.cycles).toHaveLength(0);
	});

	it("应检测自引用表（BlogCategory → BlogCategory）", () => {
		const graph = buildGraph([
			{ fromTable: "BlogCategory", fromColumn: "parentId", toTable: "BlogCategory", toColumn: "id" },
		]);

		const result = topologicalSort(graph, ["BlogCategory"]);

		expect(result.selfReferencing).toContain("BlogCategory");
		expect(result.orderedTables).toContain("BlogCategory");
		expect(result.cycles).toHaveLength(0);
	});

	it("应检测循环依赖（Order → CommissionRecord → SettlementItem）", () => {
		const graph = buildGraph([
			{ fromTable: "Order", fromColumn: "commission_id", toTable: "CommissionRecord", toColumn: "id" },
			{ fromTable: "CommissionRecord", fromColumn: "settlement_id", toTable: "SettlementItem", toColumn: "id" },
			{ fromTable: "SettlementItem", fromColumn: "order_id", toTable: "Order", toColumn: "id" },
		]);

		const result = topologicalSort(graph, ["Order", "CommissionRecord", "SettlementItem"]);

		expect(result.cycles.length).toBeGreaterThanOrEqual(1);
		const allCycleNodes = result.cycles.flat();
		expect(allCycleNodes).toContain("Order");
		expect(allCycleNodes).toContain("CommissionRecord");
		expect(allCycleNodes).toContain("SettlementItem");
	});

	it("应在空图中返回所有表且无自引用和循环", () => {
		const graph: ForeignKeyGraph = new Map();
		const allTables = ["Users", "Posts", "Comments"];

		const result = topologicalSort(graph, allTables);

		expect(result.orderedTables).toContain("Users");
		expect(result.orderedTables).toContain("Posts");
		expect(result.orderedTables).toContain("Comments");
		expect(result.orderedTables).toHaveLength(3);
		expect(result.selfReferencing).toHaveLength(0);
		expect(result.cycles).toHaveLength(0);
	});

	it("应过滤掉 skip list 中的表", () => {
		const graph = buildGraph([
			{ fromTable: "User", fromColumn: "role_id", toTable: "Role", toColumn: "id" },
		]);

		const result = topologicalSort(graph, [
			"User",
			"Role",
			"backup_jobs",
			"prisma_migrations",
			"sessions",
		]);

		expect(result.orderedTables).not.toContain("backup_jobs");
		expect(result.orderedTables).not.toContain("prisma_migrations");
		expect(result.orderedTables).not.toContain("sessions");
		expect(result.orderedTables).toContain("User");
		expect(result.orderedTables).toContain("Role");
	});

	it("应处理混合场景：自引用 + 循环 + 正常依赖", () => {
		const graph = buildGraph([
			// 自引用
			{ fromTable: "Category", fromColumn: "parentId", toTable: "Category", toColumn: "id" },
			// 正常依赖
			{ fromTable: "Post", fromColumn: "category_id", toTable: "Category", toColumn: "id" },
			{ fromTable: "Comment", fromColumn: "post_id", toTable: "Post", toColumn: "id" },
			// 循环
			{ fromTable: "X", fromColumn: "y_id", toTable: "Y", toColumn: "id" },
			{ fromTable: "Y", fromColumn: "x_id", toTable: "X", toColumn: "id" },
		]);

		const result = topologicalSort(graph, ["Category", "Post", "Comment", "X", "Y"]);

		expect(result.selfReferencing).toContain("Category");
		expect(result.cycles.length).toBeGreaterThanOrEqual(1);

		// Kahn 排序：Comment(入度0) → Post → Category，自引用不影响排序方向
		const commentIdx = result.orderedTables.indexOf("Comment");
		const postIdx = result.orderedTables.indexOf("Post");
		const catIdx = result.orderedTables.indexOf("Category");
		expect(commentIdx).toBeLessThan(postIdx);
		expect(postIdx).toBeLessThan(catIdx);
	});

	it("应忽略指向 skip list 表的外键关系", () => {
		const graph = buildGraph([
			{ fromTable: "User", fromColumn: "session_id", toTable: "sessions", toColumn: "id" },
		]);

		const result = topologicalSort(graph, ["User", "sessions"]);

		expect(result.orderedTables).not.toContain("sessions");
		expect(result.orderedTables).toContain("User");
	});
});

describe("getForeignKeyGraph", () => {
	it("应从数据库查询结果构建 FK 图", async () => {
		const mockRows: ForeignKeyRelation[] = [
			{ fromTable: "Post", fromColumn: "author_id", toTable: "User", toColumn: "id" },
			{ fromTable: "Comment", fromColumn: "post_id", toTable: "Post", toColumn: "id" },
			{ fromTable: "Comment", fromColumn: "author_id", toTable: "User", toColumn: "id" },
		];

		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue(mockRows),
		};

		const graph = await getForeignKeyGraph(prisma, "test_db");

		expect(graph.has("Post")).toBe(true);
		expect(graph.has("Comment")).toBe(true);
		expect(graph.has("User")).toBe(false);

		expect(graph.get("Post")).toHaveLength(1);
		expect(graph.get("Comment")).toHaveLength(2);

		expect(prisma.$queryRaw).toHaveBeenCalledOnce();
	});

	it("应正确处理空结果集", async () => {
		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue([]),
		};

		const graph = await getForeignKeyGraph(prisma, "empty_db");

		expect(graph.size).toBe(0);
	});

	it("应将同一表的多个 FK 关系分组到同一数组", async () => {
		const mockRows: ForeignKeyRelation[] = [
			{ fromTable: "Order", fromColumn: "user_id", toTable: "User", toColumn: "id" },
			{ fromTable: "Order", fromColumn: "product_id", toTable: "Product", toColumn: "id" },
			{ fromTable: "Order", fromColumn: "coupon_id", toTable: "Coupon", toColumn: "id" },
		];

		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue(mockRows),
		};

		const graph = await getForeignKeyGraph(prisma, "test_db");

		expect(graph.get("Order")).toHaveLength(3);
		const relations = graph.get("Order")!;
		expect(relations[0].toTable).toBe("User");
		expect(relations[1].toTable).toBe("Product");
		expect(relations[2].toTable).toBe("Coupon");
	});
});

describe("getTableNameMapping", () => {
	it("应从数据库查询结果构建表名映射", async () => {
		const mockRows = [
			{ TABLE_NAME: "User", TABLE_COMMENT: "用户表" },
			{ TABLE_NAME: "Post", TABLE_COMMENT: "文章表" },
			{ TABLE_NAME: "Comment", TABLE_COMMENT: "评论表" },
		];

		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue(mockRows),
		};

		const mapping = await getTableNameMapping(prisma, "test_db");

		expect(mapping.size).toBe(3);
		expect(mapping.get("User")).toBe("User");
		expect(mapping.get("Post")).toBe("Post");
		expect(mapping.get("Comment")).toBe("Comment");
	});

	it("应正确处理空数据库", async () => {
		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue([]),
		};

		const mapping = await getTableNameMapping(prisma, "empty_db");

		expect(mapping.size).toBe(0);
	});

	it("映射的 key 和 value 应相同（identity 映射）", async () => {
		const mockRows = [
			{ TABLE_NAME: "roles", TABLE_COMMENT: "" },
			{ TABLE_NAME: "permissions", TABLE_COMMENT: "" },
		];

		const prisma = {
			$queryRaw: vi.fn().mockResolvedValue(mockRows),
		};

		const mapping = await getTableNameMapping(prisma, "test_db");

		for (const [key, value] of mapping.entries()) {
			expect(key).toBe(value);
		}
	});
});
