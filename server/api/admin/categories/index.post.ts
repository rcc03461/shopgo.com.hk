import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { assertCategoryParentAllowed } from '../../../utils/categoryParent'
import { adminCreateCategoryBodySchema } from '../../../utils/categorySchemas'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const body = await readBody(event)
  const parsed = adminCreateCategoryBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const data = parsed.data
  const db = getDb(event)

  try {
    await assertCategoryParentAllowed(
      db,
      session.tenantId,
      null,
      data.parentId ?? null,
    )

    const [row] = await db
      .insert(schema.categories)
      .values({
        tenantId: session.tenantId,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        status: data.status,
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立分類失敗' })
    }

    return { category: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/categories POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立分類失敗' })
  }
})
