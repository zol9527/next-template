/**
 * Module: toc
 *
 * Description: TOC（目录）解析工具 — 从 HTML 字符串中提取 h2/h3 标题信息并注入 ID 锚点
 *
 * =============================================================================
 *
 * 功能说明：
 * - extractTocItems: 从 HTML 内容中提取 h2/h3 标题，返回目录结构数据
 * - injectHeadingIds: 为 HTML 中的 h2/h3 标签注入唯一 id 属性，用于锚点定位
 *
 * =============================================================================
 */

import { slugify } from 'transliteration';

/**
 * Interface: TocItem
 *
 * Description: 目录项数据结构，对应 HTML 中的一个 h2 或 h3 标题
 */
export interface TocItem {
	/** 标题的 DOM id，用于锚点定位 */
	id: string;
	/** 标题的纯文本内容 */
	text: string;
	/** 标题层级：2 对应 h2，3 对应 h3 */
	level: number;
}

/**
 * 匹配 h2 和 h3 标签的正则表达式
 * 捕获组：1=标签名(h2|h3), 2=已有属性, 3=标签内文本内容
 */
const HEADING_REGEX = /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi;

/**
 * 匹配已有 id 属性的正则
 */
const EXISTING_ID_REGEX = /id=["']([^"']*)["']/i;

/**
 * Function: stripHtmlTags
 *
 * Description: 移除 HTML 标签，返回纯文本
 *
 * Parameters:
 *   html(string): 包含 HTML 标签的字符串
 *
 * Returns:
 *   string: 纯文本内容
 */
function stripHtmlTags(html: string): string {
	return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Function: generateHeadingId
 *
 * Description: 根据标题文本生成唯一的 URL-safe ID
 * 使用 transliteration 的 slugify 将中文转拼音并生成合法 ID
 *
 * Parameters:
 *   text(string): 标题纯文本
 *   index(number): 标题在文档中的序号，用于去重保底
 *
 * Returns:
 *   string: 生成的 id，格式为 "heading-{slug}" 或 "heading-{index}"
 */
function generateHeadingId(text: string, index: number): string {
	const cleanText = stripHtmlTags(text);
	const slug = slugify(cleanText, { lowercase: true, separator: '-' });

	// slugify 可能在极端情况下返回空字符串，此时使用序号保底
	if (!slug || slug.length === 0) {
		return `heading-${index}`;
	}

	return `heading-${slug}`;
}

/**
 * Function: extractTocItems
 *
 * Description: 从 HTML 内容中提取 h2/h3 标题信息，生成目录数据
 * 不修改原始 HTML，仅解析并返回标题列表
 *
 * Parameters:
 *   html(string): HTML 内容字符串
 *
 * Returns:
 *   TocItem[]: 目录项列表，按文档中出现顺序排列
 */
export function extractTocItems(html: string): TocItem[] {
	if (!html || typeof html !== 'string') {
		return [];
	}

	const items: TocItem[] = [];
	const usedIds = new Set<string>();
	let headingIndex = 0;

	// 重置正则状态（避免全局匹配残留）
	const regex = new RegExp(HEADING_REGEX.source, HEADING_REGEX.flags);

	const matches = html.matchAll(regex);
	for (const match of matches) {
		const tagName = match[1]; // "h2" 或 "h3"
		const existingAttrs = match[2]; // 已有属性字符串
		const rawContent = match[3]; // 标签内原始内容（可能含子标签）

		const level = parseInt(tagName.charAt(1), 10); // 2 或 3
		const text = stripHtmlTags(rawContent);

		if (!text) {
			continue;
		}

		// 检查是否已有 id
		const idMatch = EXISTING_ID_REGEX.exec(existingAttrs);
		let id: string;

		if (idMatch && idMatch[1]) {
			// 已有 id，直接使用
			id = idMatch[1];
		} else {
			// 生成新 id，确保唯一
			id = generateHeadingId(text, headingIndex);
			let counter = 1;
			while (usedIds.has(id)) {
				id = `${generateHeadingId(text, headingIndex)}-${++counter}`;
			}
		}

		usedIds.add(id);
		headingIndex++;

		items.push({ id, text, level });
	}

	return items;
}

/**
 * Function: injectHeadingIds
 *
 * Description: 解析 HTML，给所有 h2/h3 标签注入唯一 id 属性
 * 如果标签已有 id 则保留，否则根据文本内容生成 slug-based id
 * 返回修改后的 HTML 字符串，适用于 Server Component 环境（不依赖 DOMParser）
 *
 * Parameters:
 *   html(string): 原始 HTML 内容字符串
 *
 * Returns:
 *   string: 注入 id 后的 HTML 字符串
 */
export function injectHeadingIds(html: string): string {
	if (!html || typeof html !== 'string') {
		return html;
	}

	const usedIds = new Set<string>();
	let headingIndex = 0;

	return html.replace(HEADING_REGEX, (fullMatch, tagName, attrs, content) => {
		// 检查是否已有 id
		const idMatch = EXISTING_ID_REGEX.exec(attrs);
		headingIndex++;

		if (idMatch) {
			// 已有 id，保持不变
			usedIds.add(idMatch[1]);
			return fullMatch;
		}

		// 生成唯一 id
		const text = stripHtmlTags(content);
		let id = generateHeadingId(text, headingIndex - 1);
		let counter = 1;
		while (usedIds.has(id)) {
			id = `${generateHeadingId(text, headingIndex - 1)}-${++counter}`;
		}
		usedIds.add(id);

		// 注入 id 到标签属性中
		return `<${tagName} id="${id}"${attrs}>${content}</${tagName}>`;
	});
}
