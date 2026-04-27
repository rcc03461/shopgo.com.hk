# 主站先行：Landing / Login / Register 實作計劃

目標：在 `shopgo.com.hk`（本機 hosts 指向 `127.0.0.1`）上先完成主站三頁與最小後端，租戶子網域與店舖功能往後迭代。

## 0. 安全與環境（先做）

- [ ] **輪換資料庫密碼**：`.env` 曾出現在對話／截圖時，視為已外洩，請在 DB 端改密碼並更新本機 `.env`。
- [ ] **確認 `.env` 永不進 Git**：專案已有 `.gitignore` 規則，提交前用 `git status` 再確認一次。
- [ ] **新增 `.env.example`**：只放變數名與假值／說明，不放真密碼（例如 `DATABASE_URL=postgresql://user:password@host:5432/dbname`）。
- [ ] **統一連線字串**：建議用單一 `DATABASE_URL`（Drizzle / `postgres` 套件都好用）；若暫時沿用 `db_host` 等欄位，在 `nuxt.config` 的 `runtimeConfig` 組出連線字串，避免各處拼字串。

## 1. 範圍與驗收（本階段）

| 路由 | 內容 |
|------|------|
| `/` | Landing：價值主張、簡短功能說明、**CTA 前往註冊**、次要連結登入 |
| `/login` | 表單：email、password；送出後建立 session（或 JWT cookie，擇一） |
| `/register` | 表單：shop_slug、email、password；建立租戶 + 平台擁有者帳號（依 PRD） |

**驗收**

- [ ] 本機以 `http://shopgo.com.hk:3000`（或你設定的 port）可開啟三頁，版面為極簡風、行動版可用。
- [ ] Register 成功後 DB 有對應記錄（租戶 slug 唯一）；Login 可驗證已註冊帳號。
- [ ] 表單錯誤（驗證失敗、重複 slug、錯誤密碼）有清楚、簡短中文提示。

## 2. 技術決策（建議）

### 2.1 Nuxt 結構

- 使用 **`app/pages/`** 檔案式路由：`index.vue`、`login.vue`、`register.vue`。
- 共用 **`app/layouts/default.vue`**：極簡頂欄（Logo + Login / Register）+ 主內容 + 簡短頁尾。
- 樣式：**安裝並啟用 Tailwind**（與 PRD 一致）；設計 tokens 用少數灰階 + 一個 CTA 色即可。

### 2.2 本機網域

- hosts 已加 `127.0.0.1 shopgo.com.hk` 與 `*.shopgo.com.hk`。
- 開發時需讓瀏覽器訪問的主機名是 `shopgo.com.hk`，例如：

```bash
bun run dev -- --host shopgo.com.hk
```

（若 port 非 80，網址為 `http://shopgo.com.hk:3000`。）

### 2.3 資料庫與 Drizzle

- **開發連線**：使用已安裝的 `postgres` + `drizzle-orm`；`drizzle-kit` 用於 migration。
- **@electric-sql/pglite**：可選用於單元測試或離線腳本；主站第一階段可直接連遠端 dev DB，不必強制 PGlite。
- **最小表**（可與後續 PRD 對齊，先能註冊登入即可）：
  - `tenants`：`id`, `shop_slug`（unique）, `created_at` …
  - `users`（平台／租戶擁有者）：`id`, `email`（unique）, `password_hash`, `tenant_id`, `created_at` …
- **密碼**：使用 `bcrypt` 或 `argon2`（擇一，安裝對應套件），禁止明文儲存。

### 2.4 認證方式（MVP）

- **建議**：HTTP-only **session cookie** + server 端 session 表，或 **JWT 放 HTTP-only cookie**（由 Nitro API 簽發）。避免把長效 token 放 localStorage。
- **路由保護**：本階段若無「登入後主站後台」，可先只做「登入成功導向暫時頁或 `/` 並顯示已登入」；後續再加 middleware。

## 3. 實作順序（建議依序完成）

1. **Tailwind**：安裝、配置 Nuxt module 或官方 Tailwind v4 流程（擇當前 Nuxt 4 推薦做法）。
2. **runtimeConfig**：讀取 `DATABASE_URL`（或從 `db_*` 組合），僅在 server 使用。
3. **Drizzle**：`drizzle.config.ts`、`server/database/schema.ts`、單一 `db` 工廠（每請求或 singleton 依部署方式決定）。
4. **Migration**：建立 `tenants`、`users` 初始 migration，`bunx drizzle-kit migrate`（或專案內 script）。
5. **API**：`server/api/auth/register.post.ts`、`server/api/auth/login.post.ts`（回傳錯誤碼與訊息一致化）。
6. **頁面**：Landing 文案 + CTA；Login / Register 表單 + `useFetch` / `$fetch` 呼叫 API。
7. **Cookie / Session**：登入成功寫 cookie；提供 `server/api/auth/me.get.ts` 可選，供頁首顯示狀態。
8. **子網域預留（可選，極小成本）**：`middleware` 依 `host` 判斷：若為 `shopgo.com.hk` 繼續；若為 `*.shopgo.com.hk` 先顯示「租戶站即將開放」占位，避免之後大改。

## 4. 待辦清單（勾選用）

複製到 issue 或逐項勾選即可。

### 環境與工具

- [ ] 輪換並更新 DB 密碼；`.env.example` 補齊
- [ ] 統一 `DATABASE_URL` 或 `runtimeConfig` 映射
- [ ] `package.json` 增加 `db:generate` / `db:migrate` 等 script（依 drizzle-kit 慣例）

### UI / 路由

- [ ] 安裝 Tailwind 與基礎字體／色票（極簡）
- [ ] `app/layouts/default.vue` 主站佈局
- [ ] `app/pages/index.vue` Landing + CTA → `/register`
- [ ] `app/pages/login.vue`
- [ ] `app/pages/register.vue`

### 資料與 API

- [ ] Drizzle schema：`tenants`、`users`（含 `password_hash`、關聯）
- [ ] 初始 migration 與執行記錄
- [ ] `register.post`：slug 格式與唯一性、email 唯一、寫入 transaction（tenant + user）
- [ ] `login.post`：email 查詢、密碼比對、寫入 session / cookie
- [ ] 錯誤處理與 log（不 log 密碼）

### 品質

- [ ] 基本 Zod（或等效）驗證 server + client 雙層
- [ ] 手動測試：註冊 → DB → 登入 → cookie 存在與清除登出（若有做 logout）

## 5. 風險與注意

- **遠端 dev DB**：注意連線 IP 白名單、SSL 模式（`?sslmode=require` 等）。
- **子網域 cookie**：未來若主站與租戶站共用 cookie 策略，需單獨設計；本階段僅主站可先忽略。
- **CORS**：同域 Nuxt 前後端一體，一般無需額外 CORS。

---

完成本文件所列項目後，再進入 PRD 下一塊：`shop_slug.shopgo.com.hk` 租戶首頁模組與商品流。
