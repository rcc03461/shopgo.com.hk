import { getDb } from '../../../utils/db'
import { legacyToDynamicModules } from '../../../utils/homepageDynamic'
import { ensureDraftModules, listHomepageModules } from '../../../utils/homepageModules'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)
  const items = await ensureDraftModules(db, session.tenantId)
  const published = await listHomepageModules(db, session.tenantId, 'published')
  const draftUpdatedAt = new Date().toISOString()

  return {
    version: 'draft' as const,
    items,
    dynamicItems: legacyToDynamicModules(items),
    hasPublished: published.length > 0,
    draftUpdatedAt,
  }
})
