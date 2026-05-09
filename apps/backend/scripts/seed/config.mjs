/**
 * 种子配置
 * 定义执行模式的过滤规则
 */

/**
 * 预定义的执行模式
 * 每个模式通过 filter 函数决定哪些模块应被执行
 * filter 接收模块的 meta 对象，返回 boolean
 */
export const EXECUTION_MODES = {
  minimal: {
    name: 'minimal',
    description: '仅执行核心 seed',
    filter: (meta) => meta.type === 'core',
  },
  development: {
    name: 'development',
    description: '核心 seed + 基础测试数据',
    filter: (meta) => meta.type === 'core' || ['test-users', 'test-products'].includes(meta.id),
  },
  full: {
    name: 'full',
    description: '所有 seed（包含全部测试数据）',
    filter: () => true,
  },
}
