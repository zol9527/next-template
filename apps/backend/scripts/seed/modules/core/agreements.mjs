/**
 * Core Seed Module: 05-agreements
 * 初始化站点协议数据
 *
 * Function: seedAgreements
 *
 * Description: 初始化用户协议和隐私政策两条默认协议，支持重复执行
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   agreements(Array): 已创建或更新的协议列表
 */

export const meta = { id: 'agreements', name: '站点协议', description: '初始化用户协议与隐私政策', type: 'core', category: 'config', dependsOn: [], plugin: null }

const DEFAULT_AGREEMENTS = [
  {
    type: 'USER_AGREEMENT',
    title: '用户协议',
    version: '1.0.0',
    content: [
      '<h1>用户协议</h1>',
      '<h2>一、服务声明</h2>',
      '<p>本协议是您与四川硕博达国际教育咨询有限公司（以下简称“我们”）之间关于使用“融培网小程序”服务所订立的法律协议。用户点击“同意”或实际使用本服务，即视为已充分阅读并接受本协议全部条款。</p>',
      '<h2>二、账户安全性</h2>',
      '<p>用户需负责妥善保管账户及其密码。因用户自身原因导致账号遭他人非法使用，我们不承担任何赔偿责任。对于通过您的账户进行的所有活动，您承担全部法律责任。</p>',
      '<h2>三、知识产权声明</h2>',
      '<p>本应用内所有受著作权、商标、专利权保护的素材（包括但不限于代码、界面设计、文档、算法）均归我们所有。未经书面授权，用户不得进行逆向工程（Reverse Engineering）、反编译（Decompile）或试图提取源代码。</p>',
      '<h2>四、用户行为规范</h2>',
      '<p>用户承诺在使用本服务时，不得利用本服务从事以下活动：</p>',
      '<ul>',
      '<li>传播违反当地法律法规的信息；</li>',
      '<li>恶意攻击服务器、利用系统漏洞谋取私利或干扰其他用户正常使用；</li>',
      '<li>未经授权抓取数据或进行自动化爬虫操作。</li>',
      '</ul>',
      '<h2>五、免责与限责条款</h2>',
      '<ol>',
      '<li>服务按现状提供：我们不保证服务在任何时候都不会中断，也不保证服务的绝对安全性。</li>',
      '<li>第三方链接：本服务中可能包含第三方链接，我们对第三方提供的内容或隐私实践不承担责任。</li>',
      '<li>不可抗力：因地震、战争、黑客攻击、政策变动等不可抗力导致的损失，我们不承担责任。</li>',
      '</ol>',
    ].join(''),
  },
  {
    type: 'PRIVACY_POLICY',
    title: '隐私政策',
    version: '1.0.0',
    content: [
      '<h1>隐私政策</h1>',
      '<p>我们重视并保护您的个人信息安全。本政策用于说明我们如何收集、使用、存储、共享和保护您的个人信息。</p>',
      '<h2>一、我们收集的信息</h2>',
      '<p>必要信息：为提供基础服务，我们收集您的 [手机号]、[设备识别码]、[微信号]。</p>',
      '<p>日志信息：当您使用本服务时，我们的服务器会自动记录 [IP 地址、浏览器类型、操作日志]。</p>',
      '<p>Cookie：我们使用 Cookie 以优化用户体验及维持登录状态。</p>',
      '<h2>二、信息的使用与存储</h2>',
      '<p>目的限制：我们收集信息的目的是为了提供、维护及改进我们的服务。</p>',
      '<p>存储时限：我们仅在法律要求的最短期限内保留您的个人信息。</p>',
      '<p>存储地点：用户信息存储在位于腾讯云的加密服务器中。</p>',
      '<h2>三、信息的共享与披露</h2>',
      '<p>除非获得您的明确同意，或根据法律法规、政府强制指令要求，我们不会向任何第三方公司、组织或个人共享您的个人隐私信息。</p>',
      '<h2>四、安全保障措施</h2>',
      '<p>我们采用行业标准的加密技术（如 TLS/SSL）、严格的权限控制以及脱敏处理来保护您的数据安全。尽管如此，请理解互联网环境不存在“绝对的安全”。</p>',
      '<h2>五、您的权利</h2>',
      '<p>您有权查阅、更正、删除您的个人信息。如需注销账户，可在应用设置中操作，我们将在验证身份后 15 个工作日内处理。</p>',
    ].join(''),
  },
]

export default async function seedAgreements(db, logger, ctx) {
  logger.info('开始初始化协议数据...')

  const agreements = []

  for (const item of DEFAULT_AGREEMENTS) {
    const record = await db.agreement.upsert({
      where: { type: item.type },
      update: {
        title: item.title,
        content: item.content,
        version: item.version,
        isActive: true,
        effectiveAt: new Date(),
      },
      create: {
        type: item.type,
        title: item.title,
        content: item.content,
        version: item.version,
        isActive: true,
        effectiveAt: new Date(),
      },
    })

    agreements.push(record)
    logger.success(`协议已写入: ${item.title} (${item.version})`)
  }

  logger.success('协议数据初始化完成', { count: agreements.length })
  return agreements
}
