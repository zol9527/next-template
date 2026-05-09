/**
 * File: test/unit/lib/ai/cost-table.test.ts
 * Description: AI 模型费用计算单元测试
 *   测试文本生成、图片生成费用计算及边界条件
 */

import { describe, it, expect } from 'vitest'
import { calculateCost, calculateImageCost } from '@/lib/ai/cost-table'

// ==================== calculateCost ====================

describe('Unit: calculateCost', () => {
  it('应正确计算 MiniMax-M2.7 文本生成费用', () => {
    // inputPricePer1kTokens: 0.001, outputPricePer1kTokens: 0.001
    const cost = calculateCost('MiniMax-M2.7', 1000, 2000)

    // (1000/1000)*0.001 + (2000/1000)*0.001 = 0.001 + 0.002 = 0.003
    expect(cost).toBeCloseTo(0.003, 6)
  })

  it('应正确计算仅输入 token 的费用', () => {
    const cost = calculateCost('MiniMax-M2.7', 5000, 0)

    // (5000/1000)*0.001 + 0 = 0.005
    expect(cost).toBeCloseTo(0.005, 6)
  })

  it('应正确计算仅输出 token 的费用', () => {
    const cost = calculateCost('MiniMax-M2.7', 0, 3000)

    // 0 + (3000/1000)*0.001 = 0.003
    expect(cost).toBeCloseTo(0.003, 6)
  })

  it('未知模型应返回 0', () => {
    const cost = calculateCost('unknown-model', 1000, 1000)

    expect(cost).toBe(0)
  })

  it('0 token 时费用应为 0', () => {
    const cost = calculateCost('MiniMax-M2.7', 0, 0)

    expect(cost).toBe(0)
  })

  it('大 token 数应正确计算', () => {
    const cost = calculateCost('MiniMax-M2.7', 100000, 50000)

    // (100000/1000)*0.001 + (50000/1000)*0.001 = 0.1 + 0.05 = 0.15
    expect(cost).toBeCloseTo(0.15, 6)
  })
})

// ==================== calculateImageCost ====================

describe('Unit: calculateImageCost', () => {
  it('应正确计算 image-01 单张图片费用', () => {
    // pricePerImage: 0.04
    const cost = calculateImageCost('image-01')

    expect(cost).toBeCloseTo(0.04, 6)
  })

  it('应正确计算多张图片费用', () => {
    const cost = calculateImageCost('image-01', 5)

    // 0.04 * 5 = 0.2
    expect(cost).toBeCloseTo(0.2, 6)
  })

  it('0 张图片费用应为 0', () => {
    const cost = calculateImageCost('image-01', 0)

    expect(cost).toBe(0)
  })

  it('不支持图片的模型应返回 0', () => {
    const cost = calculateImageCost('MiniMax-M2.7')

    expect(cost).toBe(0)
  })

  it('未知模型应返回 0', () => {
    const cost = calculateImageCost('unknown-model', 3)

    expect(cost).toBe(0)
  })
})
