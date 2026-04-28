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

1. 套用 migration `0020` 後，後台可用 `GET/POST /api/admin/custom-domains`、`DELETE`、`POST .../verify`；於 DNS 新增 TXT，記錄名為 `_oshop-verify.{hostname}`，值為後台回傳的 `verificationToken`。
2. 驗證通過後，同一 Host 的 storefront 應能載入；`GET /api/store/host-context` 須回傳正確的 `shopSlug`。
3. **Session／Cookie**：`authCookie` 僅在 `*.{tenantRootDomain}` 設 `Domain=.root`；自訂網域為 **host-only** cookie，無法與平台子網域共用 Session；若要在自訂網域操作後台須在該 hostname 重新登入。
4. 部署層面需自訂 TLS（反向代理／CDN），本 repo 不涵蓋。
