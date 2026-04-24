# Admin Homepage Editor Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构首页模组后台编辑页，降低 `app/pages/admin/homepage.vue` 复杂度，同时保持现有 API 与编辑行为不变。

**Architecture:** 采用「可测试纯函数 + composable + 小型表单组件」结构。将模组配置标准化、排序与增删逻辑抽到纯函数与 composable，页面只负责资料装配与页面级按钮；不同 `moduleType` 的表单拆为独立组件，降低条件分支密度并为后续新增模组预留扩展点。

**Tech Stack:** Nuxt 4、Vue 3 `<script setup>`、TypeScript、Tailwind CSS、Bun test

---

## File Structure

- Modify: `app/pages/admin/homepage.vue`（瘦身为页面编排层）
- Create: `app/utils/homepageEditor.ts`（纯函数：排序、默认值补齐、增删项目、JSON 更新）
- Create: `app/utils/homepageEditor.test.ts`（纯函数回归测试）
- Create: `app/composables/useHomepageEditor.ts`（页面状态与请求动作）
- Create: `app/components/admin/homepage/AdminHomepageModuleCard.vue`（单个模组卡片）
- Create: `app/components/admin/homepage/AdminHomepageModuleFormNav.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormBanner.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormCategory.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormProducts.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormFooter.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleJsonEditor.vue`

---

### Task 1: 抽离并测试首页编辑纯函数

**Files:**
- Create: `app/utils/homepageEditor.ts`
- Create: `app/utils/homepageEditor.test.ts`

- [ ] **Step 1: 先写失败测试**

用 `bun:test` 为以下行为写失败测试：
- `moveHomepageModule()` 会重排并重写 `sortOrder`
- `ensureModuleConfig()` 会为 `nav/banner/category/products/footer` 补齐默认配置
- `addCategoryToModule()` 会在 `category/products` 模组中新增分类
- `addProductToModule()` 会自动补分类并新增商品
- `updateModuleConfigFromJson()` 在 JSON 非法时返回错误讯息

- [ ] **Step 2: 运行测试并确认失败**

Run: `bun test app/utils/homepageEditor.test.ts`  
Expected: FAIL，提示目标函数尚未定义或行为不符。

- [ ] **Step 3: 写最小实现**

在 `app/utils/homepageEditor.ts` 实作最小可用纯函数，输入输出保持显式，避免直接依赖 Vue 响应式。

- [ ] **Step 4: 再跑测试确认通过**

Run: `bun test app/utils/homepageEditor.test.ts`  
Expected: PASS。

---

### Task 2: 抽离页面状态与请求动作

**Files:**
- Create: `app/composables/useHomepageEditor.ts`
- Modify: `app/pages/admin/homepage.vue`

- [ ] **Step 1: 先制造类型失败**

在页面改为引用 `useHomepageEditor()`，但暂不创建 composable，让类型检查失败。

- [ ] **Step 2: 运行类型检查并确认失败**

Run: `npx nuxt typecheck`  
Expected: FAIL，提示 `useHomepageEditor` 不存在。

- [ ] **Step 3: 写最小实现**

将以下逻辑迁入 composable：
- `draftItems` 初始化与 clone
- `saveDraft / publishDraft / resetDraft`
- 页面级 `saveError / saving / publishing`
- 对纯函数的包装调用

- [ ] **Step 4: 再跑类型检查**

Run: `npx nuxt typecheck`  
Expected: PASS 或仅剩仓库既有无关错误。

---

### Task 3: 拆出模组卡片与各类型表单

**Files:**
- Create: `app/components/admin/homepage/AdminHomepageModuleCard.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormNav.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormBanner.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormCategory.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormProducts.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleFormFooter.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleJsonEditor.vue`
- Modify: `app/pages/admin/homepage.vue`

- [ ] **Step 1: 先制造组件解析失败**

让页面引用 `AdminHomepageModuleCard`，暂不创建组件文件，确认拆分路径正确。

- [ ] **Step 2: 运行类型检查并确认失败**

Run: `npx nuxt typecheck`  
Expected: FAIL，提示组件不存在或 props 不匹配。

- [ ] **Step 3: 实作最小组件拆分**

实现原则：
- `AdminHomepageModuleCard` 负责标题、启用、排序、插槽
- 各表单组件只处理单一 `moduleType`
- `AdminHomepageModuleJsonEditor` 负责 JSON 输入与错误回报事件

- [ ] **Step 4: 再跑类型检查**

Run: `npx nuxt typecheck`  
Expected: PASS 或仅剩仓库既有无关错误。

---

### Task 4: 收敛页面模板并验证回归

**Files:**
- Modify: `app/pages/admin/homepage.vue`
- Modify: `app/composables/useHomepageEditor.ts`

- [ ] **Step 1: 精简页面**

让页面只保留：
- 标题与页面级按钮
- 错误提示
- `v-for` 渲染卡片组件
- 事件绑定到 composable

- [ ] **Step 2: 跑纯函数测试**

Run: `bun test app/utils/homepageEditor.test.ts`  
Expected: PASS。

- [ ] **Step 3: 跑类型检查**

Run: `npx nuxt typecheck`  
Expected: PASS 或仅剩仓库既有无关错误。

- [ ] **Step 4: 如可行再看 lints**

Run: 读取 `app/pages/admin/homepage.vue` 与新建文件的 lints。  
Expected: 不新增本次重构相关诊断。

---

後續計劃（Dynamic Components + 即時預覽）：
`docs/superpowers/plans/2026-04-25-homepage-dynamic-components-refactor.md`
