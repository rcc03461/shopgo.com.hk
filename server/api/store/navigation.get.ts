import { and, asc, eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { buildMenuTree } from '../../utils/menuTree'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const rows = await db
    .select({
      id: schema.shopMenus.id,
      title: schema.shopMenus.title,
      parentId: schema.shopMenus.parentId,
      sortOrder: schema.shopMenus.sortOrder,
      target: schema.shopMenus.target,
      linkType: schema.shopMenus.linkType,
      customUrl: schema.shopMenus.customUrl,
      pageSlug: schema.pages.slug,
    })
    .from(schema.shopMenus)
    .leftJoin(
      schema.pages,
      and(
        eq(schema.shopMenus.pageId, schema.pages.id),
        eq(schema.pages.tenantId, tenant.id),
        eq(schema.pages.status, 'published'),
      ),
    )
    .where(and(eq(schema.shopMenus.tenantId, tenant.id), eq(schema.shopMenus.isVisible, true)))
    .orderBy(asc(schema.shopMenus.sortOrder), asc(schema.shopMenus.createdAt))

  const normalizedRows = rows
    .map((row) => {
      const href = row.linkType === 'page' ? (row.pageSlug ? `/p/${row.pageSlug}` : null) : row.customUrl
      return {
        id: row.id,
        title: row.title,
        parentId: row.parentId,
        sortOrder: row.sortOrder,
        target: row.target,
        href,
      }
    })
    .filter((row) => Boolean(row.href))

  return {
    items: buildMenuTree(normalizedRows),
  }
})

