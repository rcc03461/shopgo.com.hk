import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../database/schema'
import type { getDb } from './db'

type Db = ReturnType<typeof getDb>

/** 建立／更新時驗證上層分類存在、同租戶，且更新時不會形成循環。 */
export async function assertCategoryParentAllowed(
  db: Db,
  tenantId: string,
  categoryId: string | null,
  newParentId: string | null,
) {
  if (newParentId === null) return

  if (categoryId !== null && newParentId === categoryId) {
    throw createError({ statusCode: 400, message: '不可將自己設為上層分類' })
  }

  const [parent] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.id, newParentId),
        eq(schema.categories.tenantId, tenantId),
      ),
    )
    .limit(1)

  if (!parent) {
    throw createError({ statusCode: 400, message: '上層分類不存在' })
  }

  if (categoryId === null) return

  let cur: string | null = newParentId
  while (cur) {
    if (cur === categoryId) {
      throw createError({
        statusCode: 400,
        message: '不可建立循環分類關係',
      })
    }
    const [row] = await db
      .select({ parentId: schema.categories.parentId })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.id, cur),
          eq(schema.categories.tenantId, tenantId),
        ),
      )
      .limit(1)
    cur = row?.parentId ?? null
  }
}
