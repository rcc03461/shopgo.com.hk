/**
 * `tsx`／`node` 執行 scripts 時不會像 Nuxt 自動載入 .env，需在讀取 process.env 前呼叫。
 */
import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(dir, '../.env') })
