/**
 * Core Seed Module: ai-templates
 * 初始化 AI Prompt 模板
 *
 * Function: seedAiTemplates
 *
 * Description: 初始化预置 AI Prompt 模板（文本生成/图片生成/价格建议/一键生成）
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *   ctx(Object): 种子上下文
 *
 * Returns:
 *   created(number): 创建的模板数量
 *   skipped(number): 跳过的模板数量
 */

export const meta = {
  id: 'ai-templates',
  name: 'AI Prompt 模板',
  description: '初始化预置 AI Prompt 模板（文本生成/图片生成/价格建议/一键生成）',
  type: 'core',
  category: 'ai',
  dependsOn: [], // 不依赖其他模块
  plugin: null,  // AI 是常驻功能，不受插件控制
}

const TEMPLATES = [
  {
    slug: 'product_text_generation',
    name: '商品文案生成',
    category: 'product',
    content: `你是一个专业的商品文案撰写助手。请根据以下信息生成商品文案：

商品类型：{{kind}}
{{#if categoryNames}}所属分类：{{categoryNames}}{{/if}}
{{#if prompt}}补充要求：{{prompt}}{{/if}}

请生成以下内容（JSON 格式）：
{
  "name": "商品名称（简洁有力，15字以内）",
  "summary": "商品简介（一句话卖点，50字以内）",
  "description": "商品详细描述（突出卖点，200-500字）",
  "tags": ["标签1", "标签2", "标签3"]
}

要求：
1. 名称要吸引眼球，体现核心价值
2. 简洁有力地传达商品亮点
3. 详细描述要包含使用场景和用户价值
4. 标签覆盖核心特征，3-5个`,
    variables: ['kind', 'categoryNames', 'prompt'],
  },
  {
    slug: 'product_image_generation',
    name: '商品图片生成',
    category: 'product',
    content: `为以下商品生成封面图片：

商品类型：{{kind}}
{{#if categoryNames}}所属分类：{{categoryNames}}{{/if}}
{{#if prompt}}补充要求：{{prompt}}{{/if}}

要求：
1. 专业商业摄影风格
2. 突出商品核心特征
3. 背景简洁不喧宾夺主
4. 适合作为商品列表封面展示`,
    variables: ['kind', 'categoryNames', 'prompt'],
  },
  {
    slug: 'product_pricing_suggestion',
    name: '商品价格建议',
    category: 'product',
    content: `你是一个专业的商品定价顾问。请根据以下信息给出定价建议：

商品类型：{{kind}}
{{#if categoryNames}}所属分类：{{categoryNames}}{{/if}}
{{#if prompt}}补充要求：{{prompt}}{{/if}}

请分析并给出定价建议（JSON 格式）：
{
  "suggestedPrice": 建议价格（数字，单位：元）,
  "reasoning": "定价理由（考虑市场定位、目标用户、竞品分析等）"
}

定价考虑因素：
1. 目标用户群体的消费能力
2. 同类商品的市场价格区间
3. 商品的独特卖点和附加值
4. 合理的利润空间`,
    variables: ['kind', 'categoryNames', 'prompt'],
  },
  {
    slug: 'product_one_click',
    name: '商品一键生成',
    category: 'product',
    content: `你是一个专业的商品运营助手。请根据以下信息一键生成完整的商品信息：

商品类型：{{kind}}
{{#if categoryNames}}所属分类：{{categoryNames}}{{/if}}
{{#if prompt}}补充要求：{{prompt}}{{/if}}

请生成以下所有内容（JSON 格式）：
{
  "name": "商品名称（简洁有力，15字以内）",
  "summary": "商品简介（一句话卖点，50字以内）",
  "description": "商品详细描述（突出卖点，200-500字，可使用 HTML 格式）",
  "tags": ["标签1", "标签2", "标签3"],
  "imagePrompt": "封面图片描述（用于 AI 图片生成）",
  "suggestedPrice": 建议价格（数字，单位：元）,
  "priceReasoning": "定价理由"
}`,
    variables: ['kind', 'categoryNames', 'prompt'],
  },
]

export default async function seedAiTemplates(db, logger, ctx) {
  logger.info('开始初始化 AI Prompt 模板...')

  let created = 0
  let skipped = 0

  for (const template of TEMPLATES) {
    // 检查是否已存在
    const existing = await db.aiPromptTemplate.findFirst({
      where: { slug: template.slug, isActive: true },
    })

    if (existing) {
      logger.info(`模板已存在: ${template.slug}`, { id: existing.id })
      skipped++
      continue
    }

    await db.aiPromptTemplate.create({
      data: {
        slug: template.slug,
        name: template.name,
        category: template.category,
        content: template.content,
        variables: template.variables,
        version: 1,
        isActive: true,
      },
    })

    logger.success(`创建模板: ${template.name}`, { slug: template.slug })
    created++
  }

  logger.success(`AI Prompt 模板初始化完成`, { created, skipped })
  return { created, skipped }
}
