# Homepage Dynamic Components Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將首頁模組編輯器重構為「`uid + component + props`」的 Dynamic Components 架構，支援後台即時預覽，且保留既有草稿/發佈流程。

**Architecture:** 以 component registry 作為渲染入口，將模組資料從 `moduleType/config` 過渡為 `component/props`。編輯器維持單一 `draftItems` source of truth，預覽區透過 resolver 把 `props` 轉為可渲染資料（例如產品清單）。先支援 `nav1`、`hero3`、`product_slider1`，其餘模組沿用舊版並逐步遷移。

**Tech Stack:** Nuxt 4、Vue 3 `<script setup>`、TypeScript、Bun test、Tailwind CSS

---

## File Structure

- Modify: `app/types/homepage.ts`（新增 dynamic module 型別、props schema）
- Modify: `app/utils/homepageEditor.ts`（schema normalize、migration helper、resolver helper）
- Modify: `app/utils/homepageEditor.test.ts`（新 schema 單元測試）
- Modify: `app/composables/useHomepageEditor.ts`（draft 流程支援新 schema）
- Modify: `app/components/admin/homepage/AdminHomepageModuleCard.vue`（依 component key 切換表單）
- Modify: `app/components/admin/homepage/AdminHomepageModuleFormProducts.vue`（重構為 product_slider props 表單）
- Modify: `app/pages/admin/homepage.vue`（加入 preview pane）
- Create: `app/components/homepage/registry.ts`（component key -> Vue component map）
- Create: `app/components/homepage/HomepageModuleRenderer.vue`（統一動態渲染）
- Create: `app/components/homepage/modules/HomepageNav1.vue`
- Create: `app/components/homepage/modules/HomepageHero3.vue`
- Create: `app/components/homepage/modules/HomepageProductSlider1.vue`
- Create: `app/components/admin/homepage/AdminHomepagePreview.vue`（後台即時預覽容器）
- Create: `app/utils/homepageModuleResolvers.ts`（`manual/category` 產品來源解析）

---

### Task 1: 型別與資料模型升級（不動 UI）

**Files:**
- Modify: `app/types/homepage.ts`
- Modify: `app/utils/homepageEditor.ts`
- Test: `app/utils/homepageEditor.test.ts`

- [ ] **Step 1: 撰寫失敗測試（新 schema）**
  
  Run: `bun test app/utils/homepageEditor.test.ts`  
  Expected: FAIL（缺少 `component/props` normalize 與 migration）

- [ ] **Step 2: 新增 dynamic module 型別**
  
  在 `app/types/homepage.ts` 新增：
  - `HomepageModuleComponentKey`（先含 `nav1 | hero3 | product_slider1`）
  - `HomepageDynamicModule`（`uid`, `component`, `props`, `isEnabled`, `sortOrder`）
  - `HomepageProductSliderProps`（`source.manual/category` + `ui` 設定）

- [ ] **Step 3: 在 editor utils 實作 normalize/migration helper**
  
  在 `app/utils/homepageEditor.ts` 新增：
  - 舊資料 `moduleType/config` -> 新資料 `component/props` 的轉換 helper
  - props 預設值補齊（避免 runtime undefined）
  - 排序後重寫 `sortOrder`

- [ ] **Step 4: 補齊測試案例**
  
  測試至少覆蓋：
  - 舊 `products` 轉成 `product_slider1`
  - `source.type=manual` 與 `source.type=category` 預設值
  - 缺欄位時 normalize 結果

- [ ] **Step 5: 重新執行測試**
  
  Run: `bun test app/utils/homepageEditor.test.ts`  
  Expected: PASS

---

### Task 2: 建立前台渲染 registry 與統一 renderer

**Files:**
- Create: `app/components/homepage/registry.ts`
- Create: `app/components/homepage/HomepageModuleRenderer.vue`
- Create: `app/components/homepage/modules/HomepageNav1.vue`
- Create: `app/components/homepage/modules/HomepageHero3.vue`
- Create: `app/components/homepage/modules/HomepageProductSlider1.vue`

- [ ] **Step 1: 建立 component registry**
  
  在 `registry.ts` 定義 `Record<HomepageModuleComponentKey, Component>`，只暴露白名單，避免任意 component 注入。

- [ ] **Step 2: 建立 `HomepageModuleRenderer.vue`**
  
  行為：
  - 接收單筆 dynamic module
  - `resolveComponent(module.component)`
  - `v-bind="module.props"`
  - 無效 key 顯示 fallback 區塊（不拋錯）

- [ ] **Step 3: 實作三個最小可渲染模組**
  
  - `HomepageNav1.vue`
  - `HomepageHero3.vue`
  - `HomepageProductSlider1.vue`（先可靜態顯示產品卡，slider 交互後續優化）

- [ ] **Step 4: 型別檢查**
  
  Run: `npx nuxt typecheck`  
  Expected: PASS（或僅剩既有無關錯誤）

---

### Task 3: 建立 resolver（產品來源與設定組裝）

**Files:**
- Create: `app/utils/homepageModuleResolvers.ts`
- Modify: `app/composables/useHomepageEditor.ts`
- Test: `app/utils/homepageEditor.test.ts`

- [ ] **Step 1: 寫失敗測試（resolver）**
  
  覆蓋情境：
  - `manual` 依 `productIds` 回傳排序後產品
  - `category` 依 `categoryId + limit + sort` 回傳產品
  - 無資料時回傳空陣列（不 throw）

- [ ] **Step 2: 實作 resolver**
  
  新增：
  - `resolveProductSliderProducts(props, catalogContext)`
  - `resolveModuleProps(module, context)`（供 preview 與 storefront 共用）

- [ ] **Step 3: 接入 composable**
  
  在 `useHomepageEditor.ts` 增加 preview 用 `computedResolvedModules`，以目前草稿即時輸出可渲染資料。

- [ ] **Step 4: 驗證測試**
  
  Run: `bun test app/utils/homepageEditor.test.ts`  
  Expected: PASS

---

### Task 4: 後台表單改為 component/props 編輯

**Files:**
- Modify: `app/components/admin/homepage/AdminHomepageModuleCard.vue`
- Modify: `app/components/admin/homepage/AdminHomepageModuleFormProducts.vue`
- Modify: `app/utils/homepageEditor.ts`

- [ ] **Step 1: `ModuleCard` 切換依據改為 `component`**
  
  由 `moduleType` 判斷改成 `component` 判斷，保留共用按鈕（啟用、上下移、JSON editor）。

- [ ] **Step 2: 重做 products 表單為 `product_slider1`**
  
  表單欄位：
  - `source.type`（manual/category）
  - `productIds` 或 `categoryId`
  - `limit`, `sort`
  - `ui.perView`, `ui.autoplay`, `ui.intervalMs`, `ui.loop`

- [ ] **Step 3: 保留 JSON 編輯通道**
  
  `AdminHomepageModuleJsonEditor.vue` 仍可直接更新 props，解析失敗顯示錯誤訊息，不覆蓋舊草稿。

- [ ] **Step 4: 型別檢查**
  
  Run: `npx nuxt typecheck`  
  Expected: PASS（或僅剩既有無關錯誤）

---

### Task 5: 後台即時預覽與頁面整合

**Files:**
- Create: `app/components/admin/homepage/AdminHomepagePreview.vue`
- Modify: `app/pages/admin/homepage.vue`
- Modify: `app/composables/useHomepageEditor.ts`

- [ ] **Step 1: 建立預覽容器**
  
  `AdminHomepagePreview.vue` 使用 `HomepageModuleRenderer` 渲染 `resolvedModules`，並對 disabled module 過濾。

- [ ] **Step 2: 在 admin page 掛上雙欄布局**
  
  左側編輯器，右側預覽；`draftItems` 任一欄位變更時，預覽自動更新。

- [ ] **Step 3: 回歸草稿流程**
  
  驗證 `saveDraft/publish/resetDraft` 流程不變，提交 payload 仍可被既有 API 接受（必要時在 composable 做向後相容轉換）。

- [ ] **Step 4: 手動驗證**
  
  Run: `bun run dev`  
  Expected:
  - 後台更改 `product_slider1` 設定後預覽即時更新
  - 重新整理後草稿狀態一致
  - 發佈後前台可看到相同排序與內容

---

### Task 6: 收尾、文件、品質門檻

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-admin-homepage-editor-refactor.md`（加上後續計劃連結）
- Modify: `README.md`（如需補一行首頁模組 dynamic 架構說明）

- [ ] **Step 1: 執行測試與檢查**
  
  Run:
  - `bun test app/utils/homepageEditor.test.ts`
  - `npx nuxt typecheck`
  
  Expected: 全數通過，或僅剩既有無關錯誤並記錄原因。

- [ ] **Step 2: 讀取 lints**
  
  檢查本次修改檔案是否新增 lint diagnostics，若有則修正。

- [ ] **Step 3: 更新說明文件**
  
  記錄：
  - 新資料結構範例
  - 新增 component key 列表
  - `product_slider1` props 說明

- [ ] **Step 4: 分段提交（frequent commits）**
  
  建議 commit 節奏：
  - `feat(homepage): add dynamic module schema and normalization`
  - `feat(homepage): add module registry and renderer`
  - `feat(admin): add live preview for homepage modules`
  - `test(homepage): cover resolver and schema migration`

---

## 風險與對策

- API 尚未完全改 schema：以 composable 增加雙向轉換層（新 UI schema <-> 既有 API schema）。
- `component` key 漏 mapping：registry fallback + type union 防呆。
- product resolver 效能：先限制 `limit` 上限，後續才加快取。
- JSON editor 破壞型輸入：保留 parse error，禁止覆寫現有有效 props。

## 驗收標準（Definition of Done）

- 後台可用 `component + props` 編輯首頁模組，並即時預覽。
- `product_slider1` 可切換 manual/category 來源，設定數量與顯示參數。
- 草稿儲存、重設、發佈流程與目前行為一致。
- 新增/更新測試覆蓋 migration、normalize、resolver 關鍵路徑。
