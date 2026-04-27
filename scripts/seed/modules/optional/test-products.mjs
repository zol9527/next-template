/**
 * Optional Seed Module: 03-test-products
 * 创建测试产品和分类
 *
 * Function: seedTestProducts
 *
 * Description: 创建测试分类和产品数据
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   result(Object): { categories, products }
 */

import { randomUUID } from 'node:crypto'

export const meta = { id: 'test-products', name: '测试产品', description: '创建测试产品和分类', type: 'optional', category: 'test-data', dependsOn: [], plugin: 'ecommerce' }

// 分类数据
const CATEGORIES = [
  { name: '职业资格证书', slug: 'zige-zhengshu' },
  { name: '技能培训课程', slug: 'jineng-peixun' },
  { name: '语言学习', slug: 'yuyan-xuexi' },
  { name: '学历提升', slug: 'xueli-tisheng' },
  { name: '兴趣爱好', slug: 'xingqu-aihao' },
  { name: '企业培训', slug: 'qiye-peixun' },
]

// 产品数据
const PRODUCTS = [
  // 职业资格证书
  { name: '教师资格证笔试课程', price: '299', categorySlug: 'zige-zhengshu', productKind: 'course', description: '教师资格证考试笔试全程班' },
  { name: '注册会计师CPA教材', price: '599', categorySlug: 'zige-zhengshu', productKind: 'material', description: '注册会计师考试教材及题库' },
  // 技能培训课程
  { name: 'Python编程入门', price: '199', categorySlug: 'jineng-peixun', productKind: 'course', description: '零基础Python编程入门课程' },
  { name: 'Excel高效办公', price: '99', categorySlug: 'jineng-peixun', productKind: 'course', description: 'Excel办公效率提升课程' },
  // 语言学习
  { name: '英语口语速成', price: '399', categorySlug: 'yuyan-xuexi', productKind: 'course', description: '日常英语口语速成课程' },
  { name: '日语五十音图入门', price: '149', categorySlug: 'yuyan-xuexi', productKind: 'course', description: '日语入门五十音图课程' },
  // 学历提升
  { name: '自考本科全程班', price: '1299', categorySlug: 'xueli-tisheng', productKind: 'course', description: '自学考试本科全程辅导课程' },
  // 兴趣爱好
  { name: '吉他弹唱入门', price: '249', categorySlug: 'xingqu-aihao', productKind: 'course', description: '吉他弹唱入门教学课程' },
]

export default async function seedTestProducts(db, logger, ctx) {
  logger.info('开始创建测试产品和分类...')

  // 1. 创建分类
  logger.info('创建分类...')
  const categoryIdMap = new Map()
  const categories = []

  for (const cat of CATEGORIES) {
    const existing = await db.category.findFirst({
      where: { slug: cat.slug }
    })

    if (existing) {
      const updated = await db.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          status: 'active',
        }
      })
      logger.info(`更新分类: ${cat.name}`)
      categoryIdMap.set(cat.slug, updated.id)
      categories.push(updated)
    } else {
      const created = await db.category.create({
        data: {
          id: randomUUID(),
          name: cat.name,
          slug: cat.slug,
          status: 'active',
        }
      })
      logger.success(`创建分类: ${cat.name}`)
      categoryIdMap.set(cat.slug, created.id)
      categories.push(created)
    }
  }

  // 2. 创建产品
  logger.info('创建产品...')
  const products = []
  let created = 0
  let updated = 0

  for (const prod of PRODUCTS) {
    const categoryId = categoryIdMap.get(prod.categorySlug)
    if (!categoryId) {
      logger.warn(`找不到分类: ${prod.categorySlug}`, { product: prod.name })
      continue
    }

    const existing = await db.product.findFirst({
      where: { name: prod.name }
    })

    if (existing) {
      // 更新产品
      const updatedProd = await db.product.update({
        where: { id: existing.id },
        data: {
          price: prod.price,
          description: prod.description,
          status: 'published',
        }
      })
      logger.info(`更新产品: ${prod.name}`)
      products.push(updatedProd)
      updated++
    } else {
      // 创建产品
      const createdProd = await db.product.create({
        data: {
          id: randomUUID(),
          name: prod.name,
          slug: prod.name.toLowerCase().replace(/\s+/g, '-'),
          description: prod.description,
          productKind: prod.productKind,
          price: prod.price,
          currencyCode: 'CNY',
          status: 'published',
          categories: {
            create: { categoryId }
          }
        }
      })
      logger.success(`创建产品: ${prod.name}`)
      products.push(createdProd)
      created++
    }
  }

  logger.success('测试产品和分类创建完成', {
    categories: categories.length,
    products: products.length,
    created,
    updated
  })

  return { categories, products }
}
