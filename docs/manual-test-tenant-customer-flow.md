# 租戶會員流程手動測試清單（M1-M5）

## 測試前提

- 已執行 `bun run db:migrate`
- hosts 已設定：`shopgo.com.hk`、`demo.shopgo.com.hk`
- 以 `demo.shopgo.com.hk` 測試租戶子站

## A. 會員註冊 / 登入 / 登出

1. 進入 `http://demo.shopgo.com.hk:3000/register`
2. 註冊新會員（email + password + 姓名）
3. 預期：導向 `/profile`，頁首顯示會員身份
4. 點擊登出
5. 預期：回首頁，頁首改為登入/註冊按鈕
6. 進入 `/login` 使用同帳號登入
7. 預期：登入成功並導向 `/profile`

## B. Profile 路由守門（Route Guard）

1. 先登出會員
2. 直接開 `http://demo.shopgo.com.hk:3000/profile`
3. 預期：被導向 `/login?redirect=%2Fprofile`
4. 於主站 `http://shopgo.com.hk:3000/profile` 開啟
5. 預期：導回主頁（非租戶子站不允許會員中心）

## C. Profile 資料更新

1. 登入會員後進入 `/profile`
2. 修改姓名、電話並儲存
3. 預期：顯示「會員資料已更新」
4. 重新整理頁面
5. 預期：資料維持更新後的值

## D. Cart 合併（M2）

1. 未登入狀態加入 1~2 個商品到購物車
2. 於 `/login` 登入
3. 預期：購物車數量不歸零，商品仍在
4. 到 `/cart` 調整數量 / 移除
5. 預期：重新整理後資料一致

## E. 訂單列表與詳情（M4）

1. 登入會員，完成一次付款流程（可用測試金流）
2. 進入 `/profile/orders`
3. 預期：可看到新訂單（編號、狀態、金額、時間）
4. 點進 `/profile/orders/[order_uuid]`
5. 預期：可看到明細、金額摘要、付款方式
6. 以另一個會員帳號登入，嘗試訪問同訂單 URL
7. 預期：回傳找不到訂單（不可跨會員存取）

## F. API 隔離（抽查）

- `GET /api/store/orders`：僅返回當前 customer 的資料
- `GET /api/store/orders/:orderUuid`：tenant + customer 雙重限制
- `POST /api/store/checkout`：只接受與當前 host tenant 一致的 customer session

## G. 自訂網域（Custom domain）

### 正式環境流程（摘要）

1. 套用 migration `0020` 後，後台 **設定 → 自訂網域**（或 API：`GET/POST /api/admin/custom-domains`、`DELETE`、`POST .../verify`）。
2. 於 **公開 DNS** 新增 **TXT**：名稱 `_oshop-verify.{hostname}`，值為後台回傳的 `verificationToken`，再按「檢查驗證」。
3. 驗證通過後，同一 **Host** 的 storefront 應能載入；`GET /api/store/host-context` 應回傳正確的 `shopSlug`。
4. **Session／Cookie**：`authCookie` 僅在 `*.{tenantRootDomain}` 設 `Domain=.root`；自訂網域為 **host-only** cookie，無法與平台子網域共用 Session；若要在自訂網域操作後台，須在 **該 hostname** 下重新登入。
5. 正式上線需在反向代理／CDN 設定該網域的 **TLS** 與轉發，本 repo 不涵蓋。

### 本地如何測試（分層）

#### 前置

- `bun run db:migrate` 已套用（含 `tenant_custom_domains`）。
- `bun dev` 使用專案預設 **`--host 0.0.0.0`**，與 README 一樣用 **IPv4** 連線。
- **Windows hosts**（路徑通常為 `C:\Windows\System32\drivers\etc\hosts`）至少要有租戶子站，例如：

  ```text
  127.0.0.1 shopgo.com.hk
  127.0.0.1 demo.shopgo.com.hk
  ```

  其中 `demo` 換成你資料庫裡實際存在的 `tenants.shop_slug`。

#### 層級 1：只測後台 UI / API（不必真的驗證 DNS）

1. 瀏覽器開：`http://demo.shopgo.com.hk:3000`（port 以終端機為準）。
2. 後台帳號登入後進入 **設定 → 自訂網域**。
3. 輸入一個 **合法測試用 hostname**（不可為 `shopgo.com.hk`、不可為 `*.shopgo.com.hk`，例如 `mystore.local`）。
4. 預期：列表出現「等待 DNS 驗證」；此時按「檢查驗證」通常會失敗（本地無公開 TXT），屬正常。

#### 層級 2：本地驗證「已生效」的網域（略過真實 DNS）

本機 **hosts 無法** 設定 TXT，測試「已驗證自訂網域」時，可在開發庫 **手動標記已驗證**（僅限本機）：

1. 仍先在後台 **新增** 該網域（取得列與 hostname；亦可從 DB 查看）。
2. 用 `psql`、Drizzle Studio（`bun run db:studio`）或任意 SQL 客戶端執行（替換 hostname）：

   ```sql
   UPDATE tenant_custom_domains
   SET verified_at = NOW()
   WHERE hostname = 'mystore.local';
   ```

3. **Vite Host 檢查**：自訂網域的 Host 必須通過開發伺服器允許清單。請在 `nuxt.config.ts` 的 `vite.server.allowedHosts` 加入你的測試名，例如 `'mystore.local'`，**存檔後重啟** `bun dev`。
4. 在 hosts 新增：`127.0.0.1 mystore.local`。
5. 瀏覽器開：`http://mystore.local:3000`（勿用 `https`，除非你自己掛憑證）。
6. 預期：前台可載入該租戶首頁；另開分頁測 `http://mystore.local:3000/api/store/host-context` 應為 JSON：`{ "shopSlug": "demo" }`（`demo` 為該筆網域所屬租戶之 slug）。

#### 層級 3：真實 DNS 驗證

與正式環境相同：在網域註冊商或 DNS 托管新增 `_oshop-verify.your-domain.com` 的 TXT，待傳播後在後台按「檢查驗證」。本地 dev 伺服器須能從網際網路以該 hostname 連到（或改在 staging 測此段）。

#### 常見問題

| 現象 | 可能原因 |
|------|----------|
| 開 `http://某自訂網域:3000` 被擋或 403 | 未把該 hostname 加入 `vite.server.allowedHosts` 或未重啟 dev |
| 自訂網域後台要重新登入 | host-only cookie 與子網域不共用，屬預期 |
| `host-context` 回 `null` | 網域未驗證、hostname 打錯、或 DB 無對應列 |

**正式／Cloudflare for SaaS 全流程**（Fallback Origin、Custom Hostname、與後台 TXT 並行）：見 **`docs/custom-domain-cloudflare-saas-onboarding.md`**。
