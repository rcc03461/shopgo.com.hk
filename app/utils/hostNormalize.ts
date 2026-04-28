/**
 * 將 HTTP Host / X-Forwarded-Host 等字串正規化為可比對的 hostname（不含埠）。
 * 用於自訂網域比對等場景。
 */
export function normalizeRequestHostname(hostHeader: string): string | null {
  const firstPortion = hostHeader.split(':')[0] ?? ''
  const host = firstPortion.toLowerCase().trim()

  if (!host) return null
  if (host === 'localhost') return null
  if (host === '127.0.0.1') return null
  if (host.includes('/') || host.includes(' ')) return null
  if (host.startsWith('.') || host.endsWith('.')) return null
  if (host.length > 253) return null

  return host
}
