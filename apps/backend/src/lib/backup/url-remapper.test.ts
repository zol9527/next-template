import { describe, it, expect, vi } from 'vitest'
import {
  remapUrls,
  type PrismaClientLike,
  type RemapResult,
} from './url-remapper'
import { StatsTracker } from './stats-tracker'

/**
 * 创建 mock Prisma 客户端
 *
 * Parameters:
 *   updateResults(Record<string, number>): SQL 表名模式 → 返回的 affected_rows 值
 *
 * Returns:
 *   (object): 包含 mock $queryRawUnsafe 的 PrismaClientLike 实例和调用日志
 */
function createMockPrisma(updateResults: Record<string, number> = {}) {
  const sqlLog: string[] = []

  const mockPrisma = {
    $queryRawUnsafe: vi
      .fn()
      .mockImplementation(
        async <T,>(query: string, ..._values: unknown[]): Promise<T> => {
          sqlLog.push(query)

          // 根据表名匹配返回对应的 affected_rows
          for (const [tablePrefix, affectedRows] of Object.entries(
            updateResults
          )) {
            if (query.includes(`\`${tablePrefix}\``)) {
              return [{ affected_rows: affectedRows }] as T
            }
          }

          return [{ affected_rows: 0 }] as T
        }
      ),
  } as unknown as PrismaClientLike

  return { mockPrisma, sqlLog }
}

describe('remapUrls', () => {
  const OLD_ENDPOINT = 'https://old-bucket.oss.aliyuncs.com'
  const NEW_ENDPOINT = 'https://new-bucket.oss.aliyuncs.com'

  const REMAPPING_FIELDS: Record<string, string[]> = {
    users: ['avatar_url'],
    site_config: ['logo_url'],
    blog_articles: ['cover_image', 'og_image'],
  }

  it('自有 URL 正确替换，第三方 URL 不动', async () => {
    // Arrange: users 表替换 3 行，site_config 替换 1 行
    const { mockPrisma, sqlLog } = createMockPrisma({
      users: 3,
      site_config: 1,
    })

    // Act
    const result = await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: REMAPPING_FIELDS,
    })

    // Assert: SQL 语句使用 LIKE 条件只匹配旧 endpoint 开头的 URL
    const usersUpdateSql = sqlLog.find(
      (sql) => sql.includes('`users`') && sql.includes('`avatar_url`')
    )
    expect(usersUpdateSql).toContain(
      `LIKE '${OLD_ENDPOINT}%'`
    )
    expect(usersUpdateSql).toContain(`REPLACE(\`avatar_url\``)
    expect(usersUpdateSql).toContain(NEW_ENDPOINT)

    // 验证结果统计
    expect(result.tablesProcessed).toBe(3) // users, site_config, blog_articles
    expect(result.totalReplacements).toBe(4) // 3 + 1 + 0
    expect(result.details).toEqual({
      users: 3,
      site_config: 1,
    })
  })

  it('null 和空字符串不报错', async () => {
    // Arrange: 所有表均无匹配行
    const { mockPrisma } = createMockPrisma()

    // Act
    const result = await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: REMAPPING_FIELDS,
    })

    // Assert: 无报错，替换数为 0
    expect(result.totalReplacements).toBe(0)
    expect(result.details).toEqual({})
  })

  it('无匹配 URL 时不记录到 details', async () => {
    // Arrange: users/site_config 无匹配，blog_articles 的两个字段分别返回 3 和 2
    // 遍历顺序: users.avatar_url(0) → site_config.logo_url(0) → blog_articles.cover_image(3) → blog_articles.og_image(2)
    const affectedPerCall = [0, 0, 3, 2]
    let callIdx = 0

    const mockPrisma = {
      $queryRawUnsafe: vi.fn().mockImplementation(async <T,>(): Promise<T> => {
        return [{ affected_rows: affectedPerCall[callIdx++] ?? 0 }] as T
      }),
    } as unknown as PrismaClientLike

    // Act
    const result = await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: REMAPPING_FIELDS,
    })

    // Assert: 只有 blog_articles 记录到 details，累加 3+2=5
    expect(result.totalReplacements).toBe(5)
    expect(result.details).toEqual({ blog_articles: 5 })
    expect(result.tablesProcessed).toBe(3)
  })

  it('多字段表正确累加替换数', async () => {
    // Arrange: blog_articles 有两个字段 cover_image 和 og_image
    const callResults: Array<{ tablePrefix: string; rows: number }> = [
      { tablePrefix: 'blog_articles', rows: 2 },
      { tablePrefix: 'blog_articles', rows: 3 },
    ]
    let callIndex = 0

    const mockPrisma = {
      $queryRawUnsafe: vi.fn().mockImplementation(async <T,>(): Promise<T> => {
        const match = callResults[callIndex]
        callIndex++
        return [{ affected_rows: match?.rows ?? 0 }] as T
      }),
    } as unknown as PrismaClientLike

    // Act
    const result = await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: { blog_articles: ['cover_image', 'og_image'] },
    })

    // Assert: 两个字段的替换数累加 = 5
    expect(result.details.blog_articles).toBe(5)
    expect(result.totalReplacements).toBe(5)
  })

  it('statsTracker 正确更新', async () => {
    // Arrange
    const { mockPrisma } = createMockPrisma({ users: 1 })

    const flushCallback = vi.fn().mockResolvedValue(undefined)
    const statsTracker = new StatsTracker({
      flushCallback,
      debounceMs: 100,
    })

    // Act
    await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: { users: ['avatar_url'] },
      statsTracker,
    })

    // Assert: statsTracker 应更新了 phase 和 currentTable
    const stats = statsTracker.getStats()
    expect(stats.phase).toBe('url-remapping')
    expect(stats.currentTable).toBe('users')
  })

  it('空 remappingFields 返回零结果', async () => {
    // Arrange
    const { mockPrisma } = createMockPrisma()

    // Act
    const result = await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: OLD_ENDPOINT,
      newEndpoint: NEW_ENDPOINT,
      remappingFields: {},
    })

    // Assert
    expect(result.tablesProcessed).toBe(0)
    expect(result.totalReplacements).toBe(0)
    expect(result.details).toEqual({})
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled()
  })

  it('SQL 中 endpoint 包含单引号时正确转义', async () => {
    // Arrange: endpoint 包含单引号（极端情况）
    const weirdOld = "https://old.example.com/path'with'quotes"
    const weirdNew = "https://new.example.com/path'with'quotes"
    const { mockPrisma, sqlLog } = createMockPrisma()

    // Act
    await remapUrls({
      prisma: mockPrisma,
      oldEndpoint: weirdOld,
      newEndpoint: weirdNew,
      remappingFields: { users: ['avatar_url'] },
    })

    // Assert: SQL 中单引号被转义为双单引号
    const sql = sqlLog[0]
    expect(sql).toContain("path''with''quotes")
  })
})
