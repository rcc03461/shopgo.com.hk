<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type Row = {
  id: string
  slug: string
  title: string
  status: string
  basePrice: string
  originalPrice: string | null
  updatedAt: string
  variantCount: number
  categoryCount: number
  categorySummary: string
}

type Category = {
  id: string
  name: string
}

type ProductStatus = 'active' | 'inactive'

const PRODUCT_STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'active', label: '啟用' },
  { value: 'inactive', label: '停用' },
]

const q = ref('')
const page = ref(1)
const pageSize = ref(20)
const status = ref<ProductStatus[]>([])
const categoryIds = ref<string[]>([])
const updatingStatusId = ref<string | null>(null)
const drawerOpen = ref(false)
const editingProductId = ref<string | null>(null)

/** SSR 時須沿用當前請求的 Cookie/Host，否則內部 /api/admin/* 會拿不到登入態或租戶 Host。 */
const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () =>
    [
      'admin-products',
      page.value,
      pageSize.value,
      status.value.join(',') || 'all-status',
      categoryIds.value.join(',') || 'all-categories',
      q.value.trim() || '-',
    ].join('-'),
  async () => {
    return await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
      statusCounts: Record<ProductStatus, number>
      categoryCounts: Record<string, number>
    }>('/api/admin/products', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        ...(status.value.length > 0 ? { status: status.value.join(',') } : {}),
        ...(categoryIds.value.length > 0
          ? { categoryId: categoryIds.value.join(',') }
          : {}),
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
      },
    })
  },
  { watch: [page, pageSize] },
)

const { data: categoriesData, pending: categoriesPending } = await useAsyncData(
  'admin-product-filter-categories',
  () =>
    requestFetch<{
      items: Category[]
      total: number
    }>('/api/admin/categories', {
      credentials: 'include',
      query: {
        page: 1,
        pageSize: 100,
      },
    }),
)

const { data: attachmentStats } = await useAsyncData(
  'admin-attachment-stats',
  () =>
    requestFetch<{ totalBytes: number; totalCount: number }>(
      '/api/admin/attachments/stats',
      { credentials: 'include' },
    ),
)

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatPrice(v: string) {
  return v
}

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
  const nextStatus: ProductStatus = enabled ? 'active' : 'inactive'
  if (row.status === nextStatus || updatingStatusId.value === row.id) return

  updatingStatusId.value = row.id
  try {
    await requestFetch(`/api/admin/products/${row.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: nextStatus },
    })
    row.status = nextStatus
  } catch (e) {
    console.error('[admin/products] toggle status failed', e)
  } finally {
    updatingStatusId.value = null
  }
}

const statusFilterOptions = computed(() =>
  PRODUCT_STATUS_OPTIONS.map((option) => ({
    ...option,
    count: data.value?.statusCounts?.[option.value] ?? 0,
  })),
)

const categoryFilterOptions = computed(() =>
  (categoriesData.value?.items ?? []).map((category) => ({
    value: category.id,
    label: category.name,
    count: data.value?.categoryCounts?.[category.id] ?? 0,
  })),
)

const drawerTitle = computed(() => (editingProductId.value ? '編輯商品' : '新增商品'))
const drawerSubtitle = computed(() =>
  editingProductId.value
    ? `商品 id：${editingProductId.value}`
    : '建立後會立即更新列表',
)

function openCreateDrawer() {
  editingProductId.value = null
  drawerOpen.value = true
}

function openEditDrawer(id: string) {
  editingProductId.value = id
  drawerOpen.value = true
}

async function onFormSaved(savedId: string) {
  editingProductId.value = savedId
  await refresh()
  drawerOpen.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">商品</h1>
        <p class="mt-1 text-sm text-neutral-600">
          以 id 編輯；前台網址仍使用 slug。
        </p>
      </div>
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        @click="openCreateDrawer"
      >
        新增商品
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

    <div class="mt-4 space-y-2">
      <AdminFilterRow
        v-model="status"
        label="狀態"
        :options="statusFilterOptions"
        :disabled="pending"
        @change="onFilterChange"
      />
      <AdminFilterRow
        v-model="categoryIds"
        label="分類"
        :options="categoryFilterOptions"
        :disabled="pending || categoriesPending"
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
            <th class="px-4 py-3">SKU 數</th>
            <th class="px-4 py-3">分類</th>
            <th class="px-4 py-3">基準價</th>
            <th class="px-4 py-3">原價</th>
            <th class="px-4 py-3">狀態</th>
            <th class="px-4 py-3">更新</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200">
          <tr v-if="pending">
            <td colspan="9" class="px-4 py-6 text-center text-neutral-500">
              載入中…
            </td>
          </tr>
          <tr v-else-if="!data?.items.length">
            <td colspan="9" class="px-4 py-6 text-center text-neutral-500">
              尚無商品
            </td>
          </tr>
          <tr
            v-for="row in data?.items ?? []"
            :key="row.id"
            class="hover:bg-neutral-50"
          >
            <td class="px-4 py-3 font-medium text-neutral-900">
              {{ row.title }}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-neutral-700">
              {{ row.slug }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ row.variantCount }}
            </td>
            <td
              class="max-w-[12rem] truncate px-4 py-3 text-xs text-neutral-700"
              :title="row.categorySummary"
            >
              {{ row.categorySummary }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ formatPrice(row.basePrice) }}
            </td>
            <td class="px-4 py-3 text-neutral-700">
              {{ row.originalPrice || '—' }}
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

    <p
      v-if="attachmentStats"
      class="mt-6 text-xs text-neutral-500"
    >
      租戶附件用量：{{ formatBytes(attachmentStats.totalBytes) }}（{{
        attachmentStats.totalCount
      }}
      個檔案，未刪除）
    </p>

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
      width-class="max-w-2xl"
    >
      <AdminProductUpsertForm
        :product-id="editingProductId"
        @saved="onFormSaved"
        @cancelled="drawerOpen = false"
      />
    </AdminEntityDrawer>
  </div>
</template>
