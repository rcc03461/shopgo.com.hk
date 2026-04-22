import { and, eq, inArray } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminMenuReorderBodySchema } from '../../../utils/menuSchemas'
import { validateMenuReorderGraph } from '../../../utils/menuTree'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = adminMenuReorderBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }
  const { items } = parsed.data
  validateMenuReorderGraph(items)

  const db = getDb(event)
  try {
    const ids = items.map((item) => item.id)
    const existing = await db
      .select({ id: schema.shopMenus.id })
      .from(schema.shopMenus)
      .where(
        and(
          eq(schema.shopMenus.tenantId, session.tenantId),
          inArray(schema.shopMenus.id, ids),
        ),
      )

    if (existing.length !== ids.length) {
      throw createError({ statusCode: 400, message: '排序資料包含不存在的菜單項目' })
    }

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(schema.shopMenus)
          .set({
            parentId: item.parentId,
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.shopMenus.id, item.id),
              eq(schema.shopMenus.tenantId, session.tenantId),
            ),
          )
      }
    })

    return { ok: true }
  } catch (e: unknown) {
    if (isError(e)) throw e
    console.error('[admin/menus/reorder POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新排序失敗' })
  }
})

