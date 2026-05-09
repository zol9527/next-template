import { env } from '@/config'

interface IpRange {
  ip: string
  mask: number
}

let cachedRanges: IpRange[] | null = null

function parseAllowedIps(): IpRange[] {
  const allowedIps = env.INTERNAL_ALLOWED_IPS

  if (!allowedIps || allowedIps.trim() === '') {
    return []
  }

  return allowedIps
    .split(',')
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0)
    .map((entry: string) => {
      if (entry.includes('/')) {
        const [ip, maskStr] = entry.split('/')
        return { ip: ip.trim(), mask: parseInt(maskStr, 10) }
      }
      return { ip: entry, mask: 32 }
    })
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

function isIpInCidr(ip: string, cidr: IpRange): boolean {
  const ipNum = ipToNumber(ip)
  const cidrNum = ipToNumber(cidr.ip)
  const mask = ~((1 << (32 - cidr.mask)) - 1)
  return (ipNum & mask) === (cidrNum & mask)
}

export function isInternalIp(ip: string): boolean {
  if (!cachedRanges) {
    cachedRanges = parseAllowedIps()
  }

  if (cachedRanges.length === 0) {
    return false
  }

  return cachedRanges.some((range) => isIpInCidr(ip, range))
}

export function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return null
}
