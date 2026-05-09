/**
 * File: access-manager.ts
 * Description: AccessManager factory — the single entry point for permission checking
 *
 * Usage:
 * - Server API: built by useApiAuth, available as auth.access
 * - Frontend React: useAccess() hook
 * - Tests: createAccessManager([...grants]) directly
 */

import type { Action, Scope, Grant } from '@/config/access'
import { ForbiddenError } from '@/lib/errors/app-error'

export interface AccessRequest {
  readonly action: Action
  readonly scope: Scope
}

/**
 * Creates an AccessManager from a set of grants.
 * Uses a Set<string> index for O(1) lookup.
 */
export function createAccessManager(grants: ReadonlyArray<{ readonly action: Action; readonly scope: string }>) {
  const index = new Set(grants.map((g) => `${g.action}:${g.scope}`))

  return {
    grants: Object.freeze([...grants]) as readonly Grant[],

    has(request: AccessRequest): boolean {
      return index.has(`${request.action}:${request.scope}`)
    },

    assert(request: AccessRequest): void {
      if (!this.has(request)) {
        throw new ForbiddenError(
          `需要 ${request.action} 权限访问 ${request.scope}`
        )
      }
    },

    canRead(scope: Scope): boolean {
      return this.has({ action: 'read', scope })
    },

    canWrite(scope: Scope): boolean {
      return this.has({ action: 'write', scope })
    },

    canExecute(scope: Scope): boolean {
      return this.has({ action: 'execute', scope })
    },

    scopesFor(action: Action): string[] {
      return grants.filter((g) => g.action === action).map((g) => g.scope)
    },

    hasAny(...requests: AccessRequest[]): boolean {
      return requests.some((r) => this.has(r))
    },

    hasAll(...requests: AccessRequest[]): boolean {
      return requests.every((r) => this.has(r))
    },
  }
}

export type AccessManager = ReturnType<typeof createAccessManager>
