/**
 * File: built-in-roles.ts
 * Description: Built-in role definitions, default grants, and utility functions
 */

import type { Action } from './access-actions'
import type { Scope } from '@/lib/auth/access-utils'
import { getAllScopeKeys } from '@/lib/auth/access-utils'

export type Grant = {
  readonly action: Action
  readonly scope: Scope
}

export interface BuiltInRoleDefinition {
  readonly name: string
  readonly description: string
  /** Cannot be deleted */
  readonly immutable: true
  /** true = grants are fixed (admin gets all), false = admin can adjust */
  readonly fixedGrants: boolean
  /** Default grants for seed phase */
  readonly defaultGrants: Grant[]
}

export const BUILT_IN_ROLES: Record<string, BuiltInRoleDefinition> = {
  admin: {
    name: 'admin',
    description: '系统管理员',
    immutable: true,
    fixedGrants: true,
    defaultGrants: [], // filled at runtime by generateAllGrants()
  },
  user: {
    name: 'user',
    description: '普通用户',
    immutable: true,
    fixedGrants: false,
    defaultGrants: [
      { action: 'read', scope: 'account' },
      { action: 'write', scope: 'account' },
      { action: 'execute', scope: 'account.mfa' },
    ],
  },
  promoter: {
    name: 'promoter',
    description: '推广员',
    immutable: true,
    fixedGrants: false,
    defaultGrants: [
      { action: 'read', scope: 'account' },
      { action: 'write', scope: 'account' },
      { action: 'execute', scope: 'account.mfa' },
      { action: 'read', scope: 'dashboard' },
      { action: 'read', scope: 'orders' },
      { action: 'read', scope: 'commissions' },
      { action: 'read', scope: 'commissions.rules' },
      { action: 'read', scope: 'settlements' },
      { action: 'execute', scope: 'settlements.applications' },
      { action: 'read', scope: 'promoters' },
    ],
  },
}

export type BuiltInRoleName = keyof typeof BUILT_IN_ROLES

/**
 * Generate all grants (for admin role).
 * Returns one grant per scope × action combination.
 */
export function generateAllGrants(): Grant[] {
  const allScopes = getAllScopeKeys() as Scope[]
  const actions: Action[] = ['read', 'write', 'execute']
  return allScopes.flatMap((scope) =>
    actions.map((action) => ({ action, scope }))
  )
}