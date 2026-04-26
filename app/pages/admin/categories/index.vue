<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type Row = {
  id: string
  parentId: string | null
  parentName: string | null
  sortOrder: number
  slug: string
  name: string
  status: string
  updatedAt: string
}

type CategoryStatus = 'active' | 'hidden'
const CATEGORY_STATUS_OPTIONS: Array<{ value: CategoryStatus; label: string }> = [
  { value: 'active', label: '啟用' },
  { value: 'hidden', label: '停用' },
]

const q = ref('')
const page = ref(1)
const pageSize = ref(20)
const status = ref<CategoryStatus[]>([])
const updatingStatusId = ref<string | null>(null)
const drawerOpen = ref(false)
const editingCategoryId = ref<string | null>(null)

const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () =>
    `admin-categories-${page.value}-${pageSize.value}-${status.value.join(',') || 'all'}-${q.value.trim() || '-'}`,
  async () => {
    return await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
    }>('/api/admin/categories', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        ...(status.value.length > 0 ? { status: status.value.join(',') } : {}),
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
      },
    })
  },
  { watch: [page, pageSize] },
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void refresh()
  }, 300)
}

function onFilterChange() {
  page.value = 1
  void refresh()
}

async function toggleStatus(row: Row, enabled: boolean) {
  const nextStatus: CategoryStatus = enabled ? 'active' : 'hidden'
  if (row.status === nextStatus || updatingStatusId.value === row.id) return

  updatingStatusId.value = row.id
  try {
    await requestFetch(`/api/admin/categories/${row.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: nextStatus },
    })
    row.status = nextStatus
  } catch (e) {
    console.error('[admin/categories] toggle status failed', e)
  } finally {
    updatingStatusId.value = null
  }
}

const drawerTitle = computed(() => (editingCategoryId.value ? '編輯分類' : '新增分類'))
const drawerSubtitle = computed(() =>
  editingCategoryId.value
    ? `分類 id：${editingCategoryId.value}`
    : '建立後會立即更新列表',
)

function openCreateDrawer() {
  editingCategoryId.value = null
  drawerOpen.value = true
}

function openEditDrawer(id: string) {
  editingCategoryId.value = id
  drawerOpen.value = true
}

async function onFormSaved(savedId: string) {
  editingCategoryId.value = savedId
  await refresh()
  drawerOpen.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">分類</h1>
        <p class="mt-1 text-sm text-neutral-600">
          以 id 編輯；前台網址使用 slug；可選上層分類。
        </p>
      </div>
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        @click="openCreateDrawer"
      >
        新增分類
      </button>
    </div>

    <div class="mt-4 flex max-w-md gap-2">
      <input
        v-model="q"
        type="search"
        placeholder="搜尋名稱或網址代號…"
        class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
        @input="onSearchInput"
      />
    </div>

    <div class="mt-4">
      <AdminFilterRow
        v-model="status"
        label="狀態"
        :options="CATEGORY_STATUS_OPTIONS"
        :disabled="pending"
        @change="onFilterChange"
      />
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入列表，請確認已登入租戶後台。
    </p>

    <div
      v-else
      class="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <table class="min-w-full divide-y divide-neutral-200 text-sm">
        <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
          <tr>
            <th class="px-4 py-3">名稱</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">上層</th>
            <th class="px-4 py-3">排序</th>
            <th class="px-4 py-3">狀態</th>
            <th class="px-4 py-3">更新</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200">
          <tr v-if="pending">
            <td colspan="7" class="px-4 py-6 text-center text-neutral-500">
              載入中…
            </td>
          </tr>
          <tr v-else-if="!data?.items.length">
            <td colspan="7" class="px-4 py-6 text-center text-neutral-500">
              尚無分類
            </td>
          </tr>
          <tr
            v-for="row in data?.items ?? []"
            :key="row.id"
            class="hover:bg-neutral-50"
          >
            <td class="px-4 py-3 font-medium text-neutral-900">
              {{ row.name }}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-neutral-700">
              {{ row.slug }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ row.parentName ?? '—' }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ row.sortOrder }}
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <div class="flex items-center gap-3">
                <AdminStatusSwitch
                  :model-value="row.status === 'active'"
                  :disabled="updatingStatusId === row.id"
                  @update:model-value="(value) => void toggleStatus(row, value)"
                />
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-neutral-600">
              {{ formatTime(row.updatedAt) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                type="button"
                class="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                @click="openEditDrawer(row.id)"
              >
                編輯
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="data && data.total > data.pageSize"
      class="mt-4 flex items-center justify-between text-sm text-neutral-600"
    >
      <span>共 {{ data.total }} 筆</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page <= 1 || pending"
          @click="page--; refresh()"
        >
          上一頁
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page * pageSize >= data.total || pending"
          @click="page++; refresh()"
        >
          下一頁
        </button>
      </div>
    </div>

    <AdminEntityDrawer
      v-model:open="drawerOpen"
      :title="drawerTitle"
      :subtitle="drawerSubtitle"
      width-class="max-w-xl"
    >
      <AdminCategoryUpsertForm
        :category-id="editingCategoryId"
        @saved="onFormSaved"
        @cancelled="drawerOpen = false"
      />
    </AdminEntityDrawer>
  </div>
</template>
