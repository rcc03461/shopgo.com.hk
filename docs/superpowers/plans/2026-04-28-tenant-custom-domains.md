# 租戶多自訂網域（Custom Domains）實作計劃

> **給代理／實作者：** 建議依序執行，並以 checkbox 勾選進度。可搭配 `subagent-driven-development` 或 `executing-plans` 逐任務實作。

**Goal:** 每家店（`tenants`）可綁定多個已驗證的自訂 `hostname`；HTTP 請求可依 `Host` 解析到正確租戶；保留既有 `{slug}.{tenantRootDomain}` 行為；後台 Admin Session 在自訂網域上以 `tenantId` 對齊，不因 Host 無 slug 而失敗。

**Architecture:** 新增 `tenant_custom_domains` 表（`hostname` 全域唯一、`verified_at` 可空）。集中實作 `resolveStoreTenantFromHost`：先查已驗證自訂網域，再 fallback `parseTenantSlugFromHost` + `tenants.shop_slug`。`requireStoreTenant` / `requireTenantStoreContext` / `requireTenantSession` 一律改依此解析。前端全域 middleware 在「自訂網域」時透過輕量 API 取得 canonical `shopSlug` 填入既有 `oshop-tenant-slug` state。驗證採 DNS TXT（`_oshop-verify.<hostname>` 或於 apex 上使用子網域約定，見 Task 7）。

**Tech Stack:** Nuxt / Nitro、Drizzle ORM、PostgreSQL、Bun（`bun:test`）、專案既有 `parseTenantSlugFromHost`（`app/utils/tenantHost.ts`）。

---

## 檔案與責任邊界

| 路徑 | 動作 | 職責 |
|------|------|------|
| `server/database/migrations/0020_tenant_custom_domains.sql` | 新增 | DDL：`tenant_custom_domains` |
| `server/database/schema.ts` | 修改 | `tenantCustomDomains` 表定義與型別 |
| `app/utils/hostNormalize.ts` | 新增 | `normalizeRequestHostname`（小寫、去 port、拒絕空值／明顯非法） |
| `server/utils/resolveStoreTenantFromHost.ts` | 新增 | 非拋錯 `tryResolveStoreTenant`、拋錯包裝沿用現有 status |
| `server/utils/storeTenant.ts` | 修改 | 改為呼叫 resolver |
| `server/utils/requireTenantStoreContext.ts` | 修改 | 同上 |
| `server/utils/requireTenantSession.ts` | 修改 | Host 解析後比對 `session.tenantId === tenant.id` |
| `server/api/store/host-context.get.ts` | 新增 | 返回 `{ shopSlug: string \| null }` 供 middleware 使用 |
| `app/middleware/00-tenant-slug.global.ts` | 修改 | server/client 皆能取得 canonical slug |
| `server/api/admin/custom-domains/index.get.ts` | 新增 | 列表 |
| `server/api/admin/custom-domains/index.post.ts` | 新增 | 新增待驗證網域 |
| `server/api/admin/custom-domains/[id].delete.ts` | 新增 | 刪除 |
| `server/api/admin/custom-domains/[id]/verify.post.ts` | 新增 | DNS TXT 驗證並寫入 `verified_at` |
| `server/utils/customDomainDnsVerify.ts` | 新增 | TXT 查詢與比對 token（Bun/Node `dns.promises`） |
| `app/utils/tenantHost.ts` | 可選修改 | 若需抽出「是否為平台根域／www」供驗證共用 |
| `app/pages/admin/settings/domains.vue`（或併入既有 settings） | 可選新增 | 管理 UI |
| `docs/TODO.md` / `docs/manual-test-tenant-customer-flow.md` | 修改 | 手動測試步驟補充 |
| `app/utils/hostNormalize.test.ts` | 新增 | `normalizeRequestHostname` 單元測試 |

---

### Task 1: 資料庫 migration 與 Drizzle schema

**Files:**
- Create: `server/database/migrations/0020_tenant_custom_domains.sql`
- Modify: `server/database/schema.ts`

- [ ] **Step 1.1: 撰寫 migration SQL**

```sql
-- 租戶自訂網域（多對一）；hostname 儲存正規化小寫不含 port
CREATE TABLE tenant_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname VARCHAR(253) NOT NULL,
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_custom_domains_hostname_key UNIQUE (hostname)
);

CREATE INDEX tenant_custom_domains_tenant_id_idx ON tenant_custom_domains (tenant_id);
CREATE INDEX tenant_custom_domains_verified_hostname_idx
  ON tenant_custom_domains (hostname)
  WHERE verified_at IS NOT NULL;
```

- [ ] **Step 1.2: 在本機套用 migration**

依專案慣用指令執行（若為手動跑 SQL，對開發用 DB 執行上述檔案）。預期：表建立成功、無重複 migration 編號。

- [ ] **Step 1.3: 在 `schema.ts` 新增表定義**

在 `tenants` 附近加入（欄位名請與 SQL 完全一致）：

```ts
export const tenantCustomDomains = pgTable(
  'tenant_custom_domains',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    hostname: varchar('hostname', { length: 253 }).notNull().unique(),
    verificationToken: text('verification_token').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('tenant_custom_domains_tenant_id_idx').on(t.tenantId),
    index('tenant_custom_domains_verified_hostname_idx').on(t.hostname),
  ],
)
```

若使用 partial index，Drizzle 版本若不支援可在 migration 保留、schema 僅保留普通 index。

- [ ] **Step 1.4: 執行型別檢查**

Run: `bunx nuxi typecheck`（或專案既有 `bun run` 對應指令）  
Expected: 無新增型別錯誤。

- [ ] **Step 1.5: Commit**

```bash
git add server/database/migrations/0020_tenant_custom_domains.sql server/database/schema.ts
git commit -m "db: add tenant_custom_domains for multi custom hostnames"
```

---

### Task 2: Hostname 正規化與防呆規則

**Files:**
- Create: `app/utils/hostNormalize.ts`
- Create: `app/utils/hostNormalize.test.ts`（先寫測試）

- [ ] **Step 2.1: 撰寫失敗測試（Bun）**

```ts
// app/utils/hostNormalize.test.ts
import { describe, expect, test } from 'bun:test'
import { normalizeRequestHostname } from './hostNormalize'

describe('normalizeRequestHostname', () => {
  test('小寫並去除 port', () => {
    expect(normalizeRequestHostname('Shop.EXAMPLE.com:443')).toBe('shop.example.com')
  })
  test('拒絕空字串', () => {
    expect(normalizeRequestHostname('')).toBeNull()
  })
})
```

- [ ] **Step 2.2: 執行測試確認失敗**

Run: `bun test app/utils/hostNormalize.test.ts`  
Expected: FAIL（模組未定義）

- [ ] **Step 2.3: 實作 `app/utils/hostNormalize.ts`**

```ts
/**
 * 將 HTTP Host header 轉成比對用 hostname（小寫、無 port）。
 * 不合規時回 null。
 */
export function normalizeRequestHostname(hostHeader: string): string | null {
  const h = hostHeader.split(':')[0]?.toLowerCase().trim() ?? ''
  if (!h || h === 'localhost' || h === '127.0.0.1') return null
  if (h.includes('/') || h.includes(' ')) return null
  if (h.startsWith('.') || h.endsWith('.')) return null
  if (h.length > 253) return null
  return h
}
```

- [ ] **Step 2.4: 測試通過**

Run: `bun test app/utils/hostNormalize.test.ts`  
Expected: PASS

- [ ] **Step 2.5: Commit**

```bash
git add app/utils/hostNormalize.ts app/utils/hostNormalize.test.ts
git commit -m "feat: normalize hostname for custom domain matching"
```

---

### Task 3: 集中解析 `resolveStoreTenantFromHost`

**Files:**
- Create: `server/utils/resolveStoreTenantFromHost.ts`
- Modify: `server/utils/storeTenant.ts`
- Modify: `server/utils/requireTenantStoreContext.ts`

- [ ] **Step 3.1: 實作 resolver（核心邏輯）**

新增 `server/utils/resolveStoreTenantFromHost.ts`：

```ts
import { and, eq, isNotNull } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import { normalizeRequestHostname } from '../../app/utils/hostNormalize'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import * as schema from '../database/schema'
import { getDb } from './db'

export type ResolvedStoreTenant = {
  id: string
  shopSlug: string
  /** 除錯／審計用；可不回傳給前端 */
  match: 'custom_domain' | 'subdomain'
}

/**
 * 依 Host 解析租戶；無匹配時回 null（不拋錯）。
 */
export async function tryResolveStoreTenant(
  event: H3Event,
): Promise<ResolvedStoreTenant | null> {
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'shopgo.com.hk')
  const rawHost = getRequestURL(event).host
  const host = normalizeRequestHostname(rawHost)
  if (!host) return null

  const db = getDb(event)

  const [custom] = await db
    .select({
      tenantId: schema.tenantCustomDomains.tenantId,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.tenantCustomDomains)
    .innerJoin(
      schema.tenants,
      eq(schema.tenantCustomDomains.tenantId, schema.tenants.id),
    )
    .where(
      and(
        eq(schema.tenantCustomDomains.hostname, host),
        isNotNull(schema.tenantCustomDomains.verifiedAt),
      ),
    )
    .limit(1)

  if (custom?.tenantId && custom.shopSlug) {
    return {
      id: custom.tenantId,
      shopSlug: custom.shopSlug,
      match: 'custom_domain',
    }
  }

  const slug = parseTenantSlugFromHost(rawHost, root)
  if (!slug) return null

  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.shopSlug, slug))
    .limit(1)

  if (!tenant) return null
  return { id: tenant.id, shopSlug: tenant.shopSlug, match: 'subdomain' }
}
```

※ 確認 `schema.ts` 匯出名稱為 `tenantCustomDomains` 且欄位 `verifiedAt` 對應資料庫欄位 `verified_at`。

- [ ] **Step 3.2: 改寫 `server/utils/storeTenant.ts`**

將 `requireStoreTenant` 改為：`const tenant = await tryResolveStoreTenant(event)`；若 `!tenant` 則拋出與現狀相同意涵的 404（沿用原訊息）；若存在則回傳 `{ id, shopSlug }`。

- [ ] **Step 3.3: 改寫 `server/utils/requireTenantStoreContext.ts`**

同樣使用 `tryResolveStoreTenant`；無匹配時 403／404 與現有訊息保持一致。

- [ ] **Step 3.4: Typecheck**

Run: `bunx nuxi typecheck`  
Expected: PASS

- [ ] **Step 3.5: Commit**

```bash
git add server/utils/resolveStoreTenantFromHost.ts server/utils/storeTenant.ts server/utils/requireTenantStoreContext.ts
git commit -m "feat: resolve tenant by verified custom domain or subdomain"
```

---

### Task 4: Admin Session 與自訂網域相容

**Files:**
- Modify: `server/utils/requireTenantSession.ts`

- [ ] **Step 4.1: 以 tenantId 為準比對**

將：

```ts
const slug = parseTenantSlugFromHost(host, root)
if (!slug || slug !== session.shopSlug) {
  throw createError({ statusCode: 403, message: '商店網域與登入狀態不符' })
}
```

改為：

```ts
import { tryResolveStoreTenant } from './resolveStoreTenantFromHost'

const resolved = await tryResolveStoreTenant(event)
if (!resolved || resolved.id !== session.tenantId) {
  throw createError({ statusCode: 403, message: '商店網域與登入狀態不符' })
}
```

（可選：額外檢查 `session.shopSlug === resolved.shopSlug` 以偵測資料不一致；正常應相等。）

- [ ] **Step 4.2: 手動 smoke**

自訂網域尚未存在時，用既有子網域登入後台，呼叫任一 `requireTenantSession` 的 API；預期 200。

- [ ] **Step 4.3: Commit**

```bash
git add server/utils/requireTenantSession.ts
git commit -m "fix(admin): tie session to tenantId for custom domain hosts"
```

---

### Task 5: 前端全域 slug state（自訂網域可顯示 canonical slug）

**Files:**
- Create: `server/api/store/host-context.get.ts`
- Modify: `app/middleware/00-tenant-slug.global.ts`

- [ ] **Step 5.1: 新增 API**

`server/api/store/host-context.get.ts`：

```ts
import { tryResolveStoreTenant } from '../../utils/resolveStoreTenantFromHost'

export default defineEventHandler(async (event) => {
  const t = await tryResolveStoreTenant(event)
  return { shopSlug: t?.shopSlug ?? null }
})
```

- [ ] **Step 5.2: 修改 `00-tenant-slug.global.ts`**

邏輯：

1. `root`、`host` 沿用現狀 `getRequestHostForMiddleware()`。
2. `const slug = parseTenantSlugFromHost(host, root)`。
3. 若 `slug` 有值：`state.value = slug`（與現狀相同）。
4. 若 `slug` 為 null：使用 `useRequestFetch()` 呼叫 `'/api/store/host-context'`，將回傳的 `shopSlug` 寫入 `state`；若仍為 null 則 `state.value = null`。

注意 hydration：需避免在 client 與 server 結果不一致；若首次 SSR 已 fetch，應確保 payload 帶過去或可重複請求得到同結果。

- [ ] **Step 5.3: 手動驗證**

在 hosts 指向的測試自訂域（待 Task 7 後）開前台，確認 `oshop-tenant-slug` 有值、`useStoreCart` 的 localStorage key 仍正確。

- [ ] **Step 5.4: Commit**

```bash
git add server/api/store/host-context.get.ts app/middleware/00-tenant-slug.global.ts
git commit -m "feat: resolve canonical shop slug on custom domains via host-context API"
```

---

### Task 6: Admin API — CRUD 自訂網域（待驗證／已驗證）

**Files:**
- Create: `server/api/admin/custom-domains/index.get.ts`
- Create: `server/api/admin/custom-domains/index.post.ts`
- Create: `server/api/admin/custom-domains/[id].delete.ts`

**共用驗證：** 禁止將 `tenantRootDomain` 本身、`www.{root}`、或任何以 `.{root}` 結尾的 hostname 加入為「自訂網域」（與子網域機制重疊且不應佔用 unique 列）。`normalizeRequestHostname` 後比對。

- [ ] **Step 6.1: `index.get.ts`** — `requireTenantSession`，`where(eq(tenantId, session.tenantId))`，回傳 id, hostname, verifiedAt, createdAt（不回傳 verificationToken 或僅在未驗證時回傳給擁有者—建議 POST 回傳一次 token，GET 列表隱藏 token）。

- [ ] **Step 6.2: `index.post.ts`** — body `{ hostname: string }`；正規化；上述防呆；`verificationToken` 使用 `crypto.randomBytes(32).toString('hex')`；插入 `verifiedAt: null`。

- [ ] **Step 6.3: `[id].delete.ts`** — 確認列屬於 `session.tenantId` 後刪除。

- [ ] **Step 6.4: Commit**

```bash
git add server/api/admin/custom-domains/
git commit -m "feat(admin): CRUD pending custom domains for tenant"
```

---

### Task 7: DNS TXT 驗證

**Files:**
- Create: `server/utils/customDomainDnsVerify.ts`
- Create: `server/api/admin/custom-domains/[id]/verify.post.ts`

**建議記錄格式：** TXT 名稱為 `_oshop-verify.{hostname}`，值為該列的 `verification_token`（單一字串）。例：hostname=`shop.example.com` → 查 `_oshop-verify.shop.example.com`。

- [ ] **Step 7.1: 實作 DNS 檢查**

```ts
// server/utils/customDomainDnsVerify.ts
import dns from 'node:dns/promises'

export async function txtRecordsIncludeToken(
  hostname: string,
  token: string,
): Promise<boolean> {
  const name = `_oshop-verify.${hostname}`
  try {
    const records = await dns.resolveTxt(name)
    const flat = records.map((chunk) => chunk.join('')).map((s) => s.trim())
    return flat.some((s) => s === token)
  } catch {
    return false
  }
}
```

- [ ] **Step 7.2: verify.post.ts** — `requireTenantSession`；載入該 id；比對 `tenantId`；若 `verifiedAt` 已有可 idempotent 回成功；否則呼叫 `txtRecordsIncludeToken(row.hostname, row.verificationToken)`，成功則 `verifiedAt = now()`。

- [ ] **Step 7.3: 單元測試 mock**（可選）— mock `dns.resolveTxt` 或僅整合手測。

- [ ] **Step 7.4: Commit**

```bash
git add server/utils/customDomainDnsVerify.ts server/api/admin/custom-domains/
git commit -m "feat(admin): verify custom domain via DNS TXT"
```

---

### Task 8: Cookie／登入說明文件（不強改行為）

**Files:**
- Modify: `docs/manual-test-tenant-customer-flow.md` 或 `README.md` 一小節

- [ ] **Step 8.1: 說明** — `authCookie.ts` 對「非 `*.{tenantRootDomain}`」的 Host 不設定 `Domain=`，自訂網域為 **host-only cookie**；跨子網域共用 session **不適用**於自訂網域。主站登入後若要進租戶後台，仍可依現有 redirect 到 `{slug}.{root}`；若未來要「同一帳號自訂域後台登入」，僅需在該 hostname 上再走登入流程即可。

- [ ] **Step 8.2: Commit**

```bash
git add docs/manual-test-tenant-customer-flow.md
git commit -m "docs: custom domain session and DNS verification notes"
```

---

### Task 9:（可選）後台設定頁 UI

**Files:**
- Create: `app/pages/admin/settings/domains.vue`（並在 `admin` 選單加上連結，若有集中選單設定檔）

- [ ] **Step 9.1** — 列表、輸入框新增網域、顯示 TXT 指示（hostname、`_oshop-verify.{hostname}`、token）、觸發 verify、刪除按鈕。
- [ ] **Step 9.2: Commit**

```bash
git add app/pages/admin/settings/domains.vue
git commit -m "feat(admin-ui): custom domains settings page"
```

---

### Task 10: 端到端手動測試清單

- [ ] 子網域 `a.root`  storefront / admin 與 migration 前行為一致。
- [ ] 新增自訂域（未驗證）：`tryResolveStoreTenant` 不應匹配（仍 404）。
- [ ] 驗證 DNS 後：同 Host storefront、`host-context` 回傳正確 slug、`requireTenantSession` 通過。
- [ ] 兩個租戶不得綁同一 hostname（DB unique 拒絕第二筆）。
- [ ] `bun test` 全專案相關測試通過。

---

## 自我檢查（計劃品質）

1. **Spec coverage：** 多網域／租戶、解析順序、驗證、Admin API、前端 slug、Session 相容、文件 — 皆對應任務。
2. **無占位：** 已給出表結構、核心 TS 範例與指令。
3. **命名一致：** Drizzle 使用 `tenantCustomDomains`、`verifiedAt` 映射欄位 `verified_at`。

**已知風險／後續**
- 邊界需 TLS 憑證（Traefik / Caddy / Cloudflare）— 屬部署面，可於 `README` 另開「自訂網域上架」章節。
- 大量 hostname 查詢可加 cache；YAGNI 階段省略。

---

**計劃完成。** 建議執行方式擇一：

1. **Subagent-Driven（建議）** — 每任務派獨立代理，任務間 code review。  
2. **Inline Execution** — 本對話逐 Task 實作並設檢查點。

若要開始實作，請告訴我採用哪一種。
