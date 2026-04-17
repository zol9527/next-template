import { render, screen } from '@testing-library/react'
import { AgreementView } from '@/components/business/user/agreement/agreement-view'
import { describe, it, expect } from 'vitest'

// @vitest-environment jsdom

describe('AgreementView Security', () => {
  it('should add rel="noopener noreferrer" to links with target="_blank"', () => {
    const agreement = {
      id: 'test-id',
      type: 'USER_AGREEMENT',
      version: '1.0',
      title: 'Test Agreement',
      content: '<p>Please visit <a href="https://example.com" target="_blank">Example</a> for more info.</p>',
      effectiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    render(<AgreementView agreement={agreement} />)

    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('target', '_blank')

    // Verify that the security fix is working:
    // DOMPurify hook should add 'noopener noreferrer' to prevent Reverse Tabnabbing
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('should preserve existing rel attributes when adding noopener noreferrer', () => {
    const agreement = {
      id: 'test-id-preserve',
      type: 'USER_AGREEMENT',
      version: '1.0',
      title: 'Test Agreement Preserve',
      content: '<p>Link with nofollow: <a href="https://example.com" target="_blank" rel="nofollow">Nofollow</a></p>',
      effectiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    render(<AgreementView agreement={agreement} />)

    const link = screen.getByRole('link', { name: 'Nofollow' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('should not affect links without target="_blank"', () => {
    const agreement = {
      id: 'test-id-2',
      type: 'USER_AGREEMENT',
      version: '1.0',
      title: 'Test Agreement 2',
      content: '<p>Internal link: <a href="/internal">Internal</a></p>',
      effectiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    render(<AgreementView agreement={agreement} />)

    const link = screen.getByRole('link', { name: 'Internal' })
    expect(link).toBeInTheDocument()
    expect(link).not.toHaveAttribute('target')
    // rel should be null or empty
    expect(link).not.toHaveAttribute('rel')
  })
})
