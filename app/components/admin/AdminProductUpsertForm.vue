<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

type AttachmentDto = {
  id: string
  filename: string
  publicUrl: string | null
}

type Detail = {
  product: {
    id: string
    slug: string
    title: string
    description: string | null
    status: string
    basePrice: string
    originalPrice: string | null
    coverAttachmentId: string | null
    cover: AttachmentDto | null
    galleryAttachments: AttachmentDto[]
    categories: Array<{ id: string }>
  }
}

const props = defineProps<{
  productId?: string | null
}>()

const emit = defineEmits<{
  saved: [id: string]
  cancelled: []
}>()

const requestFetch = useRequestFetch()
const isEdit = computed(() => Boolean(props.productId))

const form = reactive({
  title: '',
  slug: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
  basePrice: '0',
  originalPrice: '',
})

const coverAttachmentId = ref<string | null>(null)
const galleryItems = ref<ProductMediaItem[]>([])
const categoryIds = ref<string[]>([])

const loading = ref(false)
const saving = ref(false)
const err = ref<string | null>(null)

function toMediaItem(a: AttachmentDto): ProductMediaItem {
  return {
    id: a.id,
    publicUrl: a.publicUrl,
    filename: a.filename,
  }
}

function resetForm() {
  form.title = ''
  form.slug = ''
  form.description = ''
  form.status = 'active'
  form.basePrice = '0'
  form.originalPrice = ''
  coverAttachmentId.value = null
  galleryItems.value = []
  categoryIds.value = []
}

async function loadDetail() {
  if (!props.productId) return
  const detail = await requestFetch<Detail>(`/api/admin/products/${props.productId}`, {
    credentials: 'include',
  })
  form.title = detail.product.title
  form.slug = detail.product.slug
  form.description = detail.product.description ?? ''
  form.status = detail.product.status === 'inactive' ? 'inactive' : 'active'
  form.basePrice = detail.product.basePrice
  form.originalPrice = detail.product.originalPrice ?? ''
  coverAttachmentId.value = detail.product.coverAttachmentId
  galleryItems.value = (detail.product.galleryAttachments ?? []).map(toMediaItem)
  categoryIds.value = (detail.product.categories ?? []).map((c) => c.id)
}

async function initForm() {
  loading.value = true
  err.value = null
  try {
    resetForm()
    await loadDetail()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.productId,
  () => {
    void initForm()
  },
  { immediate: true },
)

const coverPreview = computed<ProductMediaItem | null>(() => {
  const hit = galleryItems.value.find((item) => item.id === coverAttachmentId.value)
  return hit ?? null
})

async function submit() {
  saving.value = true
  err.value = null
  try {
    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      status: form.status,
      basePrice: form.basePrice,
      originalPrice: form.originalPrice || null,
      coverAttachmentId: coverAttachmentId.value,
      galleryAttachmentIds: galleryItems.value.map((g) => g.id),
      categoryIds: categoryIds.value,
    }

    if (props.productId) {
      await requestFetch(`/api/admin/products/${props.productId}`, {
        method: 'PATCH',
        credentials: 'include',
        body: payload,
      })
      emit('saved', props.productId)
      return
    }

    const res = await requestFetch<{ product: { id: string } }>('/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      body: payload,
    })
    emit('saved', res.product.id)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || (props.productId ? '儲存失敗' : '建立失敗')
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
      <AdminFormTextInput v-model="form.title" label="名稱" required />

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

      <AdminFormField label="狀態">
        <select
          v-model="form.status"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="active">上線</option>
          <option value="inactive">下線</option>
        </select>
      </AdminFormField>

      <AdminFormPriceInput
        v-model="form.basePrice"
        label="基準價（NUMERIC 字串）"
        required
      />

      <AdminFormPriceInput
        v-model="form.originalPrice"
        label="原價（僅展示，可留空）"
      />

      <AdminProductCategoryFields v-model="categoryIds" />

      <AdminProductMediaFields
        v-model:cover-attachment-id="coverAttachmentId"
        v-model:gallery-items="galleryItems"
        :cover-preview="coverPreview"
      />

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
