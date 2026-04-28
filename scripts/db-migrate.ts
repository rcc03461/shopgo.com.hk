/**
 * 套用 Drizzle migrations。
 * 內建 `migrate()` 會先執行 `CREATE SCHEMA`，許多雲端「僅應用程式」帳號沒有此權限；
 * 此腳本改為只在 `public` 建立 `__drizzle_migrations` 表並套用 SQL，錯誤會完整印出。
 *
 * 用法：bun run db:migrate
 */
import './load-env-from-dotenv.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import { buildDatabaseUrlFromEnv } from '../server/database/connectionUrl'
import { getPostgresJsSslOptions } from '../server/database/postgresOptions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(__dirname, '../server/database/migrations')

async function main() {
  let url: string
  try {
    url = buildDatabaseUrlFromEnv()
  } catch (e) {
    console.error('[db-migrate] 無法組合連線字串:', e)
    process.exit(1)
    return
  }

  const sslOpts = getPostgresJsSslOptions()
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ...sslOpts,
  })

  try {
    console.info('[db-migrate] 套用 migrations…', migrationsFolder)

    const migrations = readMigrationFiles({ migrationsFolder })

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `)

    const lastRows = await sql<
      { id: number; hash: string; created_at: string | number | bigint }[]
    >`select id, hash, created_at from public.__drizzle_migrations order by created_at desc limit 1`
    const lastDbMigration = lastRows[0]

    await sql.begin(async (tx) => {
      for (const migration of migrations) {
        const lastMs = lastDbMigration
          ? Number(lastDbMigration.created_at)
          : 0
        if (!lastDbMigration || lastMs < migration.folderMillis) {
          for (const stmt of migration.sql) {
            const trimmed = stmt.trim()
            if (trimmed.length > 0) {
              await tx.unsafe(trimmed)
            }
          }
          await tx`
            insert into public.__drizzle_migrations ("hash", "created_at")
            values (${migration.hash}, ${migration.folderMillis})
          `
        }
      }
    })

    console.info('[db-migrate] 完成')
  } catch (e) {
    console.error('[db-migrate] 失敗:', e)
    const err = e as { cause?: { code?: string; message?: string } }
    const code = err.cause?.code
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
      console.error(
        '\n[db-migrate] 連線中斷常見原因：主機／埠錯誤、防火牆未開放，或 SSL 模式與伺服器不符。',
      )
      console.error(
        '可嘗試在 .env 調整：DB_SSLMODE=prefer 或 DB_SSLMODE=disable（僅限確定伺服器不加密時）；',
      )
      console.error(
        '若為憑證驗證失敗，可試：DB_SSL_REJECT_UNAUTHORIZED=false（僅建議開發環境）。\n',
      )
    }
    if (code === '42501') {
      console.error(
        '\n[db-migrate] 權限不足（42501）：請確認帳號可在 public schema 建表並執行 migration SQL；',
      )
      console.error(
        '或由 DBA 執行：GRANT CREATE ON SCHEMA public TO 你的角色;（依主機商政策而定）。\n',
      )
    }
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

void main()
