#!/usr/bin/env node

import { loadEnvFile } from 'node:process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 从 ops/mfa/ 上溯 3 级到达后端根目录 apps/backend/
const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = join(__dirname, '..', '..', '..')

{
  const nodeEnv = process.env.NODE_ENV || 'development'
  const candidates = [`.env.${nodeEnv}`, '.env']
  let loaded = false
  for (const file of candidates) {
    try {
      loadEnvFile(join(BACKEND_ROOT, file))
      loaded = true
      break
    } catch {
      // ignore
    }
  }
  if (!loaded) {
    throw new Error('未找到可用的环境变量文件（.env 或 .env.{NODE_ENV}）')
  }
}

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    console.log('🔍 验证 MFA 设置数据...\n')

    const globalSettings = await prisma.mfaGlobalSettings.findUnique({
      where: { id: 'default' }
    })

    if (globalSettings) {
      console.log('✅ 全局 MFA 设置已创建:')
      console.log(`   - ID: ${globalSettings.id}`)
      console.log(`   - 模式: ${globalSettings.mode}`)
      console.log(`   - 允许豁免: ${globalSettings.allowExemptions}`)
    } else {
      console.log('❌ 全局 MFA 设置未找到')
    }

    const rolePolicies = await prisma.mfaRolePolicy.findMany()

    console.log(`\n✅ 角色策略: 共 ${rolePolicies.length} 条`)
    rolePolicies.forEach(policy => {
      console.log(`   - ${policy.roleName}: ${policy.policy} (允许豁免: ${policy.allowExemptions})`)
    })

    console.log('\n📊 验证结果:')
    console.log(`- mfa_global_settings 表中有 ${globalSettings ? 1 : 0} 条记录`)
    console.log(`- mfa_role_policies 表中有 ${rolePolicies.length} 条记录`)

    if (globalSettings && rolePolicies.length > 0) {
      console.log('\n✅ MFA 策略设置初始化成功!')
    } else {
      console.log('\n❌ MFA 策略设置初始化可能有问题')
    }
  } catch (error) {
    console.error('❌ 验证失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
