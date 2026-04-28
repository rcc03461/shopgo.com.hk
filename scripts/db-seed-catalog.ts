/**
 * 建立首頁卡片測試用資料：分類 + 商品。
 *
 * 用法：
 *   bun run db:seed:catalog
 *   bun run db:seed:catalog --tenant demo --categories 10 --products 20
 */
import './load-env-from-dotenv.js'
import postgres from 'postgres'
import { buildDatabaseUrlFromEnv } from '../server/database/connectionUrl'
import { getPostgresJsSslOptions } from '../server/database/postgresOptions'

type SeedArgs = {
  tenantSlug: string
  categories: number
  products: number
}

function parseArgs(argv: string[]): SeedArgs {
  const args: SeedArgs = {
    tenantSlug: 'demo',
    categories: 10,
    products: 20,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (!next) continue

    if (token === '--tenant') {
      args.tenantSlug = next.trim()
      i += 1
      continue
    }
    if (token === '--categories') {
      args.categories = Number(next)
      i += 1
      continue
    }
    if (token === '--products') {
      args.products = Number(next)
      i += 1
    }
  }

  if (!Number.isInteger(args.categories) || args.categories <= 0) {
    throw new Error('--categories 必須是大於 0 的整數')
  }
  if (!Number.isInteger(args.products) || args.products <= 0) {
    throw new Error('--products 必須是大於 0 的整數')
  }
  if (!args.tenantSlug) {
    throw new Error('--tenant 不可為空')
  }

  return args
}

function pad2(num: number): string {
  return String(num).padStart(2, '0')
}

async function resolveTenantId(
  sql: postgres.Sql<Record<string, unknown>>,
  tenantSlug: string,
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    select id
    from tenants
    where shop_slug = ${tenantSlug}
    limit 1
  `
  const tenant = rows[0]
  if (!tenant) {
    throw new Error(`找不到 tenant: ${tenantSlug}，請先建立店舖`)
  }
  return tenant.id
}

async function upsertCategories(
  sql: postgres.Sql<Record<string, unknown>>,
  tenantId: string,
  count: number,
) {
  const categoryIds: string[] = []
  for (let i = 1; i <= count; i += 1) {
    const n = pad2(i)
    const slug = `seed-category-${n}`
    const name = `Seed Category ${n}`
    const description = `Homepage card seed category ${n}`
    const sortOrder = i

    const rows = await sql<{ id: string }[]>`
      insert into categories (
        tenant_id,
        parent_id,
        sort_order,
        slug,
        name,
        description,
        status,
        updated_at
      ) values (
        ${tenantId},
        null,
        ${sortOrder},
        ${slug},
        ${name},
        ${description},
        'active',
        now()
      )
      on conflict (tenant_id, slug)
      do update set
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        status = excluded.status,
        updated_at = now()
      returning id
    `
    if (!rows[0]?.id) {
      throw new Error(`分類 upsert 失敗：${slug}`)
    }
    categoryIds.push(rows[0].id)
  }
  return categoryIds
}

async function upsertProducts(
  sql: postgres.Sql<Record<string, unknown>>,
  tenantId: string,
  categoryIds: string[],
  count: number,
) {
  const safeCategoryIds = categoryIds.length > 0 ? categoryIds : ['']
  const linkRows: Array<{ productId: string; categoryId: string }> = []

  for (let i = 1; i <= count; i += 1) {
    const n = pad2(i)
    const slug = `seed-product-${n}`
    const title = `Seed Product ${n}`
    const description = `Homepage card seed product ${n}`
    const basePrice = String(100 + i * 10)
    const originalPrice = String(120 + i * 10)

    const rows = await sql<{ id: string }[]>`
      insert into products (
        tenant_id,
        slug,
        title,
        description,
        base_price,
        original_price,
        cover_attachment_id,
        updated_at
      ) values (
        ${tenantId},
        ${slug},
        ${title},
        ${description},
        ${basePrice},
        ${originalPrice},
        null,
        now()
      )
      on conflict (tenant_id, slug)
      do update set
        title = excluded.title,
        description = excluded.description,
        base_price = excluded.base_price,
        original_price = excluded.original_price,
        updated_at = now()
      returning id
    `
    const productId = rows[0]?.id
    if (!productId) {
      throw new Error(`商品 upsert 失敗：${slug}`)
    }

    const categoryId = safeCategoryIds[(i - 1) % safeCategoryIds.length]
    if (categoryId) {
      linkRows.push({ productId, categoryId })
    }
  }

  for (let i = 0; i < linkRows.length; i += 1) {
    const link = linkRows[i]
    await sql`
      insert into product_categories (product_id, category_id, sort_order)
      values (${link.productId}, ${link.categoryId}, ${i + 1})
      on conflict (product_id, category_id)
      do update set sort_order = excluded.sort_order
    `
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = buildDatabaseUrlFromEnv()
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ...getPostgresJsSslOptions(),
  })

  try {
    const tenantId = await resolveTenantId(sql, args.tenantSlug)
    const categoryIds = await upsertCategories(sql, tenantId, args.categories)
    await upsertProducts(sql, tenantId, categoryIds, args.products)

    console.info(
      `[db-seed-catalog] 完成 tenant=${args.tenantSlug} categories=${args.categories} products=${args.products}`,
    )
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
