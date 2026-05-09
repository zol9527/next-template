export const ACTIONS = ['read', 'write', 'execute'] as const

export type Action = (typeof ACTIONS)[number]
