/**
 * Function: mergeSchemas
 *
 * Description: Prisma Schema 合并脚本
 *   根据 PLUGIN_* 环境变量，将 base.prisma 与各插件 schema 合并为最终 schema.prisma。
 *   核心逻辑：
 *   1. 读取 base.prisma 作为基础
 *   2. 根据环境变量决定是否追加 plugin-*.prisma 中的模型定义
 *   3. 在 base 模型的占位标记处注入插件声明的 relation 字段
 *   4. 输出到 prisma/schema.prisma
 *
 * Usage:
 *   bun run scripts/prisma/merge-schemas.ts
 *   PLUGIN_WECHAT=true PLUGIN_ECOMMERCE=true bun run scripts/prisma/merge-schemas.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── 路径解析 ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");
const SCHEMAS_DIR = resolve(PROJECT_ROOT, "prisma/schemas");
const OUTPUT_PATH = resolve(PROJECT_ROOT, "prisma/schema.prisma");

/**
 * Function: loadScriptEnvFiles
 *
 * Description: 为独立脚本显式加载环境变量，避免依赖运行时的自动加载策略。
 *   development 环境允许 .env.local 参与覆盖；production/test 则只读取对应环境文件，
 *   避免打包时被开发者本地 .env.local 污染。
 */
function loadScriptEnvFiles(): void {
  const nodeEnv = process.env.NODE_ENV || "development";
  const envFiles = [`.env.${nodeEnv}.local`];

  if (nodeEnv === "development") {
    envFiles.push(".env.local");
  }

  envFiles.push(`.env.${nodeEnv}`, ".env");

  for (const file of envFiles) {
    try {
      process.loadEnvFile(resolve(PROJECT_ROOT, file));
      return;
    } catch {
      // 文件不存在，继续尝试下一个
    }
  }
}

// ── 插件配置 ──
// 每个 plugin 声明: 文件名、主环境变量 key、备用环境变量 key
const PLUGINS = [
  {
    name: "wechat",
    file: "plugin-wechat.prisma",
    envKey: "PLUGIN_WECHAT",
    envKeyAlt: null,
  },
  {
    name: "commerce",
    file: "plugin-commerce.prisma",
    envKey: "PLUGIN_ECOMMERCE",
    envKeyAlt: "PLUGIN_PROMOTION", // 任一启用即合并
  },
] as const;

// ── 常驻 schema（不受 PLUGIN_* 环境变量控制）──
const ALWAYS_INCLUDE_SCHEMAS = ["ai.prisma"] as const;

// ── 工具函数 ──

/**
 * Function: isPluginEnabled
 *
 * Description: 检查插件是否通过环境变量启用
 *
 * Parameters:
 *   plugin(PluginConfig): 插件配置对象
 *
 * Returns:
 *   boolean: 插件是否启用
 */
function isPluginEnabled(plugin: (typeof PLUGINS)[number]): boolean {
  const keys = [plugin.envKey, plugin.envKeyAlt].filter(
    (k) => k !== null
  ) as string[];
  return keys.some((key) => {
    const val = process.env[key];
    return val === "true" || val === "1";
  });
}

/**
 * Function: extractModelDefinitions
 *
 * Description: 从插件 schema 文件中提取 model 定义
 *   只提取 model XXX { ... } 块，忽略注释、空行和非 model 内容
 *
 * Parameters:
 *   content(string): 插件 schema 文件内容
 *
 * Returns:
 *   string: 提取的 model 定义块（带换行分隔）
 */
function extractModelDefinitions(content: string): string {
  const lines = content.split("\n");
  const modelBlocks: string[] = [];
  let insideModel = false;
  let braceDepth = 0;
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!insideModel && /^model\s+\w+\s*\{/.test(trimmed)) {
      insideModel = true;
      braceDepth = 0;
      currentBlock = [line];
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth === 0) {
        modelBlocks.push(currentBlock.join("\n"));
        insideModel = false;
        currentBlock = [];
      }
      continue;
    }

    if (insideModel) {
      currentBlock.push(line);
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0) {
        modelBlocks.push(currentBlock.join("\n"));
        insideModel = false;
        currentBlock = [];
      }
    }
  }

  return modelBlocks.join("\n\n");
}

/**
 * Function: extractModelInjections
 *
 * Description: 从插件 schema 中提取所有 {{PLUGIN_MODEL_INJECTIONS:<name>}} 标记后的字段定义
 *   通用版本：支持任意 base 模型的字段注入
 *
 * Parameters:
 *   content(string): 插件 schema 文件内容
 *   pluginName(string): 插件名称（如 'wechat', 'commerce'）
 *
 * Returns:
 *   Map<string, string>: modelName → 字段定义的映射
 */
function extractModelInjections(
  content: string,
  pluginName: string
): Map<string, string> {
  const result = new Map<string, string>();
  const markerPattern = /\{\{PLUGIN_MODEL_INJECTIONS:(\w+):(\w+)\}\}/;
  const lines = content.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const match = lines[lineIdx].match(markerPattern);
    if (!match) continue;

    const targetModel = match[1];
    const markerPlugin = match[2];
    if (markerPlugin !== pluginName) continue;

    const fieldLines: string[] = [];
    for (let i = lineIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // 先检查是否到达下一个标记（即使该行是注释也要检查）
      if (trimmed.includes("{{PLUGIN_MODEL_INJECTIONS:")) break;

      // 跳过空行和纯注释行
      if (trimmed === "" || trimmed.startsWith("//")) continue;

      fieldLines.push(trimmed);
    }

    if (fieldLines.length > 0) {
      const existing = result.get(targetModel) || "";
      result.set(targetModel, existing ? `${existing}\n${fieldLines.join("\n")}` : fieldLines.join("\n"));
    }
  }

  return result;
}

/**
 * Function: injectModelFields
 *
 * Description: 在 base schema 中查找所有 {{PLUGIN_MODEL_INJECTIONS:<ModelName>}} 占位标记，
 *   并将收集到的插件字段注入到对应位置
 *
 * Parameters:
 *   baseContent(string): base.prisma 内容
 *   modelInjections(Map<string, string>): modelName → 字段定义的映射
 *
 * Returns:
 *   string: 注入后的内容
 */
function injectModelFields(
  baseContent: string,
  modelInjections: Map<string, string>
): string {
  let result = baseContent;

  for (const [modelName, fields] of modelInjections) {
    const placeholder = `// {{PLUGIN_MODEL_INJECTIONS:${modelName}}}`;

    if (!result.includes(placeholder)) {
      console.warn(
        `⚠️  base.prisma 中未找到 ${placeholder} 占位注释，跳过 ${modelName} 字段注入`
      );
      continue;
    }

    const indentedFields = fields
      .split("\n")
      .map((line) => (line.trim() ? `  ${line.trim()}` : ""))
      .join("\n");

    result = result.replace(placeholder, `${indentedFields}\n\n  ${placeholder}`);
    console.log(`✅ 已注入 ${modelName} 的插件字段 (${fields.split("\n").length} 行)`);
  }

  return result;
}

// ── 主流程 ──

function main(): void {
  loadScriptEnvFiles();
  console.log("🔄 Prisma Schema 合并开始...\n");

  // 1. 读取 base.prisma
  const basePath = resolve(SCHEMAS_DIR, "base.prisma");
  if (!existsSync(basePath)) {
    console.error(`❌ base.prisma 不存在: ${basePath}`);
    process.exit(1);
  }

  let merged = readFileSync(basePath, "utf-8");
  console.log(`✅ 读取 base.prisma (${merged.split("\n").length} 行)`);

  // 2. 处理常驻 schema（不受 PLUGIN_* 环境变量控制）
  const allModelInjections = new Map<string, string>();

  for (const schemaFile of ALWAYS_INCLUDE_SCHEMAS) {
    const schemaPath = resolve(SCHEMAS_DIR, schemaFile);
    if (!existsSync(schemaPath)) {
      console.warn(`⚠️  常驻 schema 文件不存在: ${schemaPath}`);
      continue;
    }

    const content = readFileSync(schemaPath, "utf-8");
    const modelDefs = extractModelDefinitions(content);

    if (modelDefs.trim()) {
      merged += `\n\n${modelDefs}`;
      console.log(`✅ 常驻 schema ${schemaFile}: 已追加模型`);
    }

    // 提取各 base 模型的字段注入
    const injections = extractModelInjections(content, "ai");
    for (const [modelName, fields] of injections) {
      const existing = allModelInjections.get(modelName) || "";
      allModelInjections.set(modelName, existing ? `${existing}\n${fields}` : fields);
      console.log(`✅ 常驻 schema ${schemaFile}: 已收集 ${modelName} 注入字段`);
    }
  }

  // 3. 遍历插件，根据环境变量决定是否追加
  for (const plugin of PLUGINS) {
    const enabled = isPluginEnabled(plugin);

    if (!enabled) {
      console.log(`⏭️  插件 ${plugin.name}: 未启用 (跳过)`);
      continue;
    }

    const pluginPath = resolve(SCHEMAS_DIR, plugin.file);
    if (!existsSync(pluginPath)) {
      console.warn(`⚠️  插件文件不存在: ${pluginPath}`);
      continue;
    }

    const pluginContent = readFileSync(pluginPath, "utf-8");

    // 提取 model 定义并追加
    const modelDefs = extractModelDefinitions(pluginContent);
    if (modelDefs.trim()) {
      merged += `\n\n${modelDefs}`;
      console.log(
        `✅ 插件 ${plugin.name}: 已追加模型 (${pluginContent.split("\n").length} 行)`
      );
    }

    // 提取各 base 模型的字段注入
    const injections = extractModelInjections(pluginContent, plugin.name);
    for (const [modelName, fields] of injections) {
      const existing = allModelInjections.get(modelName) || "";
      allModelInjections.set(
        modelName,
        existing ? `${existing}\n${fields}` : fields
      );
      console.log(`✅ 插件 ${plugin.name}: 已收集 ${modelName} 注入字段`);
    }
  }

  // 3. 注入字段到 base 中的各模型
  if (allModelInjections.size > 0) {
    merged = injectModelFields(merged, allModelInjections);
  }

  // 4. 确保输出目录存在并写入
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, merged, "utf-8");
  console.log(`\n✅ 合并完成 → ${OUTPUT_PATH} (${merged.split("\n").length} 行)`);
}

main();
