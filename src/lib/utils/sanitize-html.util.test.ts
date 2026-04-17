import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize-html.util'

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script><p>safe</p>'
    const result = sanitizeHtml(input)
    expect(result).toBe('<p>safe</p>')
  })

  it('should remove iframe tags', () => {
    const input = '<iframe src="https://evil.com"></iframe><p>safe</p>'
    const result = sanitizeHtml(input)
    expect(result).toBe('<p>safe</p>')
  })

  it('should remove onclick event attributes', () => {
    const input = '<p onclick="evil()">text</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('onclick')
  })

  it('should preserve safe tags like p and h1', () => {
    const input = '<p>paragraph</p><h1>heading</h1>'
    const result = sanitizeHtml(input)
    expect(result).toContain('<p>')
    expect(result).toContain('</p>')
    expect(result).toContain('<h1>')
    expect(result).toContain('</h1>')
  })

  it('should preserve anchor tags with href', () => {
    const input = '<a href="https://example.com" target="_blank">link</a>'
    const result = sanitizeHtml(input)
    expect(result).toContain('href=')
    expect(result).toContain('target=')
  })

  it('should preserve img tags with src and alt', () => {
    const input = '<img src="https://example.com/img.png" alt="description" />'
    const result = sanitizeHtml(input)
    expect(result).toContain('src=')
    expect(result).toContain('alt=')
  })

  it('should return empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null as any)).toBe('')
    expect(sanitizeHtml(undefined as any)).toBe('')
  })

  it('should return plain text unchanged', () => {
    const input = 'just plain text without any tags'
    const result = sanitizeHtml(input)
    expect(result).toBe(input)
  })
})
