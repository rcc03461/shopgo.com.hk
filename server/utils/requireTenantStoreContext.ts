import { and, eq } from 'drizzle-orm'
import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import * as schema from '../database/schema'
import { getDb } from './db'

export async function requireTenantStoreContext(event: H3Event): Promise<{
  tenantId: string
  shopSlug: string
}> {
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'shopgo.hk')
  const host = getRequestURL(event).host
  const shopSlug = parseTenantSlugFromHost(host, root)
  if (!shopSlug) {
    throw createError({ statusCode: 403, message: '此功能僅限租戶子網域使用' })
  }

  const db = getDb(event)
  const row = await db
    .select({ id: schema.tenants.id, shopSlug: schema.tenants.shopSlug })
    .from(schema.tenants)
    .where(and(eq(schema.tenants.shopSlug, shopSlug)))
    .limit(1)
  const tenant = row[0]
  if (!tenant) {
    throw createError({ statusCode: 404, message: '找不到對應商店' })
  }
  return { tenantId: tenant.id, shopSlug: tenant.shopSlug }
}
