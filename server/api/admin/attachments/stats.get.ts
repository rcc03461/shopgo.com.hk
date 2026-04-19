import { and, count, eq, isNull, sql } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)

  const [sumRow] = await db
    .select({
      totalBytes: sql<string>`coalesce(sum(${schema.attachments.size}), 0)::text`,
    })
    .from(schema.attachments)
    .where(
      and(
        eq(schema.attachments.tenantId, session.tenantId),
        isNull(schema.attachments.deletedAt),
      ),
    )

  const [cntRow] = await db
    .select({ totalCount: count() })
    .from(schema.attachments)
    .where(
      and(
        eq(schema.attachments.tenantId, session.tenantId),
        isNull(schema.attachments.deletedAt),
      ),
    )

  return {
    totalBytes: Number(sumRow?.totalBytes ?? 0),
    totalCount: Number(cntRow?.totalCount ?? 0),
  }
})
