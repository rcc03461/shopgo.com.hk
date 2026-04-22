import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminCreateMenuBodySchema } from '../../../utils/menuSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = adminCreateMenuBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const data = parsed.data
  const db = getDb(event)
  try {
    if (data.parentId) {
      const [parent] = await db
        .select({ id: schema.shopMenus.id })
        .from(schema.shopMenus)
        .where(
          and(
            eq(schema.shopMenus.id, data.parentId),
            eq(schema.shopMenus.tenantId, session.tenantId),
          ),
        )
        .limit(1)
      if (!parent) {
        throw createError({ statusCode: 400, message: '父層菜單不存在' })
      }
    }

    if (data.linkType === 'page') {
      const [page] = await db
        .select({ id: schema.pages.id })
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.id, data.pageId),
            eq(schema.pages.tenantId, session.tenantId),
          ),
        )
        .limit(1)
      if (!page) {
        throw createError({ statusCode: 400, message: '指定頁面不存在' })
      }
    }

    const [row] = await db
      .insert(schema.shopMenus)
      .values({
        tenantId: session.tenantId,
        title: data.title,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isVisible: data.isVisible ?? true,
        linkType: data.linkType,
        pageId: data.linkType === 'page' ? data.pageId : null,
        customUrl: data.linkType === 'custom' ? data.customUrl : null,
        target: data.target ?? '_self',
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立菜單失敗' })
    }
    return { item: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    console.error('[admin/menus POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立菜單失敗' })
  }
})

