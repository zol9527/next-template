/**
 * AI 模型成本价格表
 *
 * @module lib/ai/cost-table
 * @description 各 AI 模型的单价表，用于计算每次调用的费用
 */

/** 模型定价信息 */
export interface ModelPricing {
  /** 输入价格（每 1000 tokens，单位：元） */
  inputPricePer1kTokens: number
  /** 输出价格（每 1000 tokens，单位：元） */
  outputPricePer1kTokens: number
  /** 图片生成价格（每次，单位：元） */
  pricePerImage?: number
}

/**
 * 模型成本价格表
 *
 * Description: 以模型名称为 key 的价格映射表
 */
const COST_TABLE: Record<string, ModelPricing> = {
  'MiniMax-M2.7': {
    inputPricePer1kTokens: 0.001,
    outputPricePer1kTokens: 0.001,
  },
  'image-01': {
    inputPricePer1kTokens: 0,
    outputPricePer1kTokens: 0,
    pricePerImage: 0.04,
  },
}

/**
 * Function: calculateCost
 *
 * Description: 计算 AI 文本调用费用
 *
 * Parameters:
 *   model(string): 模型名称
 *   inputTokens(number): 输入 token 数
 *   outputTokens(number): 输出 token 数
 *
 * Returns:
 *   cost(number): 费用（元），未知模型返回 0
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = COST_TABLE[model]
  if (!pricing) return 0
  return (inputTokens / 1000) * pricing.inputPricePer1kTokens
    + (outputTokens / 1000) * pricing.outputPricePer1kTokens
}

/**
 * Function: calculateImageCost
 *
 * Description: 计算图片生成费用
 *
 * Parameters:
 *   model(string): 模型名称
 *   count(number): 生成图片数量，默认 1
 *
 * Returns:
 *   cost(number): 费用（元），未知模型返回 0
 */
export function calculateImageCost(model: string, count: number = 1): number {
  const pricing = COST_TABLE[model]
  if (!pricing?.pricePerImage) return 0
  return pricing.pricePerImage * count
}
