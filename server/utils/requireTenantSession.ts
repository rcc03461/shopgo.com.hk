import { getCookie, createError } from 'h3'
import type { H3Event } from 'h3'
import { AUTH_COOKIE, verifySessionToken, type SessionPayload } from './authJwt'
import { tryResolveStoreTenant } from './resolveStoreTenantFromHost'

/**
 * Admin API：驗證登入 Cookie，並確認請求 Host 與 JWT tenant 一致（含自訂網域）。
 */
export async function requireTenantSession(event: H3Event): Promise<SessionPayload> {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) {
    throw createError({ statusCode: 401, message: '未登入' })
  }

  const session = await verifySessionToken(event, token)
  const resolved = await tryResolveStoreTenant(event)

  if (
    !resolved ||
    resolved.id !== session.tenantId ||
    resolved.shopSlug !== session.shopSlug
  ) {
    throw createError({ statusCode: 403, message: '商店網域與登入狀態不符' })
  }

  return session
}
