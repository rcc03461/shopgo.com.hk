import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(q.pageSize) || DEFAULT_PAGE_SIZE),
  )
  const search =
    typeof q.q === 'string' && q.q.trim().length > 0 ? q.q.trim() : ''

  const db = getDb(event)
  const tenantId = session.tenantId

  const whereClause = search
    ? and(
        eq(schema.categories.tenantId, tenantId),
        or(
          ilike(schema.categories.name, `%${search}%`),
          ilike(schema.categories.slug, `%${search}%`),
        ),
      )
    : eq(schema.categories.tenantId, tenantId)

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.categories)
    .where(whereClause)

  const total = Number(totalRow?.total ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.categories.id,
      parentId: schema.categories.parentId,
      sortOrder: schema.categories.sortOrder,
      slug: schema.categories.slug,
      name: schema.categories.name,
      status: schema.categories.status,
      updatedAt: schema.categories.updatedAt,
    })
    .from(schema.categories)
    .where(whereClause)
    .orderBy(
      asc(schema.categories.sortOrder),
      asc(schema.categories.name),
      asc(schema.categories.id),
    )
    .limit(pageSize)
    .offset(offset)

  const parentIds = [
    ...new Set(rows.map((r) => r.parentId).filter((x): x is string => !!x)),
  ]
  const parentNameMap = new Map<string, string>()
  if (parentIds.length > 0) {
    const parents = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
      })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.tenantId, tenantId),
          inArray(schema.categories.id, parentIds),
        ),
      )
    for (const p of parents) {
      parentNameMap.set(p.id, p.name)
    }
  }

  return {
    items: rows.map((r) => ({
      ...r,
      parentName: r.parentId ? (parentNameMap.get(r.parentId) ?? null) : null,
    })),
    page,
    pageSize,
    total,
  }
})
