import { config } from 'dotenv'
import { resolve } from 'node:path'
import { defineConfig } from 'drizzle-kit'
import { buildDatabaseUrlFromEnv } from './server/database/connectionUrl'

config({ path: resolve(process.cwd(), '.env') })

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: buildDatabaseUrlFromEnv(),
  },
})
