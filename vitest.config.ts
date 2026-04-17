import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // 默认使用 jsdom 环境（用于组件测试）
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts', 'test/**/*.test.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
    // 集成测试、单元测试、API 路由测试使用 node 环境
    // NOTE: environmentMatchGlobs 已废弃但仍可用；后续可再迁移到 test.projects。
    environmentMatchGlobs: [
      ['test/integration/**/*.test.ts', 'node'],
      ['test/unit/**/*.test.ts', 'node'],
      ['test/api/**/*.test.ts', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
