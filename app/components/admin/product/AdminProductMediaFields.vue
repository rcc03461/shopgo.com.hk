<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

const coverAttachmentId = defineModel<string | null>('coverAttachmentId', {
  default: null,
})

const galleryItems = defineModel<ProductMediaItem[]>('galleryItems', {
  default: () => [],
})

const props = defineProps<{
  /** 封面若不在圖庫列表時，用於顯示預覽 */
  coverPreview?: ProductMediaItem | null
}>()

const newUrl = ref('')
const adding = ref(false)
const localErr = ref<string | null>(null)

async function addFromUrl() {
  const url = newUrl.value.trim()
  if (!url) {
    localErr.value = '請輸入 URL'
    return
  }
  adding.value = true
  localErr.value = null
  try {
    const res = await $fetch<{
      attachment: {
        id: string
        publicUrl: string | null
        filename: string
      }
    }>('/api/admin/attachments', {
      method: 'POST',
      credentials: 'include',
      body: {
        type: 'image',
        mimetype: 'application/octet-stream',
        filename: url.slice(0, 200),
        extension: 'url',
        size: 0,
        publicUrl: url,
      },
    })
    galleryItems.value = [
      ...galleryItems.value,
      {
        id: res.attachment.id,
        publicUrl: res.attachment.publicUrl,
        filename: res.attachment.filename,
      },
    ]
    newUrl.value = ''
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    localErr.value = x?.data?.message || x?.message || '新增失敗'
  } finally {
    adding.value = false
  }
}

function removeGallery(id: string) {
  galleryItems.value = galleryItems.value.filter((x) => x.id !== id)
  if (coverAttachmentId.value === id) {
    coverAttachmentId.value = null
  }
}

function setCover(id: string) {
  coverAttachmentId.value = id
}
</script>

<template>
  <div class="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
    <div>
      <h3 class="text-sm font-semibold text-neutral-900">商品圖片</h3>
      <p class="mt-0.5 text-xs text-neutral-500">
        封面與圖庫皆為附件關聯；可先以公開 URL 建立附件（之後可改為上傳檔）。
      </p>
    </div>

    <p
      v-if="localErr"
      class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      {{ localErr }}
    </p>

    <AdminFormField label="從網址新增到圖庫" hint="送出後會建立一筆附件並加入圖庫（非同步上傳檔案）">
      <div class="flex flex-wrap gap-2">
        <input
          v-model="newUrl"
          type="url"
          placeholder="https://…"
          class="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs shadow-sm"
          @keydown.enter.prevent="addFromUrl"
        />
        <button
          type="button"
          class="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="adding"
          @click="addFromUrl"
        >
          {{ adding ? '新增中…' : '新增' }}
        </button>
      </div>
    </AdminFormField>

    <div v-if="coverAttachmentId" class="rounded-md border border-neutral-200 bg-white p-3">
      <p class="text-xs font-medium text-neutral-500">封面</p>
      <p class="mt-1 font-mono text-xs text-neutral-800">
        {{ coverAttachmentId }}
      </p>
      <p
        v-if="
          (props.coverPreview?.id === coverAttachmentId &&
            props.coverPreview?.publicUrl) ||
          galleryItems.find((g) => g.id === coverAttachmentId)?.publicUrl
        "
        class="mt-1 truncate text-xs text-neutral-600"
      >
        {{
          props.coverPreview?.id === coverAttachmentId
            ? props.coverPreview?.publicUrl
            : galleryItems.find((g) => g.id === coverAttachmentId)?.publicUrl
        }}
      </p>
      <button
        type="button"
        class="mt-2 text-xs text-red-600 hover:underline"
        @click="coverAttachmentId = null"
      >
        清除封面
      </button>
    </div>
    <p v-else class="text-xs text-neutral-500">尚未設定封面（可從下方圖庫選一筆設為封面）。</p>

    <div v-if="galleryItems.length" class="space-y-2">
      <p class="text-xs font-medium text-neutral-600">圖庫</p>
      <ul class="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
        <li
          v-for="g in galleryItems"
          :key="g.id"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate font-mono text-neutral-800">{{ g.id }}</p>
            <p v-if="g.publicUrl" class="truncate text-neutral-500">{{ g.publicUrl }}</p>
          </div>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="text-neutral-800 hover:underline"
              @click="setCover(g.id)"
            >
              設為封面
            </button>
            <button
              type="button"
              class="text-red-600 hover:underline"
              @click="removeGallery(g.id)"
            >
              移除
            </button>
          </div>
        </li>
      </ul>
    </div>
    <p v-else class="text-xs text-neutral-500">圖庫為空。</p>
  </div>
</template>
