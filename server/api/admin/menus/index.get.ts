import { and, asc, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { buildMenuTree } from '../../../utils/menuTree'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)

  const rows = await db
    .select({
      id: schema.shopMenus.id,
      title: schema.shopMenus.title,
      parentId: schema.shopMenus.parentId,
      sortOrder: schema.shopMenus.sortOrder,
      isVisible: schema.shopMenus.isVisible,
      linkType: schema.shopMenus.linkType,
      pageId: schema.shopMenus.pageId,
      customUrl: schema.shopMenus.customUrl,
      target: schema.shopMenus.target,
      updatedAt: schema.shopMenus.updatedAt,
      pageSlug: schema.pages.slug,
    })
    .from(schema.shopMenus)
    .leftJoin(
      schema.pages,
      and(
        eq(schema.shopMenus.pageId, schema.pages.id),
        eq(schema.pages.tenantId, session.tenantId),
      ),
    )
    .where(eq(schema.shopMenus.tenantId, session.tenantId))
    .orderBy(asc(schema.shopMenus.sortOrder), asc(schema.shopMenus.createdAt))

  return {
    items: buildMenuTree(rows),
  }
})

