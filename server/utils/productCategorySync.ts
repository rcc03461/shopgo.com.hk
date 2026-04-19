import { and, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

/** 去除重複 id，保留第一次出現順序（作為該商品上的分類排序） */
export function dedupeCategoryIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * 以傳入順序覆寫商品分類；並驗證分類皆屬於同一租戶。
 * 會更新商品的 `updated_at`。
 */
export async function syncProductCategories(
  db: Db,
  tenantId: string,
  productId: string,
  categoryIds: string[],
) {
  const uniqueOrdered = dedupeCategoryIds(categoryIds)

  if (uniqueOrdered.length > 0) {
    const rows = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.tenantId, tenantId),
          inArray(schema.categories.id, uniqueOrdered),
        ),
      )
    if (rows.length !== uniqueOrdered.length) {
      throw createError({
        statusCode: 400,
        message: '部分分類不存在或不屬於此商店',
      })
    }
  }

  await db
    .delete(schema.productCategories)
    .where(eq(schema.productCategories.productId, productId))

  if (uniqueOrdered.length > 0) {
    await db.insert(schema.productCategories).values(
      uniqueOrdered.map((categoryId, i) => ({
        productId,
        categoryId,
        sortOrder: i,
      })),
    )
  }

  await db
    .update(schema.products)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(schema.products.id, productId),
        eq(schema.products.tenantId, tenantId),
      ),
    )
}
