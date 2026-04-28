import { createError } from 'h3'
import { normalizeRequestHostname } from '../../app/utils/hostNormalize'

/**
 * 拒絕平台根網域、www 前綴、與任一子網域字尾，避免與子網域路由衝突。
 */
export function assertCustomDomainHostnameAllowed(
  hostname: string,
  tenantRootDomain: string,
): void {
  const normalized = normalizeRequestHostname(hostname)
  if (normalized === null) {
    throw createError({ statusCode: 400, message: '網域格式無效' })
  }

  const root = tenantRootDomain.toLowerCase().trim()
  if (
    normalized === root ||
    normalized === `www.${root}` ||
    normalized.endsWith(`.${root}`)
  ) {
    throw createError({
      statusCode: 400,
      message: '不可使用平台網域或子網域作為自訂網域',
    })
  }
}
