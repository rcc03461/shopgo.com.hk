import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { adminCreateAttachmentBodySchema } from '../../../utils/attachmentSchemas'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const body = await readBody(event)
  const parsed = adminCreateAttachmentBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const d = parsed.data
  const db = getDb(event)

  try {
    const [row] = await db
      .insert(schema.attachments)
      .values({
        tenantId: session.tenantId,
        type: d.type,
        mimetype: d.mimetype,
        filename: d.filename,
        extension: d.extension,
        size: d.size,
        storageKey: d.storageKey ?? null,
        publicUrl: d.publicUrl ?? null,
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立附件失敗' })
    }

    return { attachment: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    console.error('[admin/attachments POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立附件失敗' })
  }
})
