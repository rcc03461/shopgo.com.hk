import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('菜單 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) {
    throw createError({ statusCode: 404, message: parsed.error.issues[0]?.message })
  }
  const menuId = parsed.data
  const db = getDb(event)

  const [exists] = await db
    .select({ id: schema.shopMenus.id })
    .from(schema.shopMenus)
    .where(and(eq(schema.shopMenus.id, menuId), eq(schema.shopMenus.tenantId, session.tenantId)))
    .limit(1)
  if (!exists) {
    throw createError({ statusCode: 404, message: '找不到菜單' })
  }

  const [child] = await db
    .select({ id: schema.shopMenus.id })
    .from(schema.shopMenus)
    .where(
      and(eq(schema.shopMenus.parentId, menuId), eq(schema.shopMenus.tenantId, session.tenantId)),
    )
    .limit(1)
  if (child) {
    throw createError({ statusCode: 409, message: '此菜單下有子項目，請先移除或調整子菜單' })
  }

  const [deleted] = await db
    .delete(schema.shopMenus)
    .where(and(eq(schema.shopMenus.id, menuId), eq(schema.shopMenus.tenantId, session.tenantId)))
    .returning({ id: schema.shopMenus.id })
  if (!deleted) {
    throw createError({ statusCode: 404, message: '找不到菜單' })
  }

  return { ok: true }
})

