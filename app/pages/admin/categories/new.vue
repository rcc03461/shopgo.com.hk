<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type CatRow = {
  id: string
  name: string
  slug: string
}

const requestFetch = useRequestFetch()

const { data: listData } = await useAsyncData('admin-categories-parent-options', () =>
  requestFetch<{ items: CatRow[] }>('/api/admin/categories', {
    credentials: 'include',
    query: { page: 1, pageSize: 500 },
  }),
)

const form = reactive({
  name: '',
  slug: '',
  description: '',
  parentId: '' as string,
  sortOrder: 0,
  status: 'active' as 'active' | 'hidden',
})

const saving = ref(false)
const err = ref<string | null>(null)

const parentOptions = computed(() => listData.value?.items ?? [])

async function submit() {
  saving.value = true
  err.value = null
  try {
    const res = await $fetch<{ category: { id: string } }>('/api/admin/categories', {
      method: 'POST',
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
    await navigateTo(`/admin/categories/${res.category.id}`)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '建立失敗'
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
    <h1 class="text-xl font-semibold tracking-tight">新增分類</h1>
    <p class="mt-1 text-sm text-neutral-600">
      建立後將導向以 id 編輯；前台仍使用 slug。
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <p v-if="err" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ err }}
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

      <AdminFormField
        label="排序（數字愈小愈靠前）"
        :for-id="sortId"
      >
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

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? '建立中…' : '建立' }}
        </button>
        <NuxtLink
          to="/admin/categories"
          class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
        >
          返回列表
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
