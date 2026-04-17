/**
 * 种子配置
 * 定义种子模块的分类和元数据
 */

/**
 * 核心种子模块（必须执行）
 * 这些模块包含系统运行所需的最小数据集
 */
export const CORE_MODULES = [
  {
    id: 'roles',
    name: '角色创建',
    file: '01-roles.mjs',
    description: '创建系统基础角色（user, admin, promoter）',
  },
  {
    id: 'admin',
    name: '初始管理员',
    file: '02-admin.mjs',
    description: '创建初始管理员账户',
  },
  {
    id: 'permissions',
    name: '权限系统',
    file: '03-permissions.mjs',
    description: '初始化权限配置并绑定角色权限',
  },
  {
    id: 'promoter-levels',
    name: '推广员等级',
    file: '04-promoter-levels.mjs',
    description: '创建推广员等级配置',
    category: 'config',
    plugin: 'promotion', // 依赖 promotion 插件，插件禁用时自动跳过
  },
  {
    id: 'agreements',
    name: '站点协议',
    file: '05-agreements.mjs',
    description: '初始化用户协议与隐私政策',
    category: 'config',
  },
  {
    id: 'mfa-settings',
    name: 'MFA 策略设置',
    file: '07-mfa-settings.mjs',
    description: '初始化全局 MFA 设置和角色策略',
    category: 'security',
  },
]

/**
 * 可选种子模块（根据场景选择）
 * 这些模块用于填充测试数据或可选功能
 */
export const OPTIONAL_MODULES = [
  {
    id: 'test-users',
    name: '测试用户',
    file: '02-test-users.mjs',
    description: '创建测试用户数据',
    category: 'test-data',
  },
  {
    id: 'test-products',
    name: '测试产品',
    file: '03-test-products.mjs',
    description: '创建测试产品和分类',
    category: 'test-data',
    plugin: 'ecommerce', // 依赖 ecommerce 插件
  },
  {
    id: 'test-promoter-data',
    name: '推广员测试数据',
    file: '04-test-promoter-data.mjs',
    description: '创建推广关系和绑定数据',
    category: 'test-data',
    plugin: 'promotion', // 依赖 promotion 插件
  },
  {
    id: 'test-commission-data',
    name: '佣金测试数据',
    file: '05-test-commission-data.mjs',
    description: '创建佣金和订单数据',
    category: 'test-data',
    plugin: 'ecommerce', // 依赖 ecommerce 插件（需要 Order 模型）
  },
  {
    id: 'e2e-test-users',
    name: 'E2E 测试用户',
    file: '06-e2e-test-users.mjs',
    description: '创建 E2E 测试专用管理员账户',
    category: 'test-data',
  },
  {
    id: 'test-blog',
    name: '博客测试数据',
    file: '07-test-blog.mjs',
    description: '创建博客分类、标签和文章',
    category: 'test-data',
  },
]

/**
 * 预定义的执行模式
 */
export const EXECUTION_MODES = {
  minimal: {
    name: 'minimal',
    description: '仅执行核心 seed（roles + admin + permissions + promoter-levels + agreements）',
    modules: ['roles', 'admin', 'permissions', 'promoter-levels', 'agreements'],
  },
  development: {
    name: 'development',
    description: '核心 seed + 基础测试数据',
    modules: [
      'roles', 'admin', 'permissions', 'promoter-levels', 'agreements',
      'test-users', 'test-products'
    ],
  },
  full: {
    name: 'full',
    description: '所有 seed（包含全部测试数据）',
    modules: [
      'roles', 'admin', 'permissions', 'promoter-levels', 'agreements',
      'test-users', 'test-products',
      'test-promoter-data', 'test-commission-data'
    ],
  },
}

/**
 * 获取模块的完整路径
 */
export function getModulePath(moduleId) {
  const coreModule = CORE_MODULES.find(m => m.id === moduleId)
  if (coreModule) {
    return `modules/core/${coreModule.file}`
  }

  const optionalModule = OPTIONAL_MODULES.find(m => m.id === moduleId)
  if (optionalModule) {
    return `modules/optional/${optionalModule.file}`
  }

  throw new Error(`Unknown module: ${moduleId}`)
}

/**
 * 获取模块的元数据
 */
export function getModuleMeta(moduleId) {
  const coreModule = CORE_MODULES.find(m => m.id === moduleId)
  if (coreModule) return { ...coreModule, type: 'core' }

  const optionalModule = OPTIONAL_MODULES.find(m => m.id === moduleId)
  if (optionalModule) return { ...optionalModule, type: 'optional' }

  return null
}
