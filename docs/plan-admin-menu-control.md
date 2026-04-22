# Admin 菜单控制（树状拖拽 + 抽屉编辑）实施计划

**目标**  
在租户后台实现菜单管理能力：树状菜单、跨层拖拽排序、显示开关、抽屉编辑（页面链接/自定义链接/target）、删除、双击名称行内编辑，并让前台导航读取该菜单配置。

**范围**  
- 后台：`/admin/settings/navigation` 菜单管理页
- 后端：菜单 CRUD + reorder API + tenant 隔离校验
- 前台：读取可见菜单并渲染
- 非本期：角色权限控制、版本历史、批量操作

---

## 一、文件结构与职责

### 1) 数据与迁移
- Modify: `server/database/schema.ts`
  - 新增菜单表定义（`shopMenus`）
- Create: `server/database/migrations/0014_shop_menus.sql`
  - 建表、约束、索引
- Modify: `server/database/migrations/meta/_journal.json`
  - 追加 migration 记录
- Create/Modify: `server/database/migrations/meta/0014_snapshot.json`
  - Drizzle 快照（按现有流程生成）

### 2) 校验与业务工具
- Create: `server/utils/menuSchemas.ts`
  - zod：create/update/reorder 请求体校验
- Create: `server/utils/menuTree.ts`
  - 将扁平数据组装为树
  - 验证最大层级（建议 3 层）
  - 验证循环父子引用（防止 A->B->A）

### 3) Admin API
- Create: `server/api/admin/menus/index.get.ts`
- Create: `server/api/admin/menus/index.post.ts`
- Create: `server/api/admin/menus/[id].patch.ts`
- Create: `server/api/admin/menus/[id].delete.ts`
- Create: `server/api/admin/menus/reorder.post.ts`

### 4) Store API（前台读）
- Create: `server/api/store/navigation.get.ts`

### 5) Admin 前端页面与组件
- Create: `app/pages/admin/settings/navigation.vue`
- Create: `app/components/admin/navigation/AdminMenuTree.vue`
- Create: `app/components/admin/navigation/AdminMenuTreeItem.vue`
- Create: `app/components/admin/navigation/AdminMenuEditDrawer.vue`
- Create: `app/components/admin/navigation/AdminInlineEditName.vue`
- Modify: `app/layouts/admin.vue`
  - 导航增加“菜单”入口

### 6) 前台读取与渲染
- Modify: `app/layouts/default.vue`
  - 读取 `/api/store/navigation` 并渲染菜单（替换/并入现有静态入口）

---

## 二、数据模型定义（建议）

在 `schema.ts` 新增 `shop_menus`：
- `id`: uuid pk
- `tenant_id`: uuid not null（fk -> tenants.id, on delete cascade）
- `title`: varchar(255) not null
- `parent_id`: uuid null（自关联 fk -> shop_menus.id）
- `sort_order`: integer not null default 0
- `is_visible`: boolean not null default true
- `link_type`: varchar(16) not null（`page | custom`）
- `page_id`: uuid null（fk -> pages.id）
- `custom_url`: text null
- `target`: varchar(16) not null default `_self`（`_self | _blank`）
- `created_at` / `updated_at`: timestamptz not null default now

索引与约束：
- index: `(tenant_id, parent_id, sort_order)`
- index: `(tenant_id, is_visible)`
- check: `link_type in ('page','custom')`
- check: `target in ('_self','_blank')`
- check:  
  - `link_type='page' => page_id is not null`  
  - `link_type='custom' => custom_url is not null`

---

## 三、API 详细任务

### Task A：列表接口（树结构）
**Files**
- Create: `server/api/admin/menus/index.get.ts`
- Create: `server/utils/menuTree.ts`

**实现**
- 使用 `requireTenantSession`
- 从 `shop_menus` 拉 tenant 内全部记录
- 按 `sort_order asc, created_at asc` 排序
- 组装树结构返回：`items: MenuTreeNode[]`

**验收**
- 返回结构符合前端树组件输入
- 不跨租户

---

### Task B：创建与更新
**Files**
- Create: `server/api/admin/menus/index.post.ts`
- Create: `server/api/admin/menus/[id].patch.ts`
- Create: `server/utils/menuSchemas.ts`

**实现**
- `POST` 支持根节点/子节点创建
- `PATCH` 支持：
  - `title`
  - `isVisible`
  - `linkType`
  - `pageId`
  - `customUrl`
  - `target`
- 若 `linkType='page'`，校验 `page_id` 属于当前 tenant
- 若 `linkType='custom'`，校验 URL 格式（`http(s)://` 或 `/path`）

**验收**
- 错误输入返回 400
- 非本租户资源返回 404/403

---

### Task C：删除
**Files**
- Create: `server/api/admin/menus/[id].delete.ts`

**实现（先做简版）**
- 策略 A（推荐首版）：若存在子节点，返回 409 + 提示先处理子菜单
- 删除成功返回 `{ ok: true }`

**验收**
- 有子节点时不可删
- 无子节点可删

---

### Task D：重排接口（拖拽持久化）
**Files**
- Create: `server/api/admin/menus/reorder.post.ts`
- Modify: `server/utils/menuSchemas.ts`
- Modify: `server/utils/menuTree.ts`

**实现**
- body：`items: Array<{ id, parentId, sortOrder, depth }>`
- 服务端校验：
  - 全部 id 属于当前 tenant
  - depth 不超过最大层级（3）
  - 无循环引用
- 使用 transaction 一次性更新 parent/sort_order/updated_at

**验收**
- 拖拽后刷新顺序不丢
- 非法树提交被拒绝

---

### Task E：前台菜单接口
**Files**
- Create: `server/api/store/navigation.get.ts`

**实现**
- 通过 `requireTenantStoreContext`
- 仅返回 `is_visible=true`
- `link_type='page'` 时可返回 `slug` 或直接组装为 `/p/{slug}`

**验收**
- 前台只看到可见菜单
- tenant 隔离正确

---

## 四、前端任务（Admin）

### Task F：页面骨架 + 数据流
**Files**
- Create: `app/pages/admin/settings/navigation.vue`
- Modify: `app/layouts/admin.vue`

**实现**
- 页面加载菜单树
- 增加“新增根菜单”按钮
- 增加错误态 + 重试按钮
- 在 admin 侧边栏新增“菜单”入口（`/admin/settings/navigation`）

---

### Task G：树状列表 + 拖拽
**Files**
- Create: `app/components/admin/navigation/AdminMenuTree.vue`
- Create: `app/components/admin/navigation/AdminMenuTreeItem.vue`

**实现**
- 引入拖拽库（`vuedraggable` 或 `vue-draggable-plus` 二选一）
- 支持：
  - 同层排序
  - 跨层移动
  - 最大层级限制
- 拖拽结束后调用 `POST /api/admin/menus/reorder`
- 失败时回滚并提示

---

### Task H：眼睛开关、删除、双击行内编辑
**Files**
- Create: `app/components/admin/navigation/AdminInlineEditName.vue`
- Modify: `app/components/admin/navigation/AdminMenuTreeItem.vue`

**实现**
- 眼睛按钮：切换 `isVisible`，调用 `PATCH`
- 删除按钮：确认后二次请求 `DELETE`
- 双击标题进入编辑态：
  - Enter 保存
  - Esc 取消
  - blur 自动提交或恢复（统一一个策略）

---

### Task I：抽屉编辑
**Files**
- Create: `app/components/admin/navigation/AdminMenuEditDrawer.vue`
- Modify: `app/pages/admin/settings/navigation.vue`

**实现**
- 字段：
  - 名称 title
  - 链接类型（页面/自定义）
  - 页面选择（从 `/api/admin/pages` 拉列表）
  - 自定义链接 customUrl
  - target（`_self`/`_blank`）
- 点击编辑按钮打开抽屉
- 保存后刷新对应节点数据（避免整页重载）

---

## 五、前台渲染任务

### Task J：default 布局接入导航
**Files**
- Modify: `app/layouts/default.vue`

**实现**
- 在租户站点场景加载 `/api/store/navigation`
- 将菜单渲染进顶部导航
- `target='_blank'` 时补 `rel="noopener noreferrer"`

**验收**
- 页面链接项能正确跳 `/p/[slug]`
- 自定义链接可用
- 隐藏项不显示

---

## 六、测试与验收清单

### 手动测试
- 新增 3 个根菜单 + 2 个子菜单，刷新后结构保持
- 将子菜单拖到另一父节点下，刷新后结构保持
- 切换可见性后前台立即反映
- 双击改名成功并持久化
- 抽屉切换“页面链接 / 自定义链接”校验正常
- 删除含子节点菜单时返回预期提示
- A 租户无法操作 B 租户菜单

### 建议命令
- 启动：`bun run dev`
- migration：`bun run db:migrate`
- 如有 typecheck：`bun run typecheck`

---

## 七、实施顺序（建议）

1. 先完成 Task A~E（后端先可用）
2. 再完成 Task F（可看到树）
3. 再做 Task G（拖拽）
4. 再做 Task H/I（交互增强）
5. 最后做 Task J（前台接入）并执行手测

---

## 八、风险与应对

- 拖拽跨层数据错乱  
  - 统一在前端生成“扁平重排 payload”，由后端事务写入
- page 链接越租户引用  
  - `PATCH/POST` 时强制校验 `page.tenant_id=session.tenantId`
- 大菜单性能  
  - 首版接受；后续可做局部更新与虚拟列表

