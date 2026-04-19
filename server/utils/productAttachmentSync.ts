import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

export async function loadProductGalleryIds(
  db: Db,
  productId: string,
): Promise<string[]> {
  const rows = await db
    .select({ attachmentId: schema.attachmentEntityLinks.attachmentId })
    .from(schema.attachmentEntityLinks)
    .where(
      and(
        eq(schema.attachmentEntityLinks.entityType, 'product'),
        eq(schema.attachmentEntityLinks.entityId, productId),
      ),
    )
    .orderBy(
      asc(schema.attachmentEntityLinks.sortOrder),
      asc(schema.attachmentEntityLinks.id),
    )
  return rows.map((r) => r.attachmentId)
}

export async function syncProductMedia(
  db: Db,
  tenantId: string,
  productId: string,
  input: { coverAttachmentId: string | null; galleryAttachmentIds: string[] },
) {
  const galleryFiltered = input.galleryAttachmentIds.filter(
    (x) => x && x !== input.coverAttachmentId,
  )
  const allIds = [
    ...new Set(
      [input.coverAttachmentId, ...galleryFiltered].filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      ),
    ),
  ]

  if (allIds.length > 0) {
    const ok = await db
      .select({ id: schema.attachments.id })
      .from(schema.attachments)
      .where(
        and(
          inArray(schema.attachments.id, allIds),
          eq(schema.attachments.tenantId, tenantId),
          isNull(schema.attachments.deletedAt),
        ),
      )
    if (ok.length !== allIds.length) {
      throw createError({
        statusCode: 400,
        message: '附件不存在、已刪除或不屬於本店',
      })
    }
  }

  await db
    .delete(schema.attachmentEntityLinks)
    .where(
      and(
        eq(schema.attachmentEntityLinks.entityType, 'product'),
        eq(schema.attachmentEntityLinks.entityId, productId),
      ),
    )

  await db
    .update(schema.products)
    .set({
      coverAttachmentId: input.coverAttachmentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.products.id, productId),
        eq(schema.products.tenantId, tenantId),
      ),
    )

  for (let i = 0; i < galleryFiltered.length; i++) {
    await db.insert(schema.attachmentEntityLinks).values({
      attachmentId: galleryFiltered[i]!,
      entityType: 'product',
      entityId: productId,
      sortOrder: i,
    })
  }
}
