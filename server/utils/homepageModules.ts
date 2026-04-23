import { and, asc, eq } from 'drizzle-orm'
import { landingCategories, landingHero, landingProducts } from '../../app/data/landing'
import * as schema from '../database/schema'
import type { HomepageModule, HomepageVersionState } from '../../app/types/homepage'
import { getDb } from './db'

const defaultModules: HomepageModule[] = [
  {
    moduleKey: 'main-nav',
    moduleType: 'nav',
    sortOrder: 0,
    isEnabled: true,
    config: { show: true },
  },
  {
    moduleKey: 'main-banner',
    moduleType: 'banner',
    sortOrder: 1,
    isEnabled: true,
    config: { hero: landingHero },
  },
  {
    moduleKey: 'main-category',
    moduleType: 'category',
    sortOrder: 2,
    isEnabled: true,
    config: { title: '商品分類', categories: landingCategories },
  },
  {
    moduleKey: 'main-products',
    moduleType: 'products',
    sortOrder: 3,
    isEnabled: true,
    config: { title: '精選商品', categories: landingCategories, products: landingProducts },
  },
  {
    moduleKey: 'main-footer',
    moduleType: 'footer',
    sortOrder: 4,
    isEnabled: true,
    config: { text: '© OShop · oshop.com.hk' },
  },
]

function normalizeModuleRow(row: {
  moduleKey: string
  moduleType: HomepageModule['moduleType']
  sortOrder: number
  isEnabled: boolean
  configJson: Record<string, unknown>
}): HomepageModule {
  return {
    moduleKey: row.moduleKey,
    moduleType: row.moduleType,
    sortOrder: row.sortOrder,
    isEnabled: row.isEnabled,
    config: row.configJson as HomepageModule['config'],
  }
}

export async function listHomepageModules(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  versionState: HomepageVersionState,
) {
  const rows = await db
    .select({
      moduleKey: schema.tenantHomepageModules.moduleKey,
      moduleType: schema.tenantHomepageModules.moduleType,
      sortOrder: schema.tenantHomepageModules.sortOrder,
      isEnabled: schema.tenantHomepageModules.isEnabled,
      configJson: schema.tenantHomepageModules.configJson,
    })
    .from(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, versionState),
      ),
    )
    .orderBy(asc(schema.tenantHomepageModules.sortOrder), asc(schema.tenantHomepageModules.createdAt))

  return rows.map(normalizeModuleRow)
}

export async function ensureDraftModules(
  db: ReturnType<typeof getDb>,
  tenantId: string,
) {
  const existingDraft = await listHomepageModules(db, tenantId, 'draft')
  if (existingDraft.length) return existingDraft

  const published = await listHomepageModules(db, tenantId, 'published')
  const source = published.length ? published : defaultModules

  await db
    .delete(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, 'draft'),
      ),
    )
  await db.insert(schema.tenantHomepageModules).values(
    source.map((item, idx) => ({
      tenantId,
      versionState: 'draft',
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
      sortOrder: idx,
      isEnabled: item.isEnabled,
      configJson: item.config as Record<string, unknown>,
      updatedAt: new Date(),
    })),
  )

  return await listHomepageModules(db, tenantId, 'draft')
}

export async function resetDraftFromPublished(
  db: ReturnType<typeof getDb>,
  tenantId: string,
) {
  const published = await listHomepageModules(db, tenantId, 'published')
  const source = published.length ? published : defaultModules
  await db
    .delete(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, 'draft'),
      ),
    )
  await db.insert(schema.tenantHomepageModules).values(
    source.map((item, idx) => ({
      tenantId,
      versionState: 'draft',
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
      sortOrder: idx,
      isEnabled: item.isEnabled,
      configJson: item.config as Record<string, unknown>,
      updatedAt: new Date(),
    })),
  )
}

export async function saveDraftModules(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  items: HomepageModule[],
) {
  await db
    .delete(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, 'draft'),
      ),
    )
  await db.insert(schema.tenantHomepageModules).values(
    items.map((item, idx) => ({
      tenantId,
      versionState: 'draft',
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
      sortOrder: idx,
      isEnabled: item.isEnabled,
      configJson: item.config as Record<string, unknown>,
      updatedAt: new Date(),
    })),
  )
}

export async function publishDraftModules(
  db: ReturnType<typeof getDb>,
  tenantId: string,
) {
  const draft = await ensureDraftModules(db, tenantId)
  await db
    .delete(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, 'published'),
      ),
    )
  await db.insert(schema.tenantHomepageModules).values(
    draft.map((item, idx) => ({
      tenantId,
      versionState: 'published',
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
      sortOrder: idx,
      isEnabled: item.isEnabled,
      configJson: item.config as Record<string, unknown>,
      updatedAt: new Date(),
    })),
  )
}

export async function ensurePublishedModules(
  db: ReturnType<typeof getDb>,
  tenantId: string,
) {
  const published = await listHomepageModules(db, tenantId, 'published')
  if (published.length) return published

  const draft = await listHomepageModules(db, tenantId, 'draft')
  const source = draft.length ? draft : defaultModules

  await db
    .delete(schema.tenantHomepageModules)
    .where(
      and(
        eq(schema.tenantHomepageModules.tenantId, tenantId),
        eq(schema.tenantHomepageModules.versionState, 'published'),
      ),
    )
  await db.insert(schema.tenantHomepageModules).values(
    source.map((item, idx) => ({
      tenantId,
      versionState: 'published',
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
      sortOrder: idx,
      isEnabled: item.isEnabled,
      configJson: item.config as Record<string, unknown>,
      updatedAt: new Date(),
    })),
  )

  return await listHomepageModules(db, tenantId, 'published')
}

