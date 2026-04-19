import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('分類 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const categoryId = idParsed.data

  const db = getDb(event)

  const [row] = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.id, categoryId),
        eq(schema.categories.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到分類' })
  }

  let parent: { id: string; name: string; slug: string } | null = null
  if (row.parentId) {
    const [p] = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
      })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.id, row.parentId),
          eq(schema.categories.tenantId, session.tenantId),
        ),
      )
      .limit(1)
    parent = p ?? null
  }

  return { category: row, parent }
})
