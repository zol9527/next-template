import { describe, it, expect } from 'vitest'
import { generateSlug, resolveSlugConflict } from './slug.util'

describe('generateSlug', () => {
  it('should convert English title to lowercase with hyphens', () => {
    const result = generateSlug('Hello World 2024')
    expect(result).toBe('hello-world-2024')
  })

  it('should convert Chinese title to pinyin', () => {
    const result = generateSlug('测试文章标题')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toContain('测试')
  })

  it('should return untitled for empty input', () => {
    expect(generateSlug('')).toBe('untitled')
    expect(generateSlug(null as any)).toBe('untitled')
    expect(generateSlug(undefined as any)).toBe('untitled')
  })

  it('should remove special characters', () => {
    const result = generateSlug('Hello! @World#')
    expect(result).toBe('hello-world')
  })

  it('should merge consecutive hyphens', () => {
    const result = generateSlug('Hello   World---2024')
    expect(result).toBe('hello-world-2024')
  })

  it('should trim hyphens from ends', () => {
    const result = generateSlug('  Hello World  ')
    expect(result).toBe('hello-world')
  })

  it('should truncate to max length 100', () => {
    const longTitle = 'a'.repeat(150)
    const result = generateSlug(longTitle)
    expect(result.length).toBeLessThanOrEqual(100)
  })
})

describe('resolveSlugConflict', () => {
  it('should return original slug when no conflict exists', async () => {
    const checkFn = async () => false
    const result = await resolveSlugConflict('test', checkFn)
    expect(result).toBe('test')
  })

  it('should return original slug when checkFn returns false', async () => {
    const checkFn = async () => false
    const result = await resolveSlugConflict('test', checkFn)
    expect(result).toBe('test')
  })

  it('should append -2 when original slug conflicts', async () => {
    const checkFn = async (slug: string) => slug === 'test'
    const result = await resolveSlugConflict('test', checkFn)
    expect(result).toBe('test-2')
  })

  it('should increment suffix until find available slug', async () => {
    const usedSlugs = ['test', 'test-2', 'test-3']
    const checkFn = async (slug: string) => usedSlugs.includes(slug)
    const result = await resolveSlugConflict('test', checkFn)
    expect(result).toBe('test-4')
  })

  it('should throw error after max attempts', async () => {
    const checkFn = async () => true
    await expect(resolveSlugConflict('test', checkFn)).rejects.toThrow(
      '无法为 slug "test" 找到不冲突的名称'
    )
  })

  it('should throw error for empty slug', async () => {
    const checkFn = async () => false
    await expect(resolveSlugConflict('', checkFn)).rejects.toThrow('slug 不能为空')
  })
})
