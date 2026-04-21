/**
 * 供 route middleware 取得目前請求的 Host（含埠）。
 * 客戶端 hydration / 同頁導向時 useRequestHeaders().host 常為空，需 fallback 到 window.location。
 */
export function getRequestHostForMiddleware(): string {
  const normalizeHost = (raw: string | undefined): string => {
    if (!raw) return ''
    return raw.split(',')[0]?.trim() || ''
  }

  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.host || ''
  }

  // 反向代理/開發代理時，原始 Host 可能在 x-forwarded-host。
  const headers = useRequestHeaders(['x-forwarded-host', 'host'])
  const fromForwarded = normalizeHost(headers['x-forwarded-host'])
  if (fromForwarded) return fromForwarded

  const fromHost = normalizeHost(headers.host)
  if (fromHost) return fromHost

  try {
    return useRequestURL().host || ''
  } catch {
    return ''
  }
}
