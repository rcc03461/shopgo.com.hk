<script setup lang="ts">
defineProps<{
  /** 表單區塊標題旁補充說明 */
  hint?: string
}>()

/** 與父層雙向綁定；使用 Vue 內建「checkbox + 陣列 v-model + :value」行為（點文字亦可切換） */
const selectedIds = defineModel<string[]>({ default: () => [] })

const requestFetch = useRequestFetch()

const { data: list, pending } = await useAsyncData(
  'admin-product-category-checkbox-options',
  () =>
    requestFetch<{
      items: Array<{ id: string; name: string; sortOrder: number }>
    }>('/api/admin/categories', {
      credentials: 'include',
      query: { page: 1, pageSize: 500 },
    }),
)

const options = computed(() => {
  const items = list.value?.items ?? []
  return [...items].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name, 'zh-HK'),
  )
})

</script>

<template>
  <AdminFormField
    label="分類（可多選）"
    :hint="hint ?? '可多選；順序依勾選先後（亦受列表排序影響）'"
  >
    <p v-if="pending" class="text-sm text-neutral-500">
      載入分類…
    </p>
    <div
      v-else-if="!options.length"
      class="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
    >
      尚無分類，請先到「分類」建立。
    </div>
    <ul
      v-else
      class="max-h-52 space-y-2 overflow-y-auto rounded-md border border-neutral-200 bg-white px-3 py-2"
    >
      <li v-for="c in options" :key="c.id">
        <label
          class="flex cursor-pointer items-start gap-2 text-sm text-neutral-800"
        >
          <input
            v-model="selectedIds"
            type="checkbox"
            class="mt-0.5 rounded border-neutral-300"
            :value="c.id"
          />
          <span>{{ c.name }}</span>
        </label>
      </li>
    </ul>
  </AdminFormField>
</template>
