<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))

type CatRow = {
  id: string
  name: string
  slug: string
}

type Detail = {
  category: {
    id: string
    parentId: string | null
    sortOrder: number
    slug: string
    name: string
    description: string | null
    status: string
    updatedAt: string
  }
  parent: { id: string; name: string; slug: string } | null
}

const requestFetch = useRequestFetch()

const { data, refresh, error } = await useAsyncData(
  () => `admin-category-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/categories/${id.value}`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
)

const { data: listData } = await useAsyncData(
  () => `admin-categories-options-${id.value}`,
  async () => {
    return await requestFetch<{ items: CatRow[] }>('/api/admin/categories', {
      credentials: 'include',
      query: { page: 1, pageSize: 500 },
    })
  },
  { watch: [id] },
)

const form = reactive({
  name: '',
  slug: '',
  description: '',
  parentId: '' as string,
  sortOrder: 0,
  status: 'active' as 'active' | 'hidden',
})

watch(
  () => data.value,
  (v) => {
    if (!v?.category) return
    form.name = v.category.name
    form.slug = v.category.slug
    form.description = v.category.description ?? ''
    form.parentId = v.category.parentId ?? ''
    form.sortOrder = v.category.sortOrder
    form.status = v.category.status === 'hidden' ? 'hidden' : 'active'
  },
  { immediate: true },
)

const parentOptions = computed(() =>
  (listData.value?.items ?? []).filter((c) => c.id !== id.value),
)

const saving = ref(false)
const saveErr = ref<string | null>(null)

async function save() {
  saving.value = true
  saveErr.value = null
  try {
    await $fetch(`/api/admin/categories/${id.value}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        parentId: form.parentId ? form.parentId : null,
        sortOrder: form.sortOrder,
        status: form.status,
      },
    })
    await refresh()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveErr.value = x?.data?.message || x?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}

const sortId = useId()
const parentId = useId()
const statusId = useId()
</script>

<template>
  <div class="max-w-xl">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">編輯分類</h1>
        <p class="mt-1 font-mono text-xs text-neutral-500">
          id：{{ id }}
        </p>
        <p
          v-if="data?.parent"
          class="mt-1 text-sm text-neutral-600"
        >
          目前上層：{{ data.parent.name }}（{{ data.parent.slug }}）
        </p>
      </div>
      <NuxtLink
        to="/admin/categories"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
      >
        返回列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入分類。
    </p>

    <form v-else class="mt-6 space-y-4" @submit.prevent="save">
      <p
        v-if="saveErr"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ saveErr }}
      </p>

      <AdminFormTextInput v-model="form.name" label="名稱" required />

      <AdminFormTextInput
        v-model="form.slug"
        label="網址代號（slug）"
        hint="小寫英數與連字號"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        title="小寫英數與連字號"
        required
        input-class="font-mono"
      />

      <AdminFormTextarea v-model="form.description" label="描述" :rows="4" />

      <AdminFormField label="上層分類" hint="留空表示頂層分類" :for-id="parentId">
        <select
          :id="parentId"
          v-model="form.parentId"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="">（無）</option>
          <option v-for="c in parentOptions" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </AdminFormField>

      <AdminFormField label="排序（數字愈小愈靠前）" :for-id="sortId">
        <input
          :id="sortId"
          v-model.number="form.sortOrder"
          type="number"
          min="0"
          step="1"
          class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
        />
      </AdminFormField>

      <AdminFormField label="狀態" :for-id="statusId">
        <select
          :id="statusId"
          v-model="form.status"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="active">顯示</option>
          <option value="hidden">隱藏</option>
        </select>
      </AdminFormField>

      <p
        v-if="data?.category?.updatedAt"
        class="text-xs text-neutral-500"
      >
        最後更新：{{ new Date(data.category.updatedAt).toLocaleString('zh-HK') }}
      </p>

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </form>
  </div>
</template>
