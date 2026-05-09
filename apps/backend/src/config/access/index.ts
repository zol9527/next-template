/**
 * File: index.ts
 * Description: Access configuration barrel export
 */

export { SCOPE_TREE } from './scope-tree'
export { ACTIONS } from './access-actions'
export type { Action } from './access-actions'
export {
  BUILT_IN_ROLES,
  generateAllGrants,
} from './built-in-roles'
export type {
  Grant,
  BuiltInRoleDefinition,
  BuiltInRoleName,
} from './built-in-roles'
export type { Scope } from '@/lib/auth/access-utils'
export {
  flattenScopeTree,
  isValidScope,
  getAllScopeKeys,
} from '@/lib/auth/access-utils'