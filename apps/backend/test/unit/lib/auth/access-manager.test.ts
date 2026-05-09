import { describe, it, expect } from 'vitest'
import { createAccessManager } from '@/lib/auth/access-manager'
import type { Grant } from '@/config/access'

describe('createAccessManager', () => {
  const grants: Grant[] = [
    { action: 'read', scope: 'users' },
    { action: 'write', scope: 'users' },
    { action: 'read', scope: 'orders' },
    { action: 'execute', scope: 'orders.promoter' },
  ]

  it('has() exact match returns true', () => {
    const am = createAccessManager(grants)
    expect(am.has({ action: 'read', scope: 'users' })).toBe(true)
    expect(am.has({ action: 'write', scope: 'users' })).toBe(true)
    expect(am.has({ action: 'read', scope: 'orders' })).toBe(true)
  })

  it('has() no match returns false', () => {
    const am = createAccessManager(grants)
    expect(am.has({ action: 'write', scope: 'orders' })).toBe(false)
    expect(am.has({ action: 'read', scope: 'products' })).toBe(false)
    expect(am.has({ action: 'execute', scope: 'users' })).toBe(false)
  })

  it('has() does NOT inherit child scopes', () => {
    const am = createAccessManager(grants)
    // has orders.read but NOT orders.promoter.read
    expect(am.has({ action: 'read', scope: 'orders' })).toBe(true)
    expect(am.has({ action: 'read', scope: 'orders.promoter' })).toBe(false)
  })

  it('has() does NOT inherit parent scopes', () => {
    const am = createAccessManager(grants)
    // has orders.promoter.execute but NOT orders.execute
    expect(am.has({ action: 'execute', scope: 'orders.promoter' })).toBe(true)
    expect(am.has({ action: 'execute', scope: 'orders' })).toBe(false)
  })

  it('assert() throws ForbiddenError on no match', () => {
    const am = createAccessManager(grants)
    expect(() => am.assert({ action: 'read', scope: 'products' })).toThrow()
  })

  it('assert() does not throw on match', () => {
    const am = createAccessManager(grants)
    expect(() => am.assert({ action: 'read', scope: 'users' })).not.toThrow()
  })

  it('canRead() convenience method', () => {
    const am = createAccessManager(grants)
    expect(am.canRead('users')).toBe(true)
    expect(am.canRead('products')).toBe(false)
  })

  it('canWrite() convenience method', () => {
    const am = createAccessManager(grants)
    expect(am.canWrite('users')).toBe(true)
    expect(am.canWrite('orders')).toBe(false)
  })

  it('canExecute() convenience method', () => {
    const am = createAccessManager(grants)
    expect(am.canExecute('orders.promoter')).toBe(true)
    expect(am.canExecute('users')).toBe(false)
  })

  it('scopesFor() returns scopes for a given action', () => {
    const am = createAccessManager(grants)
    expect(am.scopesFor('read')).toEqual(['users', 'orders'])
    expect(am.scopesFor('write')).toEqual(['users'])
    expect(am.scopesFor('execute')).toEqual(['orders.promoter'])
  })

  it('hasAny() returns true if any request matches', () => {
    const am = createAccessManager(grants)
    expect(am.hasAny(
      { action: 'read', scope: 'products' },
      { action: 'read', scope: 'users' },
    )).toBe(true)
    expect(am.hasAny(
      { action: 'read', scope: 'products' },
      { action: 'write', scope: 'products' },
    )).toBe(false)
  })

  it('hasAll() returns true only if all requests match', () => {
    const am = createAccessManager(grants)
    expect(am.hasAll(
      { action: 'read', scope: 'users' },
      { action: 'read', scope: 'orders' },
    )).toBe(true)
    expect(am.hasAll(
      { action: 'read', scope: 'users' },
      { action: 'read', scope: 'products' },
    )).toBe(false)
  })

  it('grants returns a read-only snapshot', () => {
    const am = createAccessManager(grants)
    expect(am.grants).toEqual(grants)
    expect(am.grants).not.toBe(grants) // different reference (copy)
  })

  it('empty grants yields all false', () => {
    const am = createAccessManager([])
    expect(am.canRead('users')).toBe(false)
    expect(am.canWrite('users')).toBe(false)
    expect(am.canExecute('users')).toBe(false)
    expect(am.grants).toEqual([])
  })
})
