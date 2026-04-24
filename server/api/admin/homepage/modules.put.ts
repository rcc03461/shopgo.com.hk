import { createError } from 'h3'
import { getDb } from '../../../utils/db'
import { dynamicToLegacyModules } from '../../../utils/homepageDynamic'
import { saveDraftModules } from '../../../utils/homepageModules'
import { homepageDynamicModulePutBodySchema, homepageModulePutBodySchema } from '../../../utils/homepageSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const body = await readBody(event)
  const parsedLegacy = homepageModulePutBodySchema.safeParse(body)
  const parsedDynamic = homepageDynamicModulePutBodySchema.safeParse(body)
  if (!parsedLegacy.success && !parsedDynamic.success) {
    throw createError({
      statusCode: 400,
      message:
        parsedLegacy.error.issues[0]?.message
        ?? parsedDynamic.error.issues[0]?.message
        ?? '首頁模組資料不正確',
    })
  }

  const db = getDb(event)
  const items = parsedLegacy.success
    ? parsedLegacy.data.items
    : dynamicToLegacyModules(parsedDynamic.data.items)
  await saveDraftModules(db, session.tenantId, items)

  return { ok: true }
})
