<script setup lang="ts">
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
}

const props = defineProps<{
  categoryId?: string | null
}>()

const emit = defineEmits<{
  saved: [id: string]
  cancelled: []
}>()

const requestFetch = useRequestFetch()
const isEdit = computed(() => Boolean(props.categoryId))

const form = reactive({
  name: '',
  slug: '',
  description: '',
  parentId: '' as string,
  sortOrder: 0,
  status: 'active' as 'active' | 'hidden',
})

const parentOptions = ref<CatRow[]>([])
const loading = ref(false)
const saving = ref(false)
const err = ref<string | null>(null)

const sortId = useId()
const parentId = useId()
const statusId = useId()

function resetForm() {
  form.name = ''
  form.slug = ''
  form.description = ''
  form.parentId = ''
  form.sortOrder = 0
  form.status = 'active'
}

async function loadParentOptions() {
  const listData = await requestFetch<{ items: CatRow[] }>('/api/admin/categories', {
    credentials: 'include',
    query: { page: 1, pageSize: 500 },
  })
  const all = listData.items ?? []
  parentOptions.value = props.categoryId ? all.filter((c) => c.id !== props.categoryId) : all
}

async function loadDetail() {
  if (!props.categoryId) return
  const detail = await requestFetch<Detail>(`/api/admin/categories/${props.categoryId}`, {
    credentials: 'include',
  })
  form.name = detail.category.name
  form.slug = detail.category.slug
  form.description = detail.category.description ?? ''
  form.parentId = detail.category.parentId ?? ''
  form.sortOrder = detail.category.sortOrder
  form.status = detail.category.status === 'hidden' ? 'hidden' : 'active'
}

async function initForm() {
  loading.value = true
  err.value = null
  try {
    resetForm()
    await loadParentOptions()
    await loadDetail()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.categoryId,
  () => {
    void initForm()
  },
  { immediate: true },
)

async function submit() {
  saving.value = true
  err.value = null
  try {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      parentId: form.parentId ? form.parentId : null,
      sortOrder: form.sortOrder,
      status: form.status,
    }
    if (props.categoryId) {
      await requestFetch(`/api/admin/categories/${props.categoryId}`, {
        method: 'PATCH',
        credentials: 'include',
        body: payload,
      })
      emit('saved', props.categoryId)
      return
    }

    const res = await requestFetch<{ category: { id: string } }>('/api/admin/categories', {
      method: 'POST',
      credentials: 'include',
      body: payload,
    })
    emit('saved', res.category.id)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || (props.categoryId ? '儲存失敗' : '建立失敗')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <p v-if="err" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ err }}
    </p>

    <p v-if="loading" class="text-sm text-neutral-500">
      載入中…
    </p>

    <template v-else>
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

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? (isEdit ? '儲存中…' : '建立中…') : (isEdit ? '儲存' : '建立') }}
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
          :disabled="saving"
          @click="emit('cancelled')"
        >
          取消
        </button>
      </div>
    </template>
  </form>
</template>
