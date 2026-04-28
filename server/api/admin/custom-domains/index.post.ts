import { randomBytes } from 'node:crypto'
import { createError, isError, readBody } from 'h3'
import * as schema from '../../../database/schema'
import { normalizeRequestHostname } from '../../../../app/utils/hostNormalize'
import { getDb } from '../../../utils/db'
import { assertCustomDomainHostnameAllowed } from '../../../utils/customDomainHostnamePolicy'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const root = String(
    useRuntimeConfig(event).public.tenantRootDomain || 'shopgo.com.hk',
  ).trim()

  const body = (await readBody(event)) as { hostname?: unknown }
  const raw =
    typeof body?.hostname === 'string' ? body.hostname.trim() : ''
  const normalized = normalizeRequestHostname(raw)
  if (normalized === null) {
    throw createError({ statusCode: 400, message: '網域格式無效' })
  }

  assertCustomDomainHostnameAllowed(normalized, root)

  const verificationToken = randomBytes(32).toString('hex')
  const db = getDb(event)

  try {
    const [row] = await db
      .insert(schema.tenantCustomDomains)
      .values({
        tenantId: session.tenantId,
        hostname: normalized,
        verificationToken,
        verifiedAt: null,
      })
      .returning({
        id: schema.tenantCustomDomains.id,
        hostname: schema.tenantCustomDomains.hostname,
      })

    if (!row) {
      throw createError({ statusCode: 500, message: '建立自訂網域失敗' })
    }

    return {
      id: row.id,
      hostname: row.hostname,
      verifiedAt: null,
      verificationToken,
    }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網域已被其他商店使用' })
    }
    console.error('[admin/custom-domains POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立自訂網域失敗' })
  }
})
