import type { ServiceContext } from '@/types/service/service-context'
import type { SystemStats } from '@/contracts/dtos/admin/system-stats.dto'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import process from 'node:process'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)

/**
 * Function: createSystemStatsService
 *
 * Description: 创建系统资源采集服务，用于收集 CPU、内存、磁盘、
 * 运行时间、进程、网络和数据库等系统资源指标
 *
 * Parameters:
 *     deps(object): 依赖项 (目前为空对象，预留扩展)
 *     ctx(ServiceContext): 服务上下文，包含 traceId 和 logger
 *
 * Returns:
 *     service(object): 包含 collect() 方法的系统资源采集服务
 */
export function createSystemStatsService(
  deps: Record<string, never>,
  ctx: ServiceContext,
) {
  return {
    /**
     * Function: collect
     *
     * Description: 采集所有系统资源指标，使用 Promise.allSettled 并行采集，
     * 单个指标失败不影响整体返回
     *
     * Returns:
     *     result(SystemStats): 完整的系统资源指标数据
     */
    async collect(): Promise<SystemStats> {
      ctx.logger.debug({ action: 'system_stats.collect' })

      // 并行采集所有指标，单个失败不阻塞其他指标
      const [cpuResult, memoryResult, diskResult, uptimeResult, processResult, networkResult, databaseResult] =
        await Promise.allSettled([
          this._collectCpu(),
          this._collectMemory(),
          this._collectDisk(),
          this._collectUptime(),
          this._collectProcess(),
          this._collectNetwork(),
          this._collectDatabase(),
        ])

      const cpu = cpuResult.status === 'fulfilled' ? cpuResult.value : this._fallbackCpu()
      const memory = memoryResult.status === 'fulfilled' ? memoryResult.value : this._fallbackMemory()
      const disk = diskResult.status === 'fulfilled' ? diskResult.value : this._fallbackDisk()
      const uptime = uptimeResult.status === 'fulfilled' ? uptimeResult.value : this._fallbackUptime()
      const proc = processResult.status === 'fulfilled' ? processResult.value : this._fallbackProcess()
      const network = networkResult.status === 'fulfilled' ? networkResult.value : this._fallbackNetwork()
      const database = databaseResult.status === 'fulfilled' ? databaseResult.value : this._fallbackDatabase()

      return {
        cpu,
        memory,
        disk,
        uptime,
        process: proc,
        network,
        database,
        timestamp: new Date().toISOString(),
      }
    },

    /**
     * Function: _collectCpu
     *
     * Description: 采集 CPU 指标，包括型号、核心数、使用率和负载平均值
     * 使用两次采样（间隔 100ms）计算 CPU 使用率百分比
     *
     * Returns:
     *     cpu(object): CPU 指标数据
     */
    async _collectCpu() {
      const cpus = os.cpus()
      const model = cpus[0]?.model ?? 'Unknown'
      const cores = cpus.length

      // 两次采样计算 CPU 使用率
      const usage = await this._calculateCpuUsage()

      const loadAvg = os.loadavg()

      return {
        model,
        cores,
        usage,
        loadAvg: [loadAvg[0] ?? 0, loadAvg[1] ?? 0, loadAvg[2] ?? 0],
      }
    },

    /**
     * Function: _calculateCpuUsage
     *
     * Description: 通过两次采样（间隔 100ms）计算 CPU 使用率百分比
     *
     * Returns:
     *     usage(number): CPU 使用率 (0-100)
     */
    async _calculateCpuUsage(): Promise<number> {
      const sample1 = this._getCpuTimes()
      await new Promise((resolve) => setTimeout(resolve, 100))
      const sample2 = this._getCpuTimes()

      const totalDiff = sample2.total - sample1.total
      const idleDiff = sample2.idle - sample1.idle

      if (totalDiff === 0) return 0

      const usage = ((totalDiff - idleDiff) / totalDiff) * 100
      return Math.min(100, Math.max(0, usage))
    },

    /**
     * Function: _getCpuTimes
     *
     * Description: 获取所有 CPU 核心的累计时间统计
     *
     * Returns:
     *     times(object): 包含 total（总时间）和 idle（空闲时间）的对象
     */
    _getCpuTimes() {
      const cpus = os.cpus()
      let total = 0
      let idle = 0

      for (const cpu of cpus) {
        const times = cpu.times
        total += times.user + times.nice + times.sys + times.idle + times.irq
        idle += times.idle
      }

      return { total, idle }
    },

    /**
     * Function: _collectMemory
     *
     * Description: 采集内存指标，包括系统总内存、已用、空闲、使用率以及进程级内存
     *
     * Returns:
     *     memory(object): 内存指标数据
     */
    async _collectMemory() {
      const total = os.totalmem()
      const free = os.freemem()
      const used = total - free
      const usagePercent = total > 0 ? (used / total) * 100 : 0

      const memUsage = process.memoryUsage()

      return {
        total,
        used,
        free,
        usagePercent,
        process: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
      }
    },

    /**
     * Function: _collectDisk
     *
     * Description: 采集磁盘使用指标，通过 df 命令获取根分区信息
     * 解析 df -k / 的输出获取磁盘总容量、已用、可用和使用率
     *
     * Returns:
     *     disk(object): 磁盘指标数据
     */
    async _collectDisk() {
      try {
        const { stdout } = await execAsync('df -k /', { timeout: 5000 })
        const lines = stdout.trim().split('\n')

        // df 输出格式: Filesystem 1K-blocks Used Available Use% Mounted on
        // 第二行是实际数据
        if (lines.length < 2) {
          return this._fallbackDisk()
        }

        const parts = lines[1]!.split(/\s+/)
        const totalKb = parseInt(parts[1]!, 10) * 1024
        const usedKb = parseInt(parts[2]!, 10) * 1024
        const freeKb = parseInt(parts[3]!, 10) * 1024
        const usagePercent = totalKb > 0 ? (usedKb / totalKb) * 100 : 0

        return {
          total: totalKb,
          used: usedKb,
          free: freeKb,
          usagePercent,
        }
      } catch {
        return this._fallbackDisk()
      }
    },

    /**
     * Function: _collectUptime
     *
     * Description: 采集系统和进程的运行时间
     *
     * Returns:
     *     uptime(object): 包含 system（系统运行秒数）和 process（进程运行秒数）
     */
    async _collectUptime() {
      return {
        system: os.uptime(),
        process: process.uptime(),
      }
    },

    /**
     * Function: _collectProcess
     *
     * Description: 采集当前进程的基本信息
     *
     * Returns:
     *     proc(object): 进程信息，包含 pid、nodeVersion、platform、arch
     */
    async _collectProcess() {
      return {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      }
    },

    /**
     * Function: _collectNetwork
     *
     * Description: 采集网络信息，包括主机名、网络接口列表和公网 IP
     * 过滤掉内部接口（127.0.0.1、::1 等）
     *
     * Returns:
     *     network(object): 网络指标数据
     */
    async _collectNetwork() {
      const hostname = os.hostname()
      const rawInterfaces = os.networkInterfaces()

      // 过滤内部接口，提取 name、address、family
      const interfaces: Array<{ name: string; address: string; family: 'IPv4' | 'IPv6' }> = []
      for (const [name, addrs] of Object.entries(rawInterfaces)) {
        if (!addrs) continue
        for (const addr of addrs) {
          // 跳过内部地址
          if (addr.internal) continue
          // family 在 Node.js 中可能是 'IPv4' 或 'IPv6'
          if (addr.family === 'IPv4' || addr.family === 'IPv6') {
            interfaces.push({
              name,
              address: addr.address,
              family: addr.family,
            })
          }
        }
      }

      // 尝试获取公网 IP
      let publicIp: string | null = null
      try {
        const { stdout } = await execAsync('curl -s --max-time 3 https://api.ipify.org', { timeout: 5000 })
        publicIp = stdout.trim() || null
      } catch {
        publicIp = null
      }

      return {
        hostname,
        interfaces,
        publicIp,
      }
    },

    /**
     * Function: _collectDatabase
     *
     * Description: 检测数据库连接状态，执行 SELECT 1 查询并测量响应时间
     *
     * Returns:
     *     database(object): 数据库状态信息，包含 status、responseTime、version
     */
    async _collectDatabase() {
      try {
        const start = performance.now()
        await prisma.$queryRaw`SELECT 1`
        const responseTime = performance.now() - start

        return {
          status: 'connected' as const,
          responseTime,
          version: null as string | null,
        }
      } catch {
        return {
          status: 'error' as const,
          responseTime: -1,
          version: null as string | null,
        }
      }
    },

    // ====== 降级数据（当指标采集失败时使用） ======

    _fallbackCpu() {
      return {
        model: 'Unknown',
        cores: 1,
        usage: 0,
        loadAvg: [0, 0, 0],
      }
    },

    _fallbackMemory() {
      return {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        process: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
        },
      }
    },

    _fallbackDisk() {
      return {
        total: -1,
        used: -1,
        free: -1,
        usagePercent: -1,
      }
    },

    _fallbackUptime() {
      return {
        system: 0,
        process: 0,
      }
    },

    _fallbackProcess() {
      return {
        pid: 1,
        nodeVersion: 'unknown',
        platform: 'unknown',
        arch: 'unknown',
      }
    },

    _fallbackNetwork() {
      return {
        hostname: 'unknown',
        interfaces: [],
        publicIp: null,
      }
    },

    _fallbackDatabase() {
      return {
        status: 'error' as const,
        responseTime: -1,
        version: null as string | null,
      }
    },
  }
}
