import type { MockedFunction } from 'vitest'

export type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
    ? MockedFunction<T[K]>
    : T[K]
}
