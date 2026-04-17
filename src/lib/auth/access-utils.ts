/**
 * File: access-utils.ts
 * Description: Scope type derivation and runtime utilities
 */

import { SCOPE_TREE } from '@/config/access/scope-tree'

// ── Type level: derive all scope paths from nested tree ──

type ScopeNode = {
  readonly description: string
  readonly children?: Record<string, ScopeNode>
}

type DeriveScopes<
  T extends Record<string, ScopeNode>,
  Prefix extends string = '',
> = {
  [K in keyof T & string]:
    T[K] extends { readonly children: infer C extends Record<string, ScopeNode> }
      ? `${Prefix}${K}` | DeriveScopes<C, `${Prefix}${K}.`>
      : `${Prefix}${K}`
}[keyof T & string]

/** All valid scope keys as a union type — typos are caught at compile time */
export type Scope = DeriveScopes<typeof SCOPE_TREE>

// ── Runtime level ──

let _flatScopeCache: ReadonlyMap<string, string> | null = null

/**
 * Flatten the nested scope tree into a Map<scopeKey, description>.
 * Result is cached — only computed once.
 */
export function flattenScopeTree(): ReadonlyMap<string, string> {
  if (_flatScopeCache) return _flatScopeCache

  const result = new Map<string, string>()

  function walk(node: Record<string, ScopeNode>, prefix: string = '') {
    for (const [key, value] of Object.entries(node)) {
      const scopeKey = `${prefix}${key}`
      result.set(scopeKey, value.description)

      if (value.children) {
        walk(value.children, `${scopeKey}.`)
      }
    }
  }

  walk(SCOPE_TREE)
  _flatScopeCache = result
  return result
}

/**
 * Validate whether a string is a valid scope key.
 * Acts as a TypeScript type guard.
 */
export function isValidScope(key: string): key is Scope {
  return flattenScopeTree().has(key)
}

/**
 * Get all scope keys as an array.
 */
export function getAllScopeKeys(): string[] {
  return [...flattenScopeTree().keys()]
}
