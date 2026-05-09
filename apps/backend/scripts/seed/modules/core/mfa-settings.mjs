/**
 * Core Seed Module: 07-mfa-settings
 * 初始化 MFA 策略设置
 *
 * Function: seedMfaSettings
 *
 * Description: 创建全局 MFA 设置和角色策略，确保 MFA 管理功能有初始数据
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   settings(Object): 包含全局设置和角色策略的对象
 */

export const meta = { id: 'mfa-settings', name: 'MFA 策略设置', description: '初始化全局 MFA 设置和角色策略', type: 'core', category: 'security', dependsOn: [], plugin: null }

/**
 * MFA 全局设置默认值
 * 策略模式说明:
 * - disabled: 完全禁用 MFA
 * - optional: 用户可选择是否启用 MFA (推荐用于初始设置)
 * - required: 强制所有用户启用 MFA
 */
const MFA_GLOBAL_DEFAULTS = {
  id: 'default', // 使用固定 ID，确保唯一性
  mode: 'optional', // 初始设置为可选模式，避免强制影响现有用户
  allowExemptions: true, // 允许管理员为特定用户豁免 MFA
}

/**
 * MFA 角色策略配置
 * 为不同角色设置不同的 MFA 策略
 *
 * 策略类型:
 * - inherit: 继承全局 MFA 设置
 * - force: 强制启用 MFA，不受全局设置影响
 * - disable: 禁用 MFA，不受全局设置影响
 */
const MFA_ROLE_POLICIES = [
  {
    roleName: 'admin', // 管理员角色
    policy: 'inherit', // 继承全局设置
    allowExemptions: true, // 允许豁免
  },
]

/**
 * 执行 MFA 设置初始化
 *
 * 使用 upsert 确保重复运行不会出错:
 * - 如果记录已存在，则跳过创建
 * - 如果记录不存在，则创建新记录
 */
export default async function seedMfaSettings(db, logger, ctx) {
  logger.info('开始初始化 MFA 策略设置...')

  const result = {
    globalSettings: null,
    rolePolicies: [],
  }

  // Step 1: 创建/更新全局 MFA 设置
  logger.info('处理全局 MFA 设置...')

  try {
    const globalSettings = await db.mfaGlobalSettings.upsert({
      where: { id: MFA_GLOBAL_DEFAULTS.id },
      update: {}, // 如果已存在，不更新任何字段
      create: {
        id: MFA_GLOBAL_DEFAULTS.id,
        mode: MFA_GLOBAL_DEFAULTS.mode,
        allowExemptions: MFA_GLOBAL_DEFAULTS.allowExemptions,
      },
    })

    result.globalSettings = globalSettings

    logger.success('全局 MFA 设置已创建', {
      id: globalSettings.id,
      mode: globalSettings.mode,
      allowExemptions: globalSettings.allowExemptions,
    })
  } catch (error) {
    logger.error('创建全局 MFA 设置失败', { error: error.message })
    throw error
  }

  // Step 2: 为每个角色创建/更新 MFA 策略
  logger.info(`处理 ${MFA_ROLE_POLICIES.length} 个角色的 MFA 策略...`)

  for (const policyConfig of MFA_ROLE_POLICIES) {
    try {
      // 验证角色是否存在
      const role = await db.role.findUnique({
        where: { name: policyConfig.roleName },
      })

      if (!role) {
        logger.warn(`角色不存在，跳过 MFA 策略创建: ${policyConfig.roleName}`)
        continue
      }

      // 使用 upsert 创建或更新角色策略
      const rolePolicy = await db.mfaRolePolicy.upsert({
        where: {
          roleName: policyConfig.roleName, // 使用 roleName 作为唯一标识
        },
        update: {}, // 如果已存在，不更新任何字段
        create: {
          roleName: policyConfig.roleName,
          policy: policyConfig.policy,
          allowExemptions: policyConfig.allowExemptions,
        },
      })

      result.rolePolicies.push(rolePolicy)

      logger.success(`角色 ${policyConfig.roleName} MFA 策略: ${rolePolicy.policy}`, {
        roleId: role.id,
        policyId: rolePolicy.id,
        allowExemptions: rolePolicy.allowExemptions,
      })
    } catch (error) {
      logger.error(`创建角色 ${policyConfig.roleName} MFA 策略失败`, {
        error: error.message,
      })
      // 不抛出错误，继续处理其他角色
    }
  }

  logger.success('MFA 策略设置初始化完成', {
    globalSettingsId: result.globalSettings?.id,
    rolePoliciesCount: result.rolePolicies.length,
    rolePolicies: result.rolePolicies.map((p) => ({
      role: p.roleName,
      policy: p.policy,
    })),
  })

  return result
}
