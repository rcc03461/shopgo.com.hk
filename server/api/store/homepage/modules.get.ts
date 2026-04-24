import { getDb } from '../../../utils/db'
import { legacyToDynamicModules } from '../../../utils/homepageDynamic'
import { ensurePublishedModules } from '../../../utils/homepageModules'
import { requireStoreTenant } from '../../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)
  const items = await ensurePublishedModules(db, tenant.id)

  return {
    version: 'published' as const,
    items,
    dynamicItems: legacyToDynamicModules(items),
  }
})
