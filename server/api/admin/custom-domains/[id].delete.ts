import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('自訂網域 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) {
    throw createError({ statusCode: 404, message: parsed.error.issues[0]?.message })
  }
  const id = parsed.data
  const db = getDb(event)

  const [deleted] = await db
    .delete(schema.tenantCustomDomains)
    .where(
      and(
        eq(schema.tenantCustomDomains.id, id),
        eq(schema.tenantCustomDomains.tenantId, session.tenantId),
      ),
    )
    .returning({ id: schema.tenantCustomDomains.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: '找不到自訂網域' })
  }

  return { ok: true }
})
