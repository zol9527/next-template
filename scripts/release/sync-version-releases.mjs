/**
 * Version Release Sync Script
 * 版本发布记录同步脚本
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { createPrismaClient, disconnectDbClient } from '../seed/lib/db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHANGES_DIR = path.join(__dirname, '../../docs/changes')

function parseVersionFromFilename(filename) {
  const match = filename.match(/(\d+\.\d+\.\d+(-[a-z]+(\.\d+)?)?)/)
  return match ? match[1] : null
}

function parseChangeFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8')
  const { data, content: markdownContent } = matter(content)

  return {
    version: data.version || parseVersionFromFilename(path.basename(filepath)),
    title: data.title || '版本更新',
    description: markdownContent.trim(),
    releasedAt: data.releasedAt ? new Date(data.releasedAt) : new Date(),
  }
}

async function deleteStaleVersionReleases(prisma, versionsInFiles) {
  const staleRecords = await prisma.versionRelease.findMany({
    where: {
      version: {
        notIn: versionsInFiles,
      },
    },
    select: {
      version: true,
    },
  })

  if (staleRecords.length === 0) {
    return 0
  }

  const staleVersions = staleRecords.map((record) => record.version)

  await prisma.versionRelease.deleteMany({
    where: {
      version: {
        in: staleVersions,
      },
    },
  })

  staleVersions.forEach((version) => {
    console.log(`🗑️ 删除数据库中的旧版本记录: ${version}`)
  })

  return staleVersions.length
}

async function main() {
  const prisma = await createPrismaClient()

  console.log('🔄 开始同步版本发布记录...\n')

  try {
    if (!fs.existsSync(CHANGES_DIR)) {
      console.log(`❌ 变更目录不存在: ${CHANGES_DIR}`)
      process.exit(1)
    }

    const files = fs.readdirSync(CHANGES_DIR)
      .filter(f => f.endsWith('.md') && f !== '_template.md')
      .sort()
      .reverse()

    console.log(`📄 找到 ${files.length} 个变更文件\n`)

    let synced = 0
    let skipped = 0
    let deleted = 0
    let errors = 0
    const versionsInFiles = []

    for (const file of files) {
      const filepath = path.join(CHANGES_DIR, file)
      const data = parseChangeFile(filepath)

      if (!data.version) {
        console.log(`⚠️ 跳过无法解析版本的文件: ${file}`)
        skipped++
        continue
      }

      versionsInFiles.push(data.version)

      try {
        await prisma.versionRelease.upsert({
          where: { version: data.version },
          update: {
            title: data.title,
            description: data.description,
            releasedAt: data.releasedAt,
          },
          create: {
            version: data.version,
            title: data.title,
            description: data.description,
            releasedAt: data.releasedAt,
          },
        })

        console.log(`✓ 同步版本 ${data.version}: ${data.title}`)
        synced++
      } catch (error) {
        console.error(`❌ 处理文件失败 ${file}:`, error.message)
        errors++
      }
    }

    if (errors === 0) {
      deleted = await deleteStaleVersionReleases(prisma, versionsInFiles)
    } else {
      console.log('\n⚠️ 由于存在同步错误，已跳过删除旧版本记录。')
    }

    console.log('\n✅ 同步完成!')
    console.log(`   同步: ${synced}`)
    console.log(`   跳过: ${skipped}`)
    console.log(`   删除: ${deleted}`)
    console.log(`   错误: ${errors}`)

    if (errors > 0) {
      process.exitCode = 1
    }
  } finally {
    await disconnectDbClient(prisma)
  }
}

main().catch(async (error) => {
  console.error('\n❌ 同步失败:', error)
  process.exit(1)
})
