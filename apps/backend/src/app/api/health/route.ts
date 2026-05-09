import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * Description: 健康检查端点，用于负载均衡器和服务监控
 *
 * Returns:
 *   200: 服务正常
 *   503: 服务异常
 */
export async function GET() {
  try {
    // 这里可以添加数据库连接检查等
    // const dbHealth = await checkDatabase()

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
