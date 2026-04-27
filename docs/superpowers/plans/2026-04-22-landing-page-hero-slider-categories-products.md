# Landing Page Hero/Slider/Categories Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `http://demo.shopgo.com.hk:3000/` 的首页落地三个可维护区块：Hero、Slider、Categories Products，并保持现有多租户分支逻辑不回归。

**Architecture:** 采用「页面编排 + 区块组件」结构：`app/pages/index.vue` 只负责数据与区块装配，视觉与交互拆分到独立组件。以静态假资料先落地 UI 与交互，再预留后续接入 API 的接口位，避免一次性引入过多后端耦合。

**Tech Stack:** Nuxt 4、Vue 3 `<script setup>`、Tailwind CSS、TypeScript

---

## File Structure

- Modify: `app/pages/index.vue`（首页布局编排，租户分支保持）
- Create: `app/components/landing/LandingHeroSection.vue`（Hero 区块）
- Create: `app/components/landing/LandingSliderSection.vue`（Slider 区块）
- Create: `app/components/landing/LandingCategoriesProductsSection.vue`（分类+商品区块）
- Create: `app/types/landing.ts`（区块数据类型）
- Create: `app/data/landing.ts`（首页假资料）

---

### Task 1: 抽离首页区块数据与类型

**Files:**
- Create: `app/types/landing.ts`
- Create: `app/data/landing.ts`
- Modify: `app/pages/index.vue`

- [ ] **Step 1: 先写失败预期（类型守卫方式）**

在 `app/types/landing.ts` 定义首页所需结构（Hero、Slide、Category、ProductCard）。先在 `app/data/landing.ts` 故意缺一个必填字段，触发 TypeScript 报错，确认约束生效。

- [ ] **Step 2: 运行类型检查，验证失败**

Run: `bun run nuxt typecheck`  
Expected: FAIL，提示 `app/data/landing.ts` 缺失类型必填字段。

- [ ] **Step 3: 补齐最小可用实现**

补齐 `app/data/landing.ts` 的静态资料，至少包含：
- Hero（标题、副标题、双 CTA）
- 3~5 张 Slider 项目
- 4 个分类
- 每分类 4 个商品卡片（名称、价格、图片、slug）

- [ ] **Step 4: 再跑类型检查，确认通过**

Run: `bun run nuxt typecheck`  
Expected: PASS（或仅保留仓库既有无关 warning，不新增当前任务相关 error）。

- [ ] **Step 5: Commit**

```bash
git add app/types/landing.ts app/data/landing.ts app/pages/index.vue
git commit -m "refactor: extract landing page typed mock data model"
```

---

### Task 2: 落地 Hero 区块组件

**Files:**
- Create: `app/components/landing/LandingHeroSection.vue`
- Modify: `app/pages/index.vue`

- [ ] **Step 1: 写失败用例（页面挂载检查）**

在 `app/pages/index.vue` 先引用 `LandingHeroSection` 但暂不创建组件文件，制造编译失败，确保任务路径正确。

- [ ] **Step 2: 运行开发服务，验证失败**

Run: `bun dev`  
Expected: FAIL，提示无法解析 `LandingHeroSection` 组件。

- [ ] **Step 3: 实现 Hero 组件（最小可用）**

组件职责：
- 接收 `title`、`subtitle`、`primaryCta`、`secondaryCta`
- 输出首屏标题与双按钮
- 保持移动端优先排版

页面职责：
- 在平台主站分支（`tenantSlug` 为空）中挂载 Hero
- 保留现有「租户店舖分支」逻辑不变

- [ ] **Step 4: 运行开发服务，验证可见**

Run: `bun dev`  
Expected: PASS，打开 `http://demo.shopgo.com.hk:3000/` 可看到 Hero 区块与双 CTA。

- [ ] **Step 5: Commit**

```bash
git add app/components/landing/LandingHeroSection.vue app/pages/index.vue
git commit -m "feat: add reusable landing hero section"
```

---

### Task 3: 落地 Slider 区块组件（含基础切换交互）

**Files:**
- Create: `app/components/landing/LandingSliderSection.vue`
- Modify: `app/pages/index.vue`

- [ ] **Step 1: 先构造失败状态**

在首页先渲染 `<LandingSliderSection :slides="landingSlides" />`，暂不传完整字段（如图片），触发类型或渲染报错。

- [ ] **Step 2: 运行类型检查/开发服务，验证失败**

Run: `bun run nuxt typecheck`  
Expected: FAIL，提示 `slides` 数据结构不完整。

- [ ] **Step 3: 实现 Slider 最小交互**

实现内容：
- 左右切换按钮
- 指示点导航
- 自动轮播（可配置间隔，默认 5 秒）
- 用户手动切换后重置计时器
- 无障碍：按钮 `aria-label`、当前 slide 状态标识

- [ ] **Step 4: 验证交互**

Run: `bun dev`  
Expected: PASS，页面可自动轮播、手动切换正常，控制台无新增报错。

- [ ] **Step 5: Commit**

```bash
git add app/components/landing/LandingSliderSection.vue app/pages/index.vue app/data/landing.ts app/types/landing.ts
git commit -m "feat: add landing slider section with autoplay controls"
```

---

### Task 4: 落地 Categories Products 区块

**Files:**
- Create: `app/components/landing/LandingCategoriesProductsSection.vue`
- Modify: `app/pages/index.vue`

- [ ] **Step 1: 先写失败预期**

先在组件接口中要求 `categories` 与 `productsByCategory` 两个 props；页面只传一个，触发类型检查失败。

- [ ] **Step 2: 运行类型检查，验证失败**

Run: `bun run nuxt typecheck`  
Expected: FAIL，提示缺少必填 prop。

- [ ] **Step 3: 实现区块 UI**

实现内容：
- 顶部分类 Tab/Chip（可点击切换）
- 下方商品卡片网格（至少 4 列响应式降级）
- 卡片包含：图、标题、价格、进入商品详情按钮
- 空状态：某分类没有商品时给提示文案

- [ ] **Step 4: 验证展示与切换**

Run: `bun dev`  
Expected: PASS，分类切换后商品列表同步变化，移动端排版无明显破版。

- [ ] **Step 5: Commit**

```bash
git add app/components/landing/LandingCategoriesProductsSection.vue app/pages/index.vue app/data/landing.ts app/types/landing.ts
git commit -m "feat: add categories products section for landing page"
```

---

### Task 5: 回归检查与文档同步

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: 回归关键路径**

手测清单：
- `tenantSlug` 有值时，仍显示租户分支内容
- `tenantSlug` 无值时，依序显示 Hero / Slider / Categories Products
- 首页首屏按钮跳转仍可达 `/admin/register`、`/admin/login`

- [ ] **Step 2: 运行基础构建检查**

Run: `bun run build`  
Expected: PASS，构建成功，无新引入的类型错误。

- [ ] **Step 3: 更新 TODO**

在 `docs/TODO.md` 增加「Landing Page 三区块」条目与验收子项，标记当前进度。

- [ ] **Step 4: Commit**

```bash
git add docs/TODO.md
git commit -m "docs: track landing page sections delivery checklist"
```

---

## 验收标准（DoD）

- 首页平台分支可见 3 个目标区块，顺序正确，视觉风格统一。
- Slider 支持自动轮播 + 手动切换，且无明显可用性问题。
- Categories Products 支持分类切换与空状态。
- 不影响 `tenantSlug` 分支与现有路由入口行为。
- `bun run nuxt typecheck` 与 `bun run build` 在本任务范围内不引入新错误。
