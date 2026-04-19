import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { assertCategoryParentAllowed } from '../../../utils/categoryParent'
import { adminPatchCategoryBodySchema } from '../../../utils/categorySchemas'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('分類 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const categoryId = idParsed.data

  const body = await readBody(event)
  const parsed = adminPatchCategoryBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: '沒有要更新的欄位' })
  }

  const db = getDb(event)

  try {
    if ('parentId' in patch) {
      await assertCategoryParentAllowed(
        db,
        session.tenantId,
        categoryId,
        patch.parentId ?? null,
      )
    }

    const next: Partial<typeof schema.categories.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (patch.name !== undefined) next.name = patch.name
    if (patch.slug !== undefined) next.slug = patch.slug
    if (patch.description !== undefined) next.description = patch.description
    if (patch.sortOrder !== undefined) next.sortOrder = patch.sortOrder
    if (patch.status !== undefined) next.status = patch.status
    if ('parentId' in patch) next.parentId = patch.parentId ?? null

    const [updated] = await db
      .update(schema.categories)
      .set(next)
      .where(
        and(
          eq(schema.categories.id, categoryId),
          eq(schema.categories.tenantId, session.tenantId),
        ),
      )
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到分類' })
    }

    return { category: updated }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/categories PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新分類失敗' })
  }
})
